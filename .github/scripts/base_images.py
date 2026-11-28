#!/usr/bin/env python3
"""从 Dockerfile 的 FROM 指令派生 Trivy 镜像扫描矩阵。

Dockerfile 的 FROM 行是基础镜像唯一的事实来源：Security Scan 的 trivy-image
矩阵在 CI 里由本脚本实时解析，不再在 workflow 里手写镜像列表，避免两处漂移。

解析规则：
- 只认 FROM 指令，忽略注释、COPY --from、``# syntax=`` 等其它镜像引用；
- 支持 ``--platform=...`` 等前置 flag 与 ``AS <stage>`` 别名；
- 支持同文件内 ``ARG NAME=value`` 的默认值展开（``${NAME}`` / ``$NAME`` /
  ``${NAME:-default}``）；无法解析时直接报错，避免扫错镜像；
- 跳过 ``scratch`` 与引用已声明 stage 别名的 FROM；
- 同一镜像引用（含 digest）只保留一条。

用法：
    python3 .github/scripts/base_images.py                  # 人类可读列表
    python3 .github/scripts/base_images.py --json           # {"include": [...]}
    python3 .github/scripts/base_images.py --github-output  # matrix=<json>

``--github-output`` 输出一行 ``matrix=<json>``，配合
``>> "$GITHUB_OUTPUT"`` 即可供 workflow 的 ``fromJSON`` 使用。
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Iterable

# 仓库内需要纳入扫描的 Dockerfile；路径相对仓库根，脚本可从任意目录运行。
DEFAULT_DOCKERFILES: tuple[str, ...] = (
    "docker/backend.Dockerfile",
    "docker/web.Dockerfile",
)

_REPO_ROOT = Path(__file__).resolve().parents[2]

_FROM_RE = re.compile(r"^FROM\s+(?P<rest>.+)$", re.IGNORECASE)
_ARG_RE = re.compile(
    r"^ARG\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)(?:=(?P<value>.*))?$",
    re.IGNORECASE,
)
_VAR_RE = re.compile(
    r"\$(?:\{(?P<braced>[A-Za-z_][A-Za-z0-9_]*)(?::-(?P<default>[^}]*))?\}"
    r"|(?P<plain>[A-Za-z_][A-Za-z0-9_]*))"
)


class DeriveError(ValueError):
    """Dockerfile 无法解析出可信的镜像引用。"""


def _logical_lines(text: str) -> Iterable[str]:
    """把以反斜杠续行的物理行合并为逻辑行。

    注释行不参与续行（Docker 会先丢弃注释），否则以反斜杠结尾的注释会
    吞掉后面的 FROM。
    """
    buffer = ""
    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if not buffer and line.lstrip().startswith("#"):
            yield line
            continue
        if line.endswith("\\"):
            buffer += line[:-1] + " "
            continue
        buffer += line
        yield buffer
        buffer = ""
    if buffer:
        yield buffer


def _strip_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        return value[1:-1]
    return value


def _expand_variables(
    value: str,
    args: dict[str, str | None],
    *,
    source: str,
    line_number: int,
) -> str:
    """按同文件内 ARG 默认值展开变量，无法解析时报错。"""

    def resolve(match: re.Match[str]) -> str:
        name = match.group("braced") or match.group("plain")
        default = match.group("default")
        resolved = args.get(name)
        if resolved is not None:
            return resolved
        if default is not None:
            return default
        raise DeriveError(
            f"{source} 第 {line_number} 行的变量 ${{{name}}} 无法解析："
            "请在 FROM 之前提供带默认值的 ARG"
        )

    return _VAR_RE.sub(resolve, value)


def _parse_from(rest: str, *, source: str, line_number: int) -> tuple[str, str | None]:
    """从 FROM 指令尾部取出镜像引用与 stage 别名。"""
    tokens = rest.split()
    index = 0
    while index < len(tokens) and tokens[index].startswith("--"):
        index += 1
    if index >= len(tokens):
        raise DeriveError(f"{source} 第 {line_number} 行的 FROM 缺少镜像引用")
    image = tokens[index]
    alias: str | None = None
    if len(tokens) >= index + 3 and tokens[index + 1].lower() == "as":
        alias = tokens[index + 2]
    return image, alias


def _split_image(reference: str) -> tuple[str, str, str]:
    """拆出 name / tag / digest，正确处理带端口或路径的 registry。"""
    name_and_tag, _, digest = reference.partition("@")
    last_slash = name_and_tag.rfind("/")
    last_colon = name_and_tag.rfind(":")
    if last_colon > last_slash:
        return name_and_tag[:last_colon], name_and_tag[last_colon + 1 :], digest
    return name_and_tag, "", digest


def _display_name(reference: str) -> str:
    """去掉 digest 后的镜像标识，用作稳定的 job 名称。"""
    name, tag, _ = _split_image(reference)
    return f"{name}:{tag}" if tag else name


def _normalize(path: str | Path) -> tuple[Path, str]:
    """返回绝对路径与用于展示的相对路径。"""
    resolved = Path(path)
    if not resolved.is_absolute():
        resolved = _REPO_ROOT / resolved
    try:
        label = os.path.relpath(resolved, _REPO_ROOT)
    except ValueError:  # 跨盘符等无法求相对路径的情况
        label = str(resolved)
    return resolved, label


def derive(dockerfiles: Iterable[str | Path]) -> list[dict[str, str]]:
    """解析 Dockerfile 列表，返回 GitHub Actions matrix 的 include 条目。"""
    entries: list[dict[str, str]] = []
    seen: set[str] = set()

    for dockerfile in dockerfiles:
        path, label = _normalize(dockerfile)
        try:
            text = path.read_text(encoding="utf-8")
        except OSError as exc:
            raise DeriveError(f"无法读取 {label}：{exc}") from exc

        args: dict[str, str | None] = {}
        stages: set[str] = set()

        for line_number, line in enumerate(_logical_lines(text), start=1):
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue

            arg_match = _ARG_RE.match(stripped)
            if arg_match:
                raw_value = arg_match.group("value")
                args[arg_match.group("name")] = (
                    None if raw_value is None else _strip_quotes(raw_value.strip())
                )
                continue

            from_match = _FROM_RE.match(stripped)
            if not from_match:
                continue

            image, alias = _parse_from(
                from_match.group("rest"), source=label, line_number=line_number
            )
            image = _expand_variables(
                image, args, source=label, line_number=line_number
            )

            # FROM <stage> 引用的是同一文件里已声明的构建阶段，不是可扫描镜像。
            if image.lower() in stages:
                if alias:
                    stages.add(alias.lower())
                continue
            if alias:
                stages.add(alias.lower())
            if image.lower() == "scratch":
                continue
            if image in seen:
                continue

            seen.add(image)
            entries.append(
                {"name": _display_name(image), "image": image, "source": label}
            )

    if not entries:
        raise DeriveError("未从 Dockerfile 中解析到任何 FROM 镜像")

    used_names: dict[str, int] = {}
    for entry in entries:
        base = entry["name"]
        used_names[base] = used_names.get(base, 0) + 1
        if used_names[base] > 1:
            entry["name"] = f"{base}#{used_names[base]}"

    return entries


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="从 Dockerfile 的 FROM 派生镜像矩阵")
    parser.add_argument(
        "dockerfiles",
        nargs="*",
        help=f"待解析的 Dockerfile（默认：{' '.join(DEFAULT_DOCKERFILES)}）",
    )
    output = parser.add_mutually_exclusive_group()
    output.add_argument("--json", action="store_true", help="输出 JSON 矩阵")
    output.add_argument(
        "--github-output",
        action="store_true",
        help="输出一行 matrix=<json>，供追加到 GITHUB_OUTPUT",
    )
    parsed = parser.parse_args(argv)

    targets = parsed.dockerfiles or list(DEFAULT_DOCKERFILES)
    try:
        entries = derive(targets)
    except DeriveError as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 2

    payload = {"include": entries}
    if parsed.github_output:
        print(
            "matrix="
            + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        )
    elif parsed.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        for entry in entries:
            print(f"{entry['name']}\t{entry['image']}\t{entry['source']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

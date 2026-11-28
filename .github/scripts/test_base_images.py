"""``base_images.py`` 的单元测试（纯标准库，CI 与本地同一命令运行）。"""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import base_images  # noqa: E402  （需要先把脚本目录放进 sys.path）


class DeriveTests(unittest.TestCase):
    def derive_text(self, content: str) -> list[dict[str, str]]:
        with tempfile.TemporaryDirectory() as tmp_dir:
            dockerfile = Path(tmp_dir, "Dockerfile")
            dockerfile.write_text(content, encoding="utf-8")
            return base_images.derive([dockerfile])

    def test_expands_arg_and_dedupes_stages(self) -> None:
        entries = self.derive_text(
            "ARG PYTHON_VERSION=3.12\n"
            "FROM python:${PYTHON_VERSION}-slim-bookworm AS builder\n"
            "RUN echo build\n"
            "FROM python:${PYTHON_VERSION}-slim-bookworm AS runtime\n"
        )

        self.assertEqual(
            [entry["image"] for entry in entries],
            ["python:3.12-slim-bookworm"],
        )
        self.assertEqual(entries[0]["name"], "python:3.12-slim-bookworm")

    def test_keeps_digest_but_uses_tag_for_job_name(self) -> None:
        digest = "a" * 64
        entries = self.derive_text(f"FROM nginx:1.30-alpine@sha256:{digest}\n")

        self.assertEqual(entries[0]["image"], f"nginx:1.30-alpine@sha256:{digest}")
        self.assertEqual(entries[0]["name"], "nginx:1.30-alpine")

    def test_skips_platform_flag_and_stage_alias(self) -> None:
        entries = self.derive_text(
            "FROM --platform=linux/amd64 golang:1.24 AS build\n"
            "FROM build AS final\n"
        )

        self.assertEqual([entry["image"] for entry in entries], ["golang:1.24"])

    def test_skips_scratch_and_comments(self) -> None:
        entries = self.derive_text(
            "# FROM ignored:1.0\n"
            "FROM alpine:3.21\n"
            "FROM scratch AS empty\n"
        )

        self.assertEqual([entry["image"] for entry in entries], ["alpine:3.21"])

    def test_comment_ending_with_backslash_does_not_swallow_from(self) -> None:
        entries = self.derive_text(
            "# 注释以反斜杠结尾 \\\n"
            "FROM alpine:3.21 AS base\n"
        )

        self.assertEqual([entry["image"] for entry in entries], ["alpine:3.21"])

    def test_supports_default_value_syntax(self) -> None:
        entries = self.derive_text("FROM ${REGISTRY:-docker.io}/alpine:3.21\n")

        self.assertEqual(entries[0]["image"], "docker.io/alpine:3.21")

    def test_handles_registry_with_port(self) -> None:
        entries = self.derive_text("FROM registry.example.com:5000/team/app:1.2.3\n")

        self.assertEqual(entries[0]["name"], "registry.example.com:5000/team/app:1.2.3")

    def test_unresolved_variable_fails_loudly(self) -> None:
        with self.assertRaises(base_images.DeriveError):
            self.derive_text("FROM python:${PYTHON_VERSION}-slim-bookworm\n")

    def test_empty_dockerfile_fails_loudly(self) -> None:
        with self.assertRaises(base_images.DeriveError):
            self.derive_text("# 只有注释\n")

    def test_repo_dockerfiles_derive_without_unresolved_variables(self) -> None:
        entries = base_images.derive(base_images.DEFAULT_DOCKERFILES)

        self.assertGreaterEqual(len(entries), 2)
        for entry in entries:
            self.assertNotIn("$", entry["image"])
        sources = {entry["source"] for entry in entries}
        self.assertIn("docker/backend.Dockerfile", sources)
        self.assertIn("docker/web.Dockerfile", sources)


if __name__ == "__main__":
    unittest.main()

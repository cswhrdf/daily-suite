# ==========================================================
# Caddy 内网证书入口镜像（DNS-01 需要 Cloudflare provider 插件）
#
# 为什么需要自建：
#   官方 caddy:2-alpine 镜像只包含标准模块，不含任何第三方 DNS provider，
#   直接使用会在加载 Caddyfile 时报
#   “module not registered: dns.providers.cloudflare”，容器反复重启。
#
# 做法：
#   用官方 builder 镜像（内置 xcaddy + Go）编译出带
#   github.com/caddy-dns/cloudflare 的 caddy 二进制，再覆盖到运行时镜像，
#   运行时镜像仍为官方 caddy:2-alpine（保留其默认 entrypoint）。
#
# 非 root：编译产物由 COPY 带进来后属主是 root，且 /data、/config 也是 root 所有，
#   直接 USER 1001 会因无权绑定 443 与写证书目录而失败。因此运行时追加两步：
#     1) setcap cap_net_bind_service=+ep /usr/bin/caddy —— 给二进制文件能力，
#        非 root 进程也能绑定 443（容器内 ip_unprivileged_port_start 也可能为 0，
#        但显式 setcap 让镜像不依赖宿主 sysctl）；
#     2) chown -R 1001:1001 /data /config —— 证书与配置目录需可写。
#   随后 USER 1001:1001，进程不再以 root 运行。
#
# 构建期需要访问 Go module proxy 拉取插件源码；构建完成后运行期不联网依赖。
# 如需内网代理，构建时传参：--build-arg GOPROXY=https://<your-proxy>,direct
# ==========================================================
FROM caddy:2.11.9-builder AS builder
ARG GOPROXY=https://proxy.golang.org,direct
ENV GOPROXY=${GOPROXY}
RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:2-alpine AS runtime
COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# 非 root 运行：文件能力允许非特权进程绑定 443，数据/配置目录交给同一 UID 写入。
RUN setcap cap_net_bind_service=+ep /usr/bin/caddy \
    && chown -R 1001:1001 /data /config

USER 1001:1001

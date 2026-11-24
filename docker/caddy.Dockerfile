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
#   运行时镜像仍为官方 caddy:2-alpine（保留其默认 entrypoint / 非 root 结构）。
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

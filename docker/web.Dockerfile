# syntax=docker/dockerfile:1
# =============================================================================
# daily-suite 用户级前端镜像（apps/web：Vue 3 + Vite 构建产物打进 nginx）
#
# 设计策略：
#   - 多阶段：builder 用 pnpm workspace 按根 pnpm-lock.yaml 安装并构建 apps/web 的
#     dist；nginx stage 只保留静态产物与 nginx 配置，不含 Node/pnpm/源码。
#   - 版本一致性：Node 版本取根 package.json engines（>=26），pnpm 取根 packageManager
#     锁定版本；安装用 --frozen-lockfile，锁文件漂移时构建失败。
#   - workspace 布局：锁文件与 workspace 清单在仓库根，必须按相同相对路径拷入，
#     否则 --frozen-lockfile 找不到对应 importer。
#   - 非 root：容器网络命名空间内 ip_unprivileged_port_start=0，非特权用户即可
#     绑定 80，因此 master 与 worker 进程统一以 nginx 用户运行（镜像末尾 USER nginx）。
#     为此把官方 nginx.conf 的 pid 路径改到 /tmp，并把缓存目录与站点目录 chown 给
#     nginx；无需 CAP_NET_BIND_SERVICE，也不必改用 8080 端口。
#   - digest：基础镜像固定到具体版本 tag；TODO(上线前) 换成 tag@sha256:<digest>。
# =============================================================================

ARG NODE_VERSION=26

# ---------- Stage 1：builder ----------
FROM node:${NODE_VERSION}-alpine AS builder

# Node 25+ 官方镜像不再内置 corepack，直接全局安装 package.json 锁定的 pnpm 版本。
ARG PNPM_VERSION=12.21.0
RUN npm install --global pnpm@${PNPM_VERSION}

WORKDIR /app

ENV CI=true

# 先拷 workspace 根清单 + 目标成员清单，依赖未变时复用安装层。
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/web/.npmrc apps/web/.npmrc
RUN pnpm install --frozen-lockfile --filter @daily-suite/web

# 源码单独一层，避免改一行代码就重装依赖。
COPY apps/web/ apps/web/
# vue-tsc --noEmit && vite build
RUN pnpm --filter @daily-suite/web run build

# ---------- Stage 2：nginx ----------
FROM nginx:1.30-alpine AS nginx

# 用项目配置覆盖官方默认站点：/ 托管 dist、/api/ 与 /healthz 反代 backend。
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# 与 backend 共享的 MEDIA_ROOT 挂载点（nginx.conf 内 /protected-media/ 的 alias）。
# 作为只读卷挂载时无需写权限；此处建目录只是保证镜像自身路径完整。
RUN mkdir -p /srv/media && chown -R nginx:nginx /srv/media

# 非 root 运行改造（配合末尾的 USER nginx）：
#   - 官方 nginx.conf 的 "pid /run/nginx.pid" 指向 root 独占的 /run，nginx 用户无法
#     写，改到 /tmp/nginx.pid；
#   - /var/cache/nginx 会被 nginx 写入（含运行时生成的 client_temp 等子目录），必须
#     由 nginx 用户可写；
#   - 站点目录归 nginx，静态文件读取路径一致；
#   - conf.d/default.conf 归 nginx 后可消除官方 entrypoint 脚本改写失败时的 info 噪音。
RUN sed -i 's#^pid .*/run/nginx.pid;#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf \
    && chown -R nginx:nginx /var/cache/nginx /usr/share/nginx/html /srv/media \
    && chown nginx:nginx /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD ["wget", "-q", "--spider", "http://127.0.0.1/"]

# 容器内 ip_unprivileged_port_start=0，nginx 用户可直接绑定 80，不需 capabilities。
USER nginx

CMD ["nginx", "-g", "daemon off;"]

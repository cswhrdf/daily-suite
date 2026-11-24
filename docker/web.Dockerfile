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
#   - 非 root：nginx master 需要绑定 80 端口故保留 root；worker 进程默认以 nginx
#     用户运行。如需彻底非 root，可改用 nginxinc/nginx-unprivileged 并把监听端口
#     与编排映射一起改为 8080（收紧入口时一并评估）。
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
FROM nginx:1.29-alpine AS nginx

# 用项目配置覆盖官方默认站点：/ 托管 dist、/api/ 与 /healthz 反代 backend。
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# 与 backend 共享的 MEDIA_ROOT 挂载点（nginx.conf 内 /protected-media/ 的 alias）。
# 作为只读卷挂载时无需写权限；此处建目录只是保证镜像自身路径完整。
RUN mkdir -p /srv/media && chown -R nginx:nginx /srv/media

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD ["wget", "-q", "--spider", "http://127.0.0.1/"]

CMD ["nginx", "-g", "daemon off;"]

-- ==========================================================
-- PostgreSQL 初始化脚本（仅在数据卷首次初始化时执行）
-- 挂载点：/docker-entrypoint-initdb.d/01_extensions.sql
-- 说明：重启容器不会重复执行；如需重跑请先删除 pgdata 卷。
-- ==========================================================

-- 中文/模糊检索基础：三元组相似度索引，供笔记与便签的 ILIKE / similarity 查询使用
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 可选：生成 GIN 索引的示例（待业务模型落地后在 migration 中创建，此处仅作参考）
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_note_title_trgm
--     ON note_note USING gin (title gin_trgm_ops);

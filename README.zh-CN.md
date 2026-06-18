# Bio Project Management

[English](README.md) | 中文说明

Bio Project Management 是一个面向生物有机菌肥企业的模块化项目管理、知识库、CRM、表单、通知与报表系统。首个版本优先支持单公司内部使用、账号密码登录、角色权限、项目任务协作、本地附件保存，以及多种部署方式。

## 项目特点

- 使用 Vue 3、Element Plus、Vite 构建类似 Slack 的工作台界面。
- 支持账号密码登录、JWT 鉴权、用户资料、头像、语言偏好、角色权限和用户单独权限。
- 后台管理包含用户、角色、权限、翻译词典、标签和表单管理。
- 项目管理支持负责人、参与人、批注、备注、审批、项目任务关联、任务进度自动计算项目总进度，以及站内提及通知。
- 任务管理支持我的任务、全部任务、项目同步、状态更新、进度记录和二次确认删除。
- 站内通知与通信支持未读数量、已读状态、`@成员`、`@all`、按对话持续聊天，以及 `Ctrl + Enter` 快速回复。
- 知识库支持树状文件夹分类、标签、权限、富文本编辑、Markdown 自动互转、图片和附件上传。
- 动态表单模块支持设计可复用表单，字段可选择显示在报表或仪表盘，并可被其他模块调用。
- CRM 使用首个内置 CRM 表单驱动，可新增、编辑、查看客户详情，并指定跟踪人员。
- 全站搜索覆盖项目、任务、知识库和 CRM 客户。
- 生产架构使用 PostgreSQL 和 Redis，同时提供 SQL.js 独立调试模式，便于直接在服务器上运行。

## 项目架构

```text
前端：Vue 3 + Element Plus + Vite
  - 路由：/dashboard、/project、/task、/knowledge、/crm、/report、/admin
  - 工作台外壳、看板/列表、表单、图表、双语词典、全站搜索

后端：Node.js + NestJS REST API
  - 模块：Auth、User、Role、Translation、Project、Task、Notification、
          Communication、Knowledge、Form、CRM、Report、Search
  - 服务：权限校验、@ 提及解析、通知分发、文件上传、可扩展定时任务模型

数据层：
  - PostgreSQL：用户、角色、项目、任务、知识库、CRM、表单、报表等持久化数据
  - Redis：缓存、会话、队列和锁的预留服务层
  - SQL.js：本地独立调试数据库
  - 本地文件系统：图片、附件和上传文件
```

## 目录结构

```text
backend/              NestJS 后端 API
frontend/             Vue 3 前端工作台和 nginx 配置
infra/postgres/       PostgreSQL 初始化文件
scripts/              Windows 独立启动/停止脚本
docs/                 架构和部署补充文档
docker-compose.yml    PostgreSQL、Redis、后端和前端编排
```

## 快速启动

```powershell
npm.cmd install
npm.cmd run dev
```

默认访问地址：

- 前端：`http://localhost:5173`
- 后端 API：`http://localhost:3000/api`

默认首个管理员：

- 邮箱：`admin@bio.local`
- 密码：`Admin123456`

生产环境请务必修改 `JWT_SECRET` 和默认管理员密码。

## 服务器部署

该方式不依赖 Docker，适合服务器直接调试、演示或小规模内部部署。

### 方式 A：独立调试模式

独立模式使用 SQL.js 和本地文件，不需要 PostgreSQL 与 Redis。

```powershell
Copy-Item .env.standalone.example .env.standalone
powershell -ExecutionPolicy Bypass -File .\scripts\start-standalone.ps1
```

启动后访问 `http://127.0.0.1:5173/`。

停止服务：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-standalone.ps1
```

独立模式数据位置：

- 数据库：`data/standalone.sqlite`
- 上传文件：`uploads/`
- 日志：`logs/`

### 方式 B：服务器服务模式

适合已经在服务器安装 PostgreSQL 和 Redis 的部署方式。

1. 安装 Node.js 22 LTS 或更新版本、PostgreSQL 16+、Redis 7+ 和 npm。
2. 创建数据库和用户：

   ```sql
   CREATE DATABASE bio_pm;
   CREATE USER bio_pm WITH PASSWORD 'replace_with_a_strong_password';
   GRANT ALL PRIVILEGES ON DATABASE bio_pm TO bio_pm;
   ```

3. 复制并修改环境变量：

   ```powershell
   Copy-Item .env.example .env
   ```

4. 安装依赖并构建：

   ```powershell
   npm.cmd install
   npm.cmd run build
   ```

5. 启动后端：

   ```powershell
   npm.cmd --workspace backend run start
   ```

6. 使用 nginx、Caddy、IIS 或其他静态服务器托管 `frontend/dist`，并将 `/api` 代理到 `http://127.0.0.1:3000/api`。

生产建议：

- 使用强 `JWT_SECRET`。
- 为 PostgreSQL 和 Redis 设置强密码。
- 定期备份 PostgreSQL 和上传目录。
- 前端入口启用 HTTPS。
- 上传文件使用持久化磁盘或对象存储。

## Docker 部署

### Docker 直接部署

适合不使用 Docker Compose、手动运行每个容器的场景。

创建网络：

```bash
docker network create bio-pm-net
```

启动 PostgreSQL：

```bash
docker run -d --name bio-pm-postgres --network bio-pm-net \
  -e POSTGRES_DB=bio_pm \
  -e POSTGRES_USER=bio_pm \
  -e POSTGRES_PASSWORD=bio_pm_password \
  -v bio_pm_postgres:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:16-alpine
```

启动 Redis：

```bash
docker run -d --name bio-pm-redis --network bio-pm-net \
  -p 6379:6379 \
  redis:7-alpine
```

构建并启动后端：

```bash
docker build -t bio-pm-backend ./backend
docker run -d --name bio-pm-backend --network bio-pm-net \
  --env-file .env \
  -e DATABASE_HOST=bio-pm-postgres \
  -e DATABASE_PORT=5432 \
  -e DATABASE_USER=bio_pm \
  -e DATABASE_PASSWORD=bio_pm_password \
  -e DATABASE_NAME=bio_pm \
  -e REDIS_HOST=bio-pm-redis \
  -e REDIS_PORT=6379 \
  -v bio_pm_uploads:/app/uploads \
  -p 3000:3000 \
  bio-pm-backend
```

构建并启动前端：

```bash
docker build -t bio-pm-frontend ./frontend
docker run -d --name bio-pm-frontend --network bio-pm-net \
  -p 5173:80 \
  bio-pm-frontend
```

访问 `http://localhost:5173`。

### Docker Compose 部署

Docker Compose 是推荐的容器部署方式。

```bash
cp .env.example .env
docker compose up -d --build
```

服务地址：

- 前端：`http://localhost:5173`
- 后端 API：`http://localhost:3000/api`
- PostgreSQL：`localhost:5432`
- Redis：`localhost:6379`

停止服务：

```bash
docker compose down
```

停止并删除持久化卷：

```bash
docker compose down -v
```

## Release

首个版本标签为 `v0.1.0`。

详见 [发布说明](docs/RELEASE_NOTES_v0.1.0.md)。

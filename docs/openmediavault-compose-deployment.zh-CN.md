# OpenMediaVault Compose 插件部署

这份方案用于在 OpenMediaVault 的 Compose 插件中部署 Bio Project Management。OMV 服务器只需要拉取 Docker Hub 镜像，不需要安装 Node.js、npm，也不需要在服务器上构建源码。

## 镜像拉取

把 `<dockerhub-username>` 替换成你的 Docker Hub 用户名或命名空间：

```bash
docker pull <dockerhub-username>/bio-project-management-backend:0.1.1
docker pull <dockerhub-username>/bio-project-management-frontend:0.1.1
```

系统还会使用 PostgreSQL 和 Redis 官方镜像：

```bash
docker pull postgres:16-alpine
docker pull redis:7-alpine
```

## 构建并推送 Docker Hub 镜像

在已安装 Docker 且可以登录 Docker Hub 的机器上执行：

```bash
docker login

docker build -t <dockerhub-username>/bio-project-management-backend:0.1.1 -t <dockerhub-username>/bio-project-management-backend:latest ./backend
docker build -t <dockerhub-username>/bio-project-management-frontend:0.1.1 -t <dockerhub-username>/bio-project-management-frontend:latest ./frontend

docker push <dockerhub-username>/bio-project-management-backend:0.1.1
docker push <dockerhub-username>/bio-project-management-backend:latest
docker push <dockerhub-username>/bio-project-management-frontend:0.1.1
docker push <dockerhub-username>/bio-project-management-frontend:latest
```

## 使用 GitHub Actions 构建并推送

仓库里已经包含 `.github/workflows/docker-hub.yml`。

1. 在 Docker Hub 创建 Access Token。
2. 在 GitHub 仓库进入 `Settings` -> `Secrets and variables` -> `Actions`。
3. 新增两个仓库 Secret：

   ```text
   DOCKERHUB_USERNAME=<dockerhub-username>
   DOCKERHUB_TOKEN=<dockerhub-access-token>
   ```

4. 进入 `Actions` -> `Publish Docker Hub Images`。
5. 点击 `Run workflow`。
6. version 填写 `0.1.1`。

工作流完成后即可拉取：

```bash
docker pull <dockerhub-username>/bio-project-management-backend:0.1.1
docker pull <dockerhub-username>/bio-project-management-frontend:0.1.1
```

## OMV Compose 插件部署步骤

1. 在 OpenMediaVault 中安装并启用 Compose 插件。
2. 新建一个 compose 文件。
3. 粘贴 `docker-compose.openmediavault.yml` 的完整内容。
4. 在 Compose 插件的环境变量或 `.env` 区域填写：

   ```env
   DOCKERHUB_NAMESPACE=<dockerhub-username>
   APP_VERSION=0.1.1
   POSTGRES_DB=bio_pm
   POSTGRES_USER=bio_pm
   POSTGRES_PASSWORD=replace_with_a_strong_password
   JWT_SECRET=replace_with_a_long_random_secret
   ADMIN_EMAIL=admin@bio.local
   ADMIN_PASSWORD=replace_with_a_strong_admin_password
   FRONTEND_PORT=5173
   BACKEND_PORT=3333
   POSTGRES_PORT=5432
   REDIS_PORT=6379
   DATABASE_SYNCHRONIZE=true
   REDIS_ENABLED=true
   ```

5. 点击部署 Stack。
6. 访问 `http://OMV服务器IP:5173`。

后端 API 暴露在 `http://OMV服务器IP:3333/api`。

## 数据卷

compose 文件会创建这些命名卷：

- `bio_pm_postgres_data`：PostgreSQL 数据
- `bio_pm_redis_data`：Redis append-only 数据
- `bio_pm_uploads`：上传图片和附件

升级前建议备份 PostgreSQL 和 `bio_pm_uploads`。

## 首次登录

使用环境变量中设置的管理员账号：

- 邮箱：`ADMIN_EMAIL`
- 密码：`ADMIN_PASSWORD`

生产环境请务必修改默认管理员密码和 `JWT_SECRET`。

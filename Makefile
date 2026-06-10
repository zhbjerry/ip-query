.PHONY: dev start install docker-up docker-down

# 默认目标
default: dev

# 启动本地开发服务
dev:
	npm run dev

# 启动服务 (等同于 npm start)
start:
	npm start

# 安装依赖
install:
	npm install

# 使用 Docker Compose 启动服务
docker-up:
	docker-compose up -d

# 停止 Docker Compose 服务并移除容器
docker-down:
	docker-compose down

# 查看 Docker 日志
docker-logs:
	docker-compose logs -f

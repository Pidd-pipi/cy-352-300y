# 桌游吧社交平台

面向桌游爱好者，提供桌游库管理、组局拼车和战绩追踪的社交化桌游吧运营平台。

## Docker Compose 快速启动

首次启动前复制环境变量文件：

```bash
cp .env.example .env
docker compose up -d
```

访问地址：

- 前端：http://localhost:28512
- 后端健康检查：http://localhost:29512/health
- API 示例：http://localhost:28512/api/overview

## 项目主要功能

- 桌游库管理与分类：录入桌游信息（名称、类型、适合人数、时长、难度、简介），上传封面图，按类型（策略/聚会/角色扮演/卡牌）分类管理，记录库存数量。
- 组局拼车与缺人招募（已上线）：玩家发起组局（选择桌游、日期时段、人数上限），发布到拼车广场招募队友，其他玩家填手机号报名，满员后自动进入候补队列，有人退出时队首候补自动转正。
- 战绩记录与排行榜：记录每局桌游的参与者、胜负结果、时长，生成个人胜率排行榜和常用桌游统计，玩家可查看自己的桌游生涯数据。
- 包厢预约与会员储值：展示桌游吧包厢信息（容纳人数、设施），支持按时段预约，会员可充值储值，消费时享受会员折扣和积分累积。
- 活动赛事发布：门店发布桌游赛事活动（如狼人杀锦标赛、剧本杀推理赛），玩家报名参赛，系统自动分组和记录比赛成绩，颁发虚拟奖牌。

## 组局报名规则

- 玩家选择桌游、日期时段和人数上限后发布组局，其他人填写手机号登记拼车。
- 满员后新报名自动转为候补，按报名先后排队；有人退出时，队列最前面的候补自动转正。
- 同一手机号在同一场组局只占一个位置（名单或候补二选一），重复报名会被拒绝。
- 店长可调整人数上限，但不能低于已经登记（入选）的玩家数；调高产生空位时候补按顺序自动补位。
- 店长关闭招募后，新报名会被拒绝，已有名单和候补顺序保留；可重新开放招募。
- 页面直接展示每位玩家的状态（入选 / 候补第 N 位），手机号脱敏显示。

## 组局报名 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /api/catalog | 桌游目录与可报名时段 |
| GET | /api/sessions | 组局列表（含名单与候补队列） |
| GET | /api/sessions/:id | 单组局详情 |
| POST | /api/sessions | 发布组局 |
| POST | /api/sessions/:id/registrations | 手机号报名（满员自动转候补） |
| POST | /api/sessions/:id/cancel | 手机号退出（队首候补自动转正） |
| PATCH | /api/sessions/:id/capacity | 店长调整人数上限（不低于已登记人数） |
| POST | /api/sessions/:id/close | 店长关闭招募（名单与候补保留） |
| POST | /api/sessions/:id/reopen | 店长重新开放招募 |

## 本地开发方式

前端：

```bash
cd frontend
npm install
npm run dev
```

后端：

```bash
cd backend
npm install
npm run dev
```

## 技术栈

| 分层 | 技术 |
| --- | --- |
| 前端 | Vue 3 + TypeScript、Element Plus、Vite |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | MongoDB |
| 认证 | JWT |
| 依赖 | Mongoose、bcryptjs |

## 项目目录结构

```text
.
├── backend/              # 后端服务
├── database/             # 数据库脚本
├── frontend/             # 前端应用
├── docker-compose.yml    # 一键部署编排
├── .env.example          # 环境变量示例
└── README.md
```

## 环境变量说明

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| COMPOSE_PROJECT_NAME | Compose 项目名，避免中文目录名导致项目名为空 | lpboardgame |
| DB_NAME | 数据库名称 | app |
| DB_USER | 数据库用户 | app |
| DB_PASSWORD | 数据库密码 | app_pwd |
| DB_ROOT_PASSWORD | 数据库 root 密码 | root_pwd |
| JWT_SECRET | JWT 签名密钥 | change_me_to_a_long_random_string |
| FRONTEND_PORT | 前端宿主机端口 | 28512 |
| BACKEND_PORT | 后端宿主机端口 | 29512 |
| DB_PORT | 数据库宿主机端口 | 27017 |

## Docker 部署说明

- 使用 `docker compose up -d` 启动，不需要额外传入 `-p`。
- `docker-compose.yml` 顶层已声明 `name: lpboardgame`，并且 `.env` 包含 `COMPOSE_PROJECT_NAME=lpboardgame`，可在中文目录名下启动。
- 数据库数据保存在命名卷 `db_data` 中，不依赖当前目录名。
- 前端容器由 Nginx 托管静态资源，并把 `/api/` 反向代理到 `backend:29512`。
- 若本地端口冲突，可修改 `.env` 中的 `FRONTEND_PORT`、`BACKEND_PORT`、`DB_PORT`。

常用命令：

```bash
docker compose config --quiet
docker compose ps
docker compose down
```

## License

MIT

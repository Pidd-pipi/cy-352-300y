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

## 组局拼车功能

顶部导航进入「组局拼车」页面即可使用完整的组局报名闭环：

- **发布组局**：选择桌游（支持手动输入）、日期、上午/下午/晚上时段和人数上限后发布到拼车广场。
- **报名拼车**：填写手机号（昵称选填）登记；同一手机号在同一场只占一个位置，重复报名会被拒绝。
- **满员转候补**：报名人数达到上限后，新报名自动进入候补队列并展示候补序号。
- **退出自动递补**：已确认玩家退出时，候补队列最前面的玩家自动转正；候补玩家退出则不影响他人。
- **店长管理**：可随时调整人数上限（不能低于当前已确认人数），或关闭招募。关闭后新报名一律拒绝，已确认名单和候补顺序原样保留，可重新开放。
- 页面按报名先后直接展示每个人的「已确认 / 候补 #N」状态，并每 5 秒自动刷新。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/sessions` | 组局列表（含全部报名记录与状态） |
| POST | `/api/sessions` | 发布组局 |
| POST | `/api/sessions/:id/registrations` | 手机号报名（满员自动转候补） |
| DELETE | `/api/sessions/:id/registrations` | 凭手机号退出报名（触发候补递补） |
| PATCH | `/api/sessions/:id/capacity` | 店长调整人数上限 |
| POST | `/api/sessions/:id/close` | 关闭招募 |
| POST | `/api/sessions/:id/reopen` | 重新开放招募 |

> 当前组局数据保存在后端进程内存中（重启服务后清空），数据访问层已隔离在 `backend/src/modules/sessions/session.store.ts`，可直接替换为 Mongoose 实现。

## 项目主要功能

- 桌游库管理与分类：录入桌游信息（名称、类型、适合人数、时长、难度、简介），上传封面图，按类型（策略/聚会/角色扮演/卡牌）分类管理，记录库存数量。
- 组局拼车与缺人招募：玩家发起组局（选择桌游、时间、人数），发布到拼车广场招募队友，其他玩家可报名加入，满员后自动锁定。
- 战绩记录与排行榜：记录每局桌游的参与者、胜负结果、时长，生成个人胜率排行榜和常用桌游统计，玩家可查看自己的桌游生涯数据。
- 包厢预约与会员储值：展示桌游吧包厢信息（容纳人数、设施），支持按时段预约，会员可充值储值，消费时享受会员折扣和积分累积。
- 活动赛事发布：门店发布桌游赛事活动（如狼人杀锦标赛、剧本杀推理赛），玩家报名参赛，系统自动分组和记录比赛成绩，颁发虚拟奖牌。

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

# SpecPilot

**把模糊想法，变成可讨论、可验证的需求。**

SpecPilot 是一个 AI 辅助需求工作台原型。输入一段自然语言想法后，它整理需求概览、待确认问题、验收标准、API 草案和测试用例；开发者可以编辑草案、确认版本并导出 Markdown。模型输出始终是待审阅内容，不会被自动当作正确规格。

## 为什么做这个项目

本项目面向 AI 原生开发流程：在需求不完整时快速形成可讨论原型，再由开发者检查、测试和迭代。它同时展示 Python Web API、数据库持久化、Redis 缓存、AI 服务接入、前端交互和自动化测试。

## 功能

- 自然语言需求输入、可修改的场景模板和无密钥演示样例。
- AI 生成需求概览、澄清问题、用户故事、验收标准、接口草案、测试用例与风险提示。
- 支持无密钥本地演示模式；配置 Anthropic API 后可启用真实模型调用。
- 人工编辑草案、标记已确认，并保留修改前快照。
- 搜索需求档案，复制或导出 Markdown。
- React 单页工作台、Django REST API、MySQL 持久化和 Redis 缓存。
- Docker Compose 本地启动，GitHub Actions 运行后端测试和前端构建。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 19、Vite、原生 CSS |
| API | Python 3.12、Django 5、Django REST Framework |
| 数据库 | MySQL 8.4；测试和轻量开发可用 SQLite |
| 缓存 | Redis |
| AI | Anthropic Messages API；mock 模式用于无密钥演示和自动化测试 |
| 验证 | Django TestCase、GitHub Actions |

## 本地运行

需要 Docker Desktop 或 Docker Engine 和 Docker Compose。

```bash
cp .env.example .env
docker compose up --build
```

打开 `http://localhost:5173`。默认使用 mock 模式，不需要 API Key。后端健康检查地址为 `http://localhost:8000/api/health/`。

启用 Anthropic 模式时，在 `.env` 中设置 `AI_PROVIDER=anthropic` 和你自己的 `ANTHROPIC_API_KEY`，再重启服务。密钥只保存在本地 `.env`，不要提交到 GitHub。

## 测试

```bash
cd backend
USE_SQLITE=true AI_PROVIDER=mock python manage.py test
```

```bash
cd frontend
pnpm install
pnpm build
```

## API

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/health/` | 服务状态和当前 AI provider 名称 |
| `GET` | `/api/overview/` | 草案数量统计 |
| `GET` | `/api/specs/` | 需求档案，可用 `?q=` 搜索 |
| `POST` | `/api/specs/` | 分析并保存一条需求 |
| `GET` | `/api/specs/{id}/` | 查看需求详情 |
| `PATCH` | `/api/specs/{id}/` | 保存人工审阅结果和修改前快照 |
| `GET` | `/api/specs/{id}/revisions/` | 查看修改历史 |

## UI 参考与 AI 开发记录

- [界面参考来源及实现说明](docs/UI_REFERENCES.md)
- [AI 辅助开发记录](docs/AI_WORKFLOW.md)

## 当前边界

- 这是用于作品集展示的原型，当前 API 没有用户认证，不应直接部署为生产服务。
- mock 模式提供结构化演示草案，不调用真实模型，也不代表生成质量评估。
- Anthropic 模式需用户提供有效 API Key；模型输出需要开发者复核。
- 当前版本不生成或执行任意代码，只提供可审阅的规格与测试草案。

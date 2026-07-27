# lm-ai-future

AI 学习项目，涵盖 API 调用、SDK 使用、Embedding、Vision、Function Calling 等实践。

## 环境

- Python >= 3.10（uv 管理）
- 依赖见 `pyproject.toml`

## 快速开始

```bash
uv sync
uv run python learn/day1-demo/req_call.py
```

## 目录

| 文件/目录 | 作用 |
|-----------|------|
| `.env` | 环境变量配置，存放 `OPENAI_BASE_URL` 和 `OPENAI_API_KEY`，供 Python 代码通过 `python-dotenv` 加载 |
| `.gitignore` | Git 忽略规则，排除 `node_modules`、`.venv`、`__pycache__`、日志、构建产物等 |
| `.gitmodules` | Git 子模块配置，将 `front/skills` 目录链接到外部仓库 `lm-skill` |
| `.python-version` | 指定项目使用的 Python 版本为 3.10（uv/pyenv 自动识别） |
| `LICENSE` | MIT 开源许可证 |
| `README.md` | 项目说明文档，介绍项目用途、环境和快速开始命令 |
| `pyproject.toml` | Python 项目元数据和依赖声明（`python-dotenv`、`requests`），要求 Python >= 3.10 |
| `uv.lock` | uv 包管理器的依赖锁定文件，记录精确的依赖版本和哈希值 |
| `learn/` | 学习示例代码（day1-demo / day2-demo） |
| `front/` | 前端相关（agent / demo / mcp / rules） |
| `config/` | 配置文件（API、编辑器 MCP 等） |
| `.vscode/` | VS Code 工作区配置（Python 解释器路径） |
| `.venv/` | 虚拟环境目录（已忽略提交） |

```
learn/
├── day1-demo/    # API 基础调用
└── day2-demo/    # SDK、Embedding、Vision 等进阶
front/            # 前端相关
config/           # 配置文件
```

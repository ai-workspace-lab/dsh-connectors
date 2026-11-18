# @ai-workspace-lab/dsh-connectors

<p align="center">
  <img src="https://img.shields.io/badge/Status-开发中%20(WIP)-orange.svg" alt="Status: WIP" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" />
  <img src="https://img.shields.io/badge/DeepSeek%20Harness-Plugin-green.svg" alt="DSH Plugin" />
</p>

[English](README.md) · [简体中文](README.zh.md)

> 🚧 **当前状态：积极开发中 (Under Active Development / WIP)**  
> 本插件专为 **DeepSeek Harness (dsh)** 设计，用于在客户端“设置”中提供原生 **连接器 (Connectors)** 管理中心。  
> 目前已实现首期现代应用商店风格 UI、DSH 凭据安全存储机制、自定义远程 MCP 服务器接入以及首个参考连接器 **GitHub OIDC / Device Flow / 本地 CLI SSO**；其余内置云端与 DevOps 连接器正在分批实现中。

---

## ✨ 核心特性

- **原生设置面板 (`settings.section`)**：
  - 注册独立设置页面（`id: 'connectors'`），深度融入 DeepSeek Harness 官方交互风格。
  - 现代简洁的应用中心视图：官方品牌 SVG 图标、分类筛选胶囊、实时关键词搜索与“已连接”状态计数器。
  - 双列自适应卡片布局，支持抽屉式配置详情、实时连通性测试与工具探测。
- **第一批内置连接器矩阵（10 款）**：
  - 首批覆盖代码托管、云基础设施、邮件通信、办公协作及密钥安全。
  - 首个连接器 **GitHub OIDC** 已完全可用，支持 Device Code 网页授权、本地 `gh` CLI 免密 SSO 与内置 GitHub MCP 工具集。
- **安全第一凭据架构 (DSH Credential Store)**：
  - 严格通过 `@deepseek-ai/dsh-credentials`（`ctx.credentials`）保存在 `connectors/<id>` 命名空间。
  - 敏感凭据（Access Token / Refresh Token / Client Secret）**绝不写入设置明文文件**，前端 UI API 仅暴露安全脱敏元数据（Masked View）。
  - 支持 OAuth 2.0 PKCE 与 Refresh Token 自动静默换发。
- **自定义远程 MCP 服务器支持**：
  - 支持添加任意 Streamable HTTP / SSE 规范的远程 MCP 服务器。
  - 支持 Bearer Token、自定义认证 Header、OAuth 2.0 或免认证连接。
  - 连通后自动探测远端工具（Tools）并反射注册至 DSH 会话中。
- **插件连接器生态扩展**：
  - 开放 `ctx.connectors.registerPackage(pkg)` API，允许外部 DSH 插件动态扩展连接器目录。
- **CLI / TUI 无头支持**：
  - 内置 `/connectors` 与 `/connector test <id>` 斜杠命令，支持终端无头环境下的查看与连通性验证。

---

## 📊 第一批内置连接器状态矩阵

| 连接器 / 服务 | 分类 | 认证方式 | 当前状态 | 功能说明与 MCP 工具集 |
| :--- | :--- | :--- | :---: | :--- |
| **GitHub** | 代码托管 | OIDC / Device Flow / CLI SSO / PAT | 🟢 **已可用 (Ready)** | 支持 GitHub Device Code 浏览器验证、`gh auth token` 本地免密直连；内置 `mcp__github__*` 工具（获取当前用户、搜索仓库、查询 Issue、查询 PR） |
| **Gitea** | 代码托管 | Personal Access Token / OAuth 2.0 | 🟡 **开发中 (WIP)** | 支持私有自托管实例与 gitea.com 远端 API/MCP 接入 |
| **GitLab** | 代码托管 | Personal Access Token / OAuth 2.0 | 🟡 **开发中 (WIP)** | 支持 gitlab.com 与企业私有 GitLab CE/EE 实例接入 |
| **Gmail** | 邮件通信 | Google OAuth 2.0 / API 令牌 | 🟡 **开发中 (WIP)** | 支持邮件检索、摘要、草稿与安全投递 |
| **Google Workspaces** | 办公协作 | Google OAuth 2.0 / 服务账号 | 🟡 **开发中 (WIP)** | 支持 Google Drive、Docs、Sheets 文档检索与协同编辑 |
| **Vault Server** | 密钥安全 | AppRole / Token / OIDC | 🟡 **开发中 (WIP)** | HashiCorp Vault 动态密钥拉取与安全注入 |
| **Cloudflare** | 云基础设施 | API Token / Global Key | 🟡 **开发中 (WIP)** | Cloudflare Workers、DNS、AI Gateway 状态查询与运维 |
| **AWS Lightsail** | 云基础设施 | IAM Access Key / STS Token | 🟡 **开发中 (WIP)** | Lightsail 实例状态监控、容器服务与快照管理 |
| **GCP** | 云基础设施 | Service Account / ADC / OAuth | 🟡 **开发中 (WIP)** | Google Cloud 项目、Cloud Run 部署与 BigQuery 资源联动 |
| **Linode VPS** | 云基础设施 | Personal Access Token | 🟡 **开发中 (WIP)** | Akamai / Linode VPS 实例清单、状态与 NodeBalancers 管理 |
| **自定义远程 MCP** | 协议直连 | HTTP / SSE / Bearer / Custom Header | 🟢 **已可用 (Ready)** | 接入任意标准 MCP 远端端点，自动发现并注册工具 |

---

## 🚀 首个连接器：GitHub OIDC & Device Flow

本插件实现了首个完整的无缝认证与工具集成范例：

1. **三种便捷认证路径**：
   - **Device Code 流 (OIDC / OAuth 2.0)**：点击“使用 GitHub 登录”启动标准 Device Flow，直接在浏览器中输入一次性验证码完成授权。
   - **本地 CLI 免密直连 (Local SSO)**：若本机环境已通过 `gh auth login` 登录，插件可一键读取环境凭据导入 DSH 凭据库，无需手动生成 PAT。
   - **个人访问令牌 (PAT)**：支持手动配置具有 `repo`、`read:org`、`gist` 权限的 Personal Access Token。
2. **内置 GitHub MCP 工具集**：
   - `mcp__github__get_authenticated_user`：获取当前登录用户画像、邮箱与组织信息。
   - `mcp__github__search_repositories`：搜索开源或组织私有代码仓库。
   - `mcp__github__list_issues`：查询指定仓库的 Issue 列表及状态。
   - `mcp__github__list_pull_requests`：检索仓库 Pull Request 进度与评审详情。

---

## 🔒 凭据安全设计

所有密钥材料均遵循最小暴露面原则：

```text
[ 用户输入 / 浏览器 OAuth / CLI SSO ]
                   │
                   ▼ (仅传输于本地安全通道)
       [ ConnectorsService ]
                   │
                   ▼ (加密持久化)
     [ DSH Credential Store ] ─── ctx.credentials.set('connectors/<id>', ...)
                   │
                   ├── ❌ 不写入任何明文 JSON 配置文件
                   ├── ❌ 不在 Web UI / API 响应中回传明文 Token
                   └── 🔄 支持 OAuth 2.0 自动静默 Refresh
```

---

## 💻 本地开发与测试

### 环境依赖
- Node.js >= 20
- npm >= 10
- DeepSeek Harness 开发环境

### 常用命令

```bash
# 安装依赖
npm install

# 静态类型检查、测试用例、打包与准入自检
npm run check

# 单独运行单元测试
node --test

# 打包构建 client & server bundle
npm run build

# 模拟 DSH 插件宿主轻量加载验证
node scripts/smoke-load.mjs
```

### 调试安装至本机 DeepSeek Harness

将本插件软链接或安装至本机 DSH Profile 目录：

```bash
ln -s "$(pwd)" "$HOME/.dsh/profiles/desktop/node_modules/@ai-workspace-lab/dsh-connectors"
```

重启 DeepSeek Harness 桌面客户端，打开 **设置 → 连接器** 即可看到全新的连接器管理页面。

---

## 🗺️ 后续路线图 (Roadmap)

- [x] 原生 `settings.section` 连接器页面 UI（应用中心视图、品牌图标、分类搜索）
- [x] DSH 凭据存储安全抽象与 OAuth PKCE / Token 自动化轮转
- [x] 自定义远程 Streamable HTTP / SSE MCP 服务器桥接与工具注册
- [x] **GitHub** 连接器全链路落地（Device Code + 本地 SSO + 内置 MCP 工具）
- [ ] **Gitea / GitLab** 个人令牌与自建实例 OAuth 连接器
- [ ] **HashiCorp Vault** 动态凭据读取与注入 MCP
- [ ] **Cloudflare / AWS Lightsail / GCP / Linode** 云基础设施连接器与运维工具集
- [ ] **Gmail / Google Workspaces** 邮件与在线协作 MCP 套件
- [ ] UI 抽屉内嵌交互式 MCP 工具调用试运行面板

---

## 📄 许可证

基于 [MIT License](LICENSE) 开源发布。

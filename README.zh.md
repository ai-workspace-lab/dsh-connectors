# @ai-workspace-lab/dsh-connectors

[English](README.md)

适用于 **DeepSeek Harness (dsh)** 的连接器插件。在“设置”中新增独立的 **连接器 (Connectors)** 页面，支持通过 **OAuth 2.0 (PKCE)** 或 **API 令牌** 连接远程 MCP 服务器与云/DevOps 服务；所有令牌与授权凭据均安全保存在 **DSH 凭据存储**（`@deepseek-ai/dsh-credentials`）中。

## 核心特性

- **设置 → 连接器页面**：通过 `settings.section`（`id: 'connectors'`）提供原生设置页面，支持分类筛选、关键词搜索、OAuth 2.0 / 令牌配置、实时连通性测试与远程 MCP 工具列表预览。
- **第一批内置连接器（10 个）**：
  - **代码托管**：`github`（GitHub）、`gitea`（Gitea）、`gitlab`（GitLab）
  - **邮件与协作**：`gmail`（Gmail）、`google-workspaces`（Google Workspaces）
  - **密钥安全**：`vault-server`（HashiCorp Vault）
  - **云基础设施**：`cloudflare`（Cloudflare）、`aws-lightsail`（AWS Lightsail）、`gcp`（GCP）、`linode-vps`（Linode VPS）
- **自定义远程 MCP 地址**：支持添加任意 Streamable HTTP / SSE 远程 MCP 服务器（支持 Bearer Token、自定义 Header、OAuth 2.0 或免认证）。
- **第三方插件扩展包**：其他 DSH 插件可通过 `ctx.connectors.registerPackage(pkg)` 注册更多连接器包。
- **DSH 凭据存储**：API 令牌与 OAuth Grant（含自动刷新 `refreshToken`）均保存在 `ctx.credentials` 的 `connectors/<id>` 记录中，不在配置文件明文落盘，也不向前端泄露明文密钥。
- **CLI / TUI**：提供 `/connectors`、`/connector test <id>` 斜杠命令与 TUI 设置项。

## 开发与校验

```bash
npm run check
node scripts/smoke-load.mjs
```

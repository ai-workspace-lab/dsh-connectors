# @ai-workspace-lab/dsh-connectors

[中文说明](README.zh.md)

Connectors plugin for **DeepSeek Harness (dsh)**. Adds a dedicated **Connectors** page in Settings to connect remote MCP servers and cloud/DevOps services via **OAuth 2.0 (PKCE)** or **API tokens**, with all credentials stored securely in the **DSH Credential Store** (`@deepseek-ai/dsh-credentials`).

## Features

- **Settings → Connectors Page**: Built-in `settings.section` (`id: 'connectors'`) with category filters, search, OAuth 2.0 & API token configuration, live connection testing, and discovered MCP tool inspection.
- **First-Batch Built-in Connectors (10)**:
  - **Code Hosting**: `github` (GitHub), `gitea` (Gitea), `gitlab` (GitLab)
  - **Communication & Workspace**: `gmail` (Gmail), `google-workspaces` (Google Workspaces)
  - **Security**: `vault-server` (HashiCorp Vault)
  - **Cloud Infrastructure**: `cloudflare` (Cloudflare), `aws-lightsail` (AWS Lightsail), `gcp` (Google Cloud Platform), `linode-vps` (Linode VPS)
- **Custom Remote MCP Servers**: Add any Streamable HTTP / SSE remote MCP server address with Bearer token, custom header, OAuth 2.0, or unauthenticated access.
- **Plugin Connector Packages**: Other DSH plugins can register connector packs via `ctx.connectors.registerPackage(pkg)`.
- **DSH Credential Store**: Tokens and OAuth grants (`accessToken` + `refreshToken` with automatic refresh) are stored under `connectors/<id>` in `ctx.credentials`, never written in plaintext to settings files or returned to the UI.
- **CLI / TUI**: Includes `/connectors` and `/connector test <id>` slash commands plus TUI settings registration.

## Installation

```bash
npm install @ai-workspace-lab/dsh-connectors
```

## Development

```bash
npm run check
node scripts/smoke-load.mjs
```

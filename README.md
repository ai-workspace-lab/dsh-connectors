# @ai-workspace-lab/dsh-connectors

<p align="center">
  <img src="https://img.shields.io/badge/Status-Under%20Active%20Development%20(WIP)-orange.svg" alt="Status: WIP" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" />
  <img src="https://img.shields.io/badge/DeepSeek%20Harness-Plugin-green.svg" alt="DSH Plugin" />
</p>

[English](README.md) · [简体中文](README.zh.md)

> 🚧 **Status: Under Active Development (WIP)**  
> This plugin is designed for **DeepSeek Harness (dsh)** to provide a native **Connectors** control center inside client Settings.  
> The modern App-Store style UI, secure DSH Credential Store integration, custom remote MCP bridge, and the first reference connector (**GitHub OIDC / Device Flow / Local CLI SSO**) are now fully functional and verified. The remaining cloud and DevOps connectors are actively being rolled out.

---

## ✨ Features

- **Native Settings Panel (`settings.section`)**:
  - Adds a dedicated settings section (`id: 'connectors'`), seamlessly blended with DeepSeek Harness's UI.
  - Modern app center layout: crisp SVG brand icons, category filter pills, instant search, and a connected count badge.
  - Two-column responsive card layout with drawer configuration, live connectivity diagnostics, and tool inspection.
- **First-Batch Built-in Connectors (10 Services)**:
  - Covers code hosting, cloud infrastructure, messaging, workplace collaboration, and secrets management.
  - The first connector, **GitHub OIDC**, is production-ready with browser-based Device Code auth, local `gh` CLI SSO, and built-in GitHub MCP tools.
- **Security-First Architecture (DSH Credential Store)**:
  - Tokens and OAuth grants are strictly isolated in `ctx.credentials` under `connectors/<id>` via `@deepseek-ai/dsh-credentials`.
  - Credentials **never leak into plain JSON config files**, and web client APIs only receive masked views.
  - Supports automatic silent token rotation via OAuth 2.0 refresh tokens.
- **Custom Remote MCP Servers**:
  - Supports connecting any Streamable HTTP / SSE compliant remote MCP server.
  - Compatible with Bearer tokens, custom headers, OAuth 2.0, or unauthenticated connections.
  - Automatically reflects discovered remote tools into DSH agent sessions.
- **Extensible Connector Packages**:
  - Exposes `ctx.connectors.registerPackage(pkg)` API for third-party DSH plugins to register custom connector bundles.
- **CLI & TUI Support**:
  - Includes `/connectors` and `/connector test <id>` slash commands for headless inspection and connectivity testing.

---

## 📊 First-Batch Built-in Connectors Status Matrix

| Connector / Service | Category | Authentication | Status | Notes & MCP Tools |
| :--- | :--- | :--- | :---: | :--- |
| **GitHub** | Code Hosting | OIDC / Device Flow / CLI SSO / PAT | 🟢 **Ready** | Browser Device Code verification, zero-touch `gh auth token` local SSO; built-in `mcp__github__*` tools (user info, search repositories, list issues, list pull requests) |
| **Gitea** | Code Hosting | Personal Access Token / OAuth 2.0 | 🟡 **WIP** | Self-hosted instances & gitea.com remote API / MCP |
| **GitLab** | Code Hosting | Personal Access Token / OAuth 2.0 | 🟡 **WIP** | gitlab.com & self-hosted GitLab CE/EE instances |
| **Gmail** | Email & Messaging | Google OAuth 2.0 / API Token | 🟡 **WIP** | Email search, summaries, drafting, and secure dispatch |
| **Google Workspaces** | Productivity | Google OAuth 2.0 / Service Account | 🟡 **WIP** | Google Drive, Docs, and Sheets integration |
| **Vault Server** | Secrets Management | AppRole / Token / OIDC | 🟡 **WIP** | HashiCorp Vault dynamic secret retrieval and injection |
| **Cloudflare** | Cloud Infrastructure | API Token / Global Key | 🟡 **WIP** | Cloudflare Workers, DNS, and AI Gateway operations |
| **AWS Lightsail** | Cloud Infrastructure | IAM Access Key / STS Token | 🟡 **WIP** | Lightsail instance monitoring, container services, snapshots |
| **GCP** | Cloud Infrastructure | Service Account / ADC / OAuth | 🟡 **WIP** | Google Cloud projects, Cloud Run, and BigQuery resources |
| **Linode VPS** | Cloud Infrastructure | Personal Access Token | 🟡 **WIP** | Akamai / Linode VPS instances, status, and NodeBalancers |
| **Custom Remote MCP** | Protocol Bridge | HTTP / SSE / Bearer / Custom Header | 🟢 **Ready** | Connect any standard MCP endpoint with automatic tool registration |

---

## 🚀 First Connector: GitHub OIDC & Device Flow

This plugin provides a reference implementation for frictionless auth and tool execution:

1. **Three Flexible Auth Paths**:
   - **Device Code Flow (OIDC / OAuth 2.0)**: Click "Login with GitHub" to initiate standard Device Flow, entering a one-time code on `https://github.com/login/device`.
   - **Local CLI SSO**: Automatically detect and import existing credentials from local `gh auth login` into DSH Credential Store without manual PAT generation.
   - **Personal Access Token (PAT)**: Manual configuration with `repo`, `read:org`, and `gist` scopes.
2. **Built-in GitHub MCP Tools**:
   - `mcp__github__get_authenticated_user`: Retrieve current user profile, email, and organization details.
   - `mcp__github__search_repositories`: Query public and private repositories.
   - `mcp__github__list_issues`: Fetch issues with filters and labels.
   - `mcp__github__list_pull_requests`: Inspect PR statuses and code reviews.

---

## 🔒 Credential Security Model

Sensitive material is handled strictly following least-privilege principles:

```text
[ User Input / Browser OAuth / CLI SSO ]
                   │
                   ▼ (Local IPC / secure loopback)
       [ ConnectorsService ]
                   │
                   ▼ (Encrypted persistence)
     [ DSH Credential Store ] ─── ctx.credentials.set('connectors/<id>', ...)
                   │
                   ├── ❌ No plaintext stored in settings.json
                   ├── ❌ No secrets returned in Web UI / API state
                   └── 🔄 Automatic OAuth 2.0 refresh token rotation
```

---

## 💻 Development & Testing

### Prerequisites
- Node.js >= 20
- npm >= 10
- DeepSeek Harness environment

### Common Commands

```bash
# Install dependencies
npm install

# Type checks, unit tests, bundle build, and smoke verification
npm run check

# Run unit tests directly
node --test

# Build client and server bundles
npm run build

# Smoke test plugin host loading
node scripts/smoke-load.mjs
```

### Local Installation in DeepSeek Harness

Symlink the plugin directly into your local DSH profile:

```bash
ln -s "$(pwd)" "$HOME/.dsh/profiles/desktop/node_modules/@ai-workspace-lab/dsh-connectors"
```

Restart the DeepSeek Harness desktop application and navigate to **Settings → Connectors**.

---

## 🗺️ Roadmap

- [x] Native `settings.section` UI (App-Store style, brand icons, category pills, search)
- [x] DSH Credential Store security abstraction and OAuth PKCE / Token rotation
- [x] Custom remote Streamable HTTP / SSE MCP server bridge and tool registration
- [x] **GitHub** connector end-to-end implementation (Device Code + Local SSO + Built-in MCP Tools)
- [ ] **Gitea / GitLab** personal access tokens and self-hosted OAuth connectors
- [ ] **HashiCorp Vault** dynamic secret retrieval and injection MCP
- [ ] **Cloudflare / AWS Lightsail / GCP / Linode** cloud infrastructure connectors and ops tools
- [ ] **Gmail / Google Workspaces** productivity and email MCP suite
- [ ] In-drawer interactive MCP tool test execution panel

---

## 📄 License

Licensed under the [MIT License](LICENSE).

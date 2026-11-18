# AGENTS.md

This repository implements `@ai-workspace-lab/dsh-connectors`, an independent DeepSeek Harness (`dsh`) plugin.

## Architecture

- `src/catalog.ts`: Built-in first-batch connector definitions (`github`, `gitea`, `gitlab`, `gmail`, `google-workspaces`, `vault-server`, `cloudflare`, `aws-lightsail`, `gcp`, `linode-vps`).
- `src/credentials.ts`: DSH Credential Store (`@deepseek-ai/dsh-credentials`) integration via `connectors/<id>` `CredentialKey` records (`ApiKeyRecord` and `GrantRecord`) and optional `CredentialRef` env fallbacks.
- `src/oauth.ts`: OAuth 2.0 PKCE flow and token exchange.
- `src/mcp-bridge.ts`: Remote MCP Streamable HTTP / SSE client and `ctx.tools` registration (`mcp__<connectorId>__<toolName>`).
- `src/probe.ts`: Live REST & MCP health verification.
- `src/service.ts`: `ConnectorsService` managing built-ins, custom MCP servers, and external plugin `registerPackage`.
- `src/routes.ts`: Host HTTP API under `/plugins/connectors/*` protected by `verifyDesktop` / `verifyHost`.
- `src/client/`: Browser UI registering into `settings.section` (`id: 'connectors'`).

## Verification

Run `npm run check` (`tsc --noEmit`, `node --import tsx --test`, `tsdown`, `pack:check`) and `node scripts/smoke-load.mjs` before committing.

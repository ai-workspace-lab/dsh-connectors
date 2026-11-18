# Changelog

## 0.1.0

- Complete transformation into `@ai-workspace-lab/dsh-connectors`.
- Added Settings -> Connectors UI (`settings.section`, `en` + `zh` locales).
- Added 10 first-batch built-in connectors: `github`, `gitea`, `gitlab`, `gmail`, `google-workspaces`, `vault-server`, `cloudflare`, `aws-lightsail`, `gcp`, `linode-vps`.
- Added OAuth 2.0 PKCE flow, token refresh, DSH Credential Store integration (`connectors/<id>`), remote MCP Streamable HTTP / SSE tool discovery, custom MCP server management, and plugin package registration (`ctx.connectors.registerPackage`).

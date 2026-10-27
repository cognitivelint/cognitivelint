# Security model

Similar in spirit to [LHCI server security](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/server.md#security): **weak by default** unless you add network controls.

## No global admin

There is **no** server-wide admin API key. Each project has:

| Secret | Purpose | Where to use |
| --- | --- | --- |
| **Upload token** | Create runs only | CI: `upload`, `scan --upload` |
| **Admin token** | Rotate upload token, delete project | Never in CI logs; admin UI or API only |

Tokens are stored as **hashes** only. Plaintext is returned once at project creation or token rotation.

## Public without authentication

Anyone with HTTP access can:

- List projects on the **HTML** home page.
- **Create** projects (API and UI).
- **View** trends for any project ID.
- **List runs**, **get run**, and **compare** via `/v1/...` read APIs.

Treat **project IDs as shareable links**, not secrets. Do not put sensitive data in finding messages if the server is reachable by untrusted users.

## Protected operations

| Action | Token |
| --- | --- |
| `POST .../runs` | Upload token |
| `POST .../upload-token`, `DELETE .../project` | Admin token |

Use `Authorization: Bearer <token>` on JSON API routes.

## Hardening options

The server does not ship HTTP basic auth (unlike LHCI’s built-in flag). Typical approaches:

1. **Firewall / VPN** — only CI and staff networks reach port 3848.
2. **Reverse proxy** — TLS + OAuth or basic auth in nginx, Caddy, etc.
3. **Private project IDs** — reduces casual browsing but is not encryption; combine with network policy.

For open-source repos, assume the **upload token in CI is visible** to anyone who can read workflow secrets or fork PR workflows; rotate if leaked. **Admin token** must stay off CI runners.

## Token reveal UI

HTML flows use ephemeral `reveal` keys in memory (not persisted). They expire after about ten minutes and are single-use on display.

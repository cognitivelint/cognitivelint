# HTTP API

Base URL: `http://<host>:<port>` (default port **3848**).

## Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | None | `{ "ok": true }` |

## Projects

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/v1/projects` | None | Create project. Body: `{ "name": "my-app" }`. **201** with `{ id, name, token, adminToken }`. Tokens shown once. |

There is **no** `GET /v1/projects` list endpoint; use the web UI at `/` or your own registry of project IDs.

## Runs

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/v1/projects/:projectId/runs` | Upload token (`Authorization: Bearer <token>`) | Body: full `cognitivelint.run.v1` JSON. **201** `{ id, sha }`. **409** duplicate `(project, sha, runKind)`. **400** validation errors. |
| `GET` | `/v1/projects/:projectId/runs` | None | Query `limit` (default 50, max 200). Returns summary list (sha, branch, score, finding count, …). |
| `GET` | `/v1/projects/:projectId/runs/:sha` | None | Single run summary + score + report summary. |
| `GET` | `/v1/projects/:projectId/compare` | None | Query `baseSha`, `headSha` (required). Returns diff payload (see below). |

### Compare response

```json
{
  "configHashMismatch": false,
  "shouldFailOnNewHigh": true,
  "added": [ /* finding objects */ ],
  "removed": [ /* finding objects */ ],
  "unchangedCount": 12,
  "newHighOrCritical": [ /* finding objects */ ]
}
```

## Project administration

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/v1/projects/:projectId/upload-token` | Admin token | **200** `{ "token": "<new upload token>" }` |
| `DELETE` | `/v1/projects/:projectId` | Admin token | Deletes project, all runs, and findings. **200** `{ "deleted": true }` |

## HTML routes (not JSON)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/`, `/projects` | Project list + admin forms |
| `POST` | `/projects/new` | Form create → redirect to token reveal |
| `GET` | `/projects/:id/created` | One-time token reveal (`?reveal=`) |
| `POST` | `/projects/upload-token`, `/projects/delete` | Form-based admin actions |
| `GET` | `/projects/:id/trends` | Trends dashboard |
| `GET` | `/favicon.svg`, `/patternfly/*` | Static UI assets |

## Errors

| Status | Typical cause |
| --- | --- |
| `400` | Invalid JSON, missing fields, invalid run schema |
| `401` | Missing or wrong upload/admin token |
| `404` | Unknown project or run |
| `409` | Run already stored for same SHA + run kind |

## Example: upload with curl

```bash
curl -X POST "http://127.0.0.1:3848/v1/projects/$PROJECT_ID/runs" \
  -H "Authorization: Bearer $UPLOAD_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @packages/ci-server/examples/run.v1.json
```

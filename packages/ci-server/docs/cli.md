# CLI integration

Commands live in `@cognitivelint/cli`. They use `@cognitivelint/ci-server/protocol` for validation and the HTTP API for I/O.

## `cognitivelint upload`

Upload a run to the server.

**Required:** `--server`, `--token` (upload token), `--project-id`.

**Input (`--file`):**

1. Full **`cognitivelint.run.v1`** JSON — SHA and git metadata come from the file.
2. **Scan report JSON** (output of `cognitivelint scan -f json`) — wrapped into a run envelope; git SHA from `GITHUB_SHA` or `git rev-parse HEAD`.

If `--file` is omitted, runs a scan and uploads the result.

```bash
cognitivelint upload \
  --server http://127.0.0.1:3848 \
  --token "$UPLOAD_TOKEN" \
  --project-id "$PROJECT_ID" \
  --file report.json
```

## `cognitivelint scan --upload`

Same as scan, then upload with `--server`, `--token`, `--project-id`.

```bash
cognitivelint scan --upload \
  --server http://127.0.0.1:3848 \
  --token "$UPLOAD_TOKEN" \
  --project-id "$PROJECT_ID"
```

## `cognitivelint assert`

Compare two SHAs already uploaded for the project. Uses public `GET /v1/projects/:id/compare` (upload token optional).

**Required:** `--server`, `--project-id`, `--base`, `--head`.

**Exit code 1** when:

- `fail-on-new-high` is enabled (default), and
- `configHash` matches between base and head, and
- head introduces new **high** or **critical** findings.

If config hashes differ, the CLI warns and does **not** fail on new highs (rule/config change).

Typical GitHub Actions pattern:

```bash
cognitivelint upload ...  # head commit
cognitivelint assert \
  --server "$CI_SERVER_URL" \
  --project-id "$PROJECT_ID" \
  --base "${{ github.event.pull_request.base.sha }}" \
  --head "$GITHUB_SHA"
```

## Environment variables (git metadata)

| Variable | Used for |
| --- | --- |
| `GITHUB_SHA` | Run `git.sha` when wrapping a scan report |
| `GITHUB_REF_NAME` / branch detection | `git.branch` via `collectGitMeta()` |

See `packages/cli/src/ci/git.ts` for full behavior.

## Sample files

| File | Use |
| --- | --- |
| `packages/ci-server/examples/report.json` | Scan-shaped JSON for upload tests |
| `packages/ci-server/examples/run.v1.json` | Complete run envelope |

---
"@cognitivelint/a11y": patch
"@cognitivelint/a11y-server": patch
"cognitivelint-a11y": patch
---

Fix TSX accessibility detection by parsing with @typescript-eslint/parser so typed handlers (e.g. UploadTab drag/drop zones) still run jsx-a11y, and harden multiline click-only semantic matching plus Font Awesome icon-only buttons.

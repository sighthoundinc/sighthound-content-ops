# Data

Versioned source-data files used by maintenance scripts.

- `legacy-import/` — the cleaned legacy blog-tracking spreadsheet consumed by
  `scripts/import-legacy-xlsx.mjs` (`npm run import:legacy`). The default path
  can be overridden with the `LEGACY_XLSX_PATH` env var.

Do not put generated output here; generated artifacts belong in gitignored
locations (`reports/`, `results/`).

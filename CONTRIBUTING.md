# Contributing

## Local workflow

Use Node.js 20 or newer, R 4.0 or newer, and Python 3. `npm test` runs the offline parser, escaping, route, and rendering tests. `Rscript tests/export-cran-data.R` checks the base-R metadata exporter. `npm run build` downloads official CRAN inputs with Node's built-in fetch, imports the package RDS locally with R, and generates `dist`; it does not need `npm install`. `npm run check:site`, `python scripts/check_html.py dist`, and `npm run measure` inspect a completed output.

To preview generated pages, use a basic static server, for example `python -m http.server 8000 --directory dist`. Do not deploy the generated tree as a replacement for the entire CRAN archive; see `CRAN_COMPATIBILITY.md`.

## Change guidelines

- Keep core navigation and content functional without JavaScript; limit scripts to optional progressive enhancements.
- Do not add external fonts, stylesheets, or render-blocking resource dependencies.
- Use built-in Node APIs unless a concrete need for a dependency is demonstrated.
- Add fixture-based tests for parsers and HTML output, including hostile markup and malformed input.
- Do not hand-edit generated `dist` files or commit package-index snapshots.
- Do not invent missing CRAN metadata or hard-code release versions.
- Preserve canonical CRAN URL paths and existing download/archive destinations.
- Keep the project clearly labeled as an independent redesign concept.

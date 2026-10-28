# Proposal: a low-risk CRAN web interface pilot

## What the redesign proposes

This project is a static HTML/CSS presentation layer for CRAN's existing package, manual, mirror, download, and policy information. It keeps familiar CRAN routes where they are represented in the prototype and links directly to the official CRAN downloads and sources. Package pages are generated from the official package index; selected official HTML documents are presented inside a shared page shell.

## Problems it addresses

- The current interface is difficult to scan on small screens and does not provide a consistent visual hierarchy.
- Package discovery and platform downloads can be easier to understand while preserving direct access to package names, versions, metadata, manuals, source archives, and binary archives.
- Static output can be served by ordinary web servers or a CDN without a runtime application server.

## What remains unchanged

- CRAN remains the source of package metadata, mirrors, documentation, policies, and installers. This redesign does not change package submission, review, mirroring, or distribution.
- Existing package and download resources remain authoritative. The prototype does not claim to be an official CRAN service.
- The site is generated as HTML and CSS. Client-side JavaScript is optional and limited to progressive package search on the home and package catalog pages; alphabet navigation and package links remain available without it.

## Hosting and infrastructure changes for a pilot

The generated `dist/` tree can be hosted independently on any static web host, reverse proxy, or CDN. The included `deploy/nginx.conf` is an example for a self-hosted Nginx instance. No application server, database, or Node runtime is required to serve the built output. A scheduled build environment needs Node.js and R to download and transform current CRAN inputs; it can publish the finished directory atomically. HTTPS, a pilot hostname, redirects, and cache headers are deployment choices for the hosting operator. DNS or changes to `cran.r-project.org` are not required for a parallel demonstration.

Before adoption, CRAN operators would need to review route ownership, canonical URLs, update cadence, acceptable mirroring and caching behavior, security policy, and operational ownership. Replacing any official route would require coordination with the CRAN team and the current site operators.

## A no-risk evaluation path

1. Build and host the generated output under an isolated hostname or path such as `cran-redesign.example.org`; do not change official DNS or overwrite the current site.
2. Compare representative package, search, manual, mirror, download, and policy tasks with the current CRAN site using the reproducible procedure in `PERFORMANCE.md`.
3. Ask CRAN maintainers and users to review route compatibility, accuracy, accessibility, mobile behavior, and maintenance burden.
4. If a pilot is useful, test a small set of routes behind an operator-controlled staging proxy. Keep the original pages available and make rollback a routing change.
5. Consider broader adoption only after maintainers approve a migration and operational plan.

## Current prototype limits

The static snapshot is refreshed by rebuilding; its freshness depends on the build schedule. Some source directory listings and package archive endpoints intentionally remain direct links to CRAN. Generated documentation depends on the current upstream HTML structure and should be reviewed when CRAN changes those documents. The project is an independent prototype and has not been approved or endorsed by CRAN.

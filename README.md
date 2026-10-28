# CRAN redesign

An English-language redesign concept for the Comprehensive R Archive Network, built with React, TypeScript, and Vite.

## Run locally

```sh
npm install
npm run dev
```

## Production build

```sh
npm run build
npm run preview
```

Platform download cards open redesigned Windows, macOS, and Linux guide pages with links to official CRAN installers and distribution-specific instructions. The complete package index, manuals, mirrors, and contribution links also lead to the official CRAN and R Project services.

The package search queries the public CRAN search API hosted by R-universe, which indexes CRAN packages. Selecting a result opens a package page in this redesign with the package title, full CRAN description, and available metadata. Each page links to the official CRAN package record and related documentation. If the search API is unavailable, the complete official CRAN package index remains linked from the page.

## Assets

The official R logo in public/Rlogo.svg was retrieved from https://cran.r-project.org/Rlogo.svg. R logo information: https://www.r-project.org/logo/. The logo belongs to the R Project; this local redesign concept does not claim to be an official CRAN deployment.

DM Sans and DM Mono are loaded from Google Fonts, with local fallback fonts.

# Design principles

- Keep the current restrained palette, typography hierarchy, and card language while clarifying the most important platform download.
- Make every core route work through ordinary links and forms with JavaScript disabled.
- Use a small optional script only for package search; do not load its data until the visitor submits a query.
- Preserve official CRAN document text and canonical routes when converting HTML pages.
- Keep external static resources out of the render-blocking path. Imported images retain alt text and load lazily.
- Use semantic headings, navigation, main landmarks, lists, tables, and metadata definitions.
- Keep keyboard focus visible, preserve readable line lengths, support 320px layouts, and honor reduced-motion settings.
- Prefer system fonts, local assets, native browser controls, and build-time scripts over runtime services or third-party libraries.
- Source package information and versions from CRAN data; never infer missing metadata.
- Escape generated markup and restrict links derived from package data to HTTP or HTTPS.

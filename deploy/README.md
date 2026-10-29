# Static deployment

Generated HTML now uses page-relative navigation/assets, without `<base>`, so
the same artifact can be mounted at `/`, `/CRAN/` or `/pub/CRAN/`. The search
module resolves its JSON index and result URLs from its own URL. Mount the entire
tree and retain directory-index redirects; opening HTML via `file://` is not a
supported search deployment. Templates remain root-oriented inputs; the build
writer performs the final URL conversion. Existing `dist` must be rebuilt to
receive these changes.

The default build retains central URLs for resources absent from this frontend.
For an approved overlay on a complete CRAN tree, set `CRAN_MIRROR_RESOURCES=1`
before building (PowerShell: `$env:CRAN_MIRROR_RESOURCES='1'`). This converts CRAN
repository/document resource links to page-relative URLs. It does **not** copy
those resources. Provenance links, package metadata URLs, mirror selection,
central monitoring, CRAN Archive and other external services remain external.
Canonical metadata uses central absolute long URLs; CRAN must approve the final
SEO policy, including its recommended short package reference URLs.

Long package paths are ordinary files. `/package=NAME` and versioned shortcuts
need separate server routing; the stock example configs do not supply it. See
[the mirror audit](../CRAN_MIRROR_COMPATIBILITY.md) and its loopback-only example
for prefix-aware rules. They are not evidence of Apache or every mirror's setup.
Adapt cache rules and optional error pages to the mount prefix. Nginx ignores
`_headers`; provider-specific `_headers` path patterns are domain-root patterns
and must be adapted by hosts that consume them under a prefix.

For mirroring, prepare a complete merged authoritative tree, preserving native
resources and removing only previously owned obsolete generated paths. Validate
the whole release before publication. Mirror rsync can expose mixed releases;
retry/rollback and cache policy need an operator agreement. Stable mtimes for
byte-identical output are a proposed publisher improvement, not implemented by
the generator. The builder's two directory renames are not a zero-gap live
publication mechanism. Keep separately retained rollback artifacts.

`dist/` is a publishable frontend, not a complete CRAN repository or mirror. Serving the frontend requires only a static web server; Node.js and R are build-time tools, not runtime requirements. Never synchronize `dist/ --delete` directly over a complete CRAN tree: it omits repository indexes, packages, archives and PDFs.

For an isolated Nginx demo:

1. Run `npm run build` to download current CRAN inputs and generate `dist/`.
2. Copy the complete `dist/` directory to the host as one release. Keep the prior directory until the new one is in place, then switch a symlink or deployment pointer atomically.
3. Adapt `nginx.conf` to the host name, certificate paths, and absolute document root, validate it with `nginx -t`, and reload Nginx. Obtain the TLS certificate through the host's normal certificate process.
4. Check `/`, `/bin/windows/`, `/bin/macosx/`, `/bin/linux/`, `/web/packages/`, `/web/packages/termr/index.html`, `/manuals.html`, `/assets/site.css`, and `/assets/package-search.json` over HTTPS.

Nginx compresses HTML by default and the configuration enables gzip for CSS, JavaScript, JSON, and SVG. HTML and the package-name index use `Cache-Control: public, max-age=300, must-revalidate` so a new package build appears promptly. Other static assets use a one-hour cache. Unknown paths return 404; there is no SPA fallback.

To verify the no-JavaScript fallback after publishing, disable JavaScript in the browser's developer tools and reload `/`. Follow the package catalog link to `/web/packages/`; confirm all 26 alphabet links and package links are available. The homepage and catalog must not request `search.js` or any JSON index while JavaScript is disabled.

The configuration intentionally returns 404 for unknown routes; it does not rewrite every route to the home page. The `_headers` file in `dist/` supports hosts that consume that convention; Nginx uses its explicit configuration instead. Keep deployment on a separate hostname until CRAN operators approve any production routing changes.

## Local Ubuntu WSL test

The standalone `nginx-wsl.conf` serves the workspace's `dist/` on loopback port 8080. It has its own PID and log files under `/tmp` and does not read or alter `/etc/nginx/nginx.conf`:

```powershell
wsl.exe -d Ubuntu -- nginx -t -c /mnt/c/Users/User001/r_site/deploy/nginx-wsl.conf
wsl.exe -d Ubuntu -- nginx -c /mnt/c/Users/User001/r_site/deploy/nginx-wsl.conf
```

Open `http://127.0.0.1:8080/`. Stop only this test instance with:

```powershell
wsl.exe -d Ubuntu -- nginx -s stop -c /mnt/c/Users/User001/r_site/deploy/nginx-wsl.conf
```

For performance measurements, publish a separate copy of `dist/` on WSL's native
ext4 filesystem and point a separate test virtual host at that copy. Keep editing
sources on Windows if preferred. Verify the filesystem with `df -T`: this machine's
`/tmp` is tmpfs, so a copy there does not measure ext4. Do not change the working
8080 instance merely to run a comparison.

The [2026-10-29 investigation](../PERFORMANCE_OPTIMIZATION.md) compares identical
page bytes and Nginx settings on `/mnt/c`, tmpfs and ext4. The Windows-mounted root
produced timeouts under the bounded 50-client test; the native copies did not.
Use a native Linux document root for deployment and measure HTTPS on the actual
host before making capacity claims. This also follows Microsoft's
[WSL file storage guidance](https://learn.microsoft.com/en-us/windows/wsl/filesystems).

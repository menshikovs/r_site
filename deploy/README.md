# Static deployment

`dist/` is the complete publishable site. Serving it requires only a static web server; Node.js and R are build-time tools, not runtime requirements.

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

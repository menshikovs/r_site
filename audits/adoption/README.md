# Adoption feasibility: recorded local experiment

Report: [CRAN_ADOPTION_FEASIBILITY.md](../../CRAN_ADOPTION_FEASIBILITY.md).
No production frontend source/output, existing Nginx config or public service
was changed. The new stand used loopback 8088/8089/8091/8092 and a dedicated PID.

`2026-10-29/` contains input manifests and an archived 30-file official corpus,
public HTTP status evidence, an isolated full build's RDS/DCF, CPU/RAM samples,
complete generated-path inventory, Nginx test configuration, R-client output,
rsync stats, metadata update/rollback results, screenshots and integrity checks.
`.cache/` holds unpublished generated/copy archives and is ignored by Git.

Scripts are specific to the recorded date and checkout. For a fresh experiment,
adapt all result paths and `/var/tmp/cran-adoption-20261029` to unused directories;
never overwrite the retained dataset. Public acquisition is bounded, paced and
does not execute downloaded source/binary packages. Reuse the archived official
corpus when repeating the routing tests instead of downloading it again.

Recorded preparation/verification:

1. `measure-build.ps1` invokes the existing fetch/build functions with separate
   output, monitors descendants, and retains only this new run's RDS/DCF.
2. `sources.mjs` + `resources.mjs` prepare a limited official corpus and URL audit.
3. `inventory.mjs` hashes original/generated/production files, records intentional
   collisions and validates the overlay paths using `policy.mjs`.
4. `check-isolated.mjs` runs the unchanged full checker against the isolated build
   by substituting only its output root and absolute source import in memory.
5. Windows `tar` prepares production/candidate archives excluding `_headers`.
   `setup.sh` extracts them into native ext4 merged releases, preserves originals,
   creates a controlled relative-symlink/deleted-page fixture, and starts Nginx.
6. `probe.mjs` tests canonical/source/archive/404/range behavior, real local
   `available.packages()`, same-file preservation, local mirror sync, a real
   metadata page update, pointer switch, deletion and rollback, and no-JS UI.
7. `verify.mjs` checks retained evidence and re-hashes production/source files.

The first preparation was interrupted while using slow cross-OS file-wise rsync;
`continue-setup.sh` completed it by native archive extraction. `setup.sh` now uses
that efficient method directly. Preparation/Location test issues are retained in
`preparation-note.txt` and the partial pilot JSON. They are not findings about CRAN.

`switch.sh` accepts only `r1`, `r2`, `mirror`, `verify`, uses a constant isolated
root, and never contacts public rsync. Its `--delete` applies only to the local
test mirror. The Nginx config and canonical rewrite rules are a local engineering
model; they must not be described as CRAN's private configuration.

After testing, stop only the stand:

```powershell
wsl.exe -d Ubuntu -- nginx -s quit -c /mnt/c/Users/User001/r_site/audits/adoption/2026-10-29/stand-nginx.conf
```

Original/merged test files remain for review. Full-tree adoption, concurrent native
publishing, all mirrors/permissions, legacy index fallback forms, remote rsync wire
volume and production HTTPS/cache rules remain outside this limited experiment.

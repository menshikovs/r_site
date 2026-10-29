#!/bin/sh
set -eu
r=/var/tmp/cran-mirrors-20261029
w=/mnt/c/Users/User001/r_site
[ "$(realpath -m "$r")" = /var/tmp/cran-mirrors-20261029 ] || exit 1
[ ! -e "$r/unsafe-negative" ] || exit 1
mkdir -p "$r/unsafe-negative" "$r/overlay-only"
cp -a /var/tmp/cran-adoption-20261029/original/. "$r/unsafe-negative/"
cp -a "$w/audits/mirrors/.cache/a/." "$r/overlay-only/"
rsync -rptlzvi --delete --stats "$r/overlay-only/" "$r/unsafe-negative/" > "$w/audits/mirrors/2026-10-29/unsafe-overlay-negative.txt"
for path in src/contrib/PACKAGES.rds src/contrib/termr_1.0.1.tar.gz web/packages/termr/termr.pdf bin/windows/contrib/4.6/termr_1.0.1.zip; do
 [ ! -e "$r/unsafe-negative/$path" ] || exit 1
done
printf 'Negative confirmed: raw overlay --delete removed repository index, source, PDF and binary in disposable copies only.\n' >> "$w/audits/mirrors/2026-10-29/unsafe-overlay-negative.txt"

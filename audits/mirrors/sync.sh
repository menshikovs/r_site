#!/bin/sh
set -eu
r=/var/tmp/cran-mirrors-20261029
[ "$(realpath -m "$r")" = /var/tmp/cran-mirrors-20261029 ] || exit 1
case "${1:-}" in
 a|b)
  rsync -rptlzvi --delete --stats "$r/releases/$1/" "$r/mirror/"
  ;;
 interrupted)
  # A deterministic interrupted-publication state: one transfer succeeds, the
  # following source is unavailable. This is not a network failure simulation.
  rsync -rt "$r/releases/b/web/packages/ggplot2/index.html" "$r/mirror/web/packages/ggplot2/index.html"
  rsync -rt "$r/releases/b/INTENTIONALLY_MISSING" "$r/mirror/"
  ;;
 *) exit 2;;
esac

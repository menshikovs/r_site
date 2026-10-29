#!/bin/sh
set -eu
root=/var/tmp/cran-adoption-20261029
case "${1:-}" in
  r1|r2)
    [ -d "$root/releases/$1" ]
    ln -s "releases/$1" "$root/current-next"
    mv -Tf "$root/current-next" "$root/current"
    ;;
  mirror)
    rsync -a --delete --stats "$root/current/" "$root/mirror/"
    ;;
  verify)
    cd "$root/original"
    find . -type f -print0 | sort -z | xargs -0 sha256sum
    ;;
  *) exit 1 ;;
esac

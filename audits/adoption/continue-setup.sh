#!/bin/sh
# Native extraction avoids thousands of slow cross-OS small-file reads.
set -eu
workspace=/mnt/c/Users/User001/r_site
root=/var/tmp/cran-adoption-20261029
out="$workspace/audits/adoption/2026-10-29"
[ "$(realpath "$root")" = /var/tmp/cran-adoption-20261029 ] || exit 1
tar -xf "$workspace/audits/adoption/.cache/production.tar" -C "$root/releases/r1"
tar -xf "$workspace/audits/adoption/.cache/candidate.tar" -C "$root/releases/r2"
tar -xf "$workspace/audits/adoption/.cache/candidate.tar" -C "$root/dist-only"
cp -a "$root/original/." "$root/mirror/"
# The interrupted preparation never reached this point; finish only the
# configuration portion of the checked-in setup script, without deleting files.
sed -n '/^mkdir -p "\$root\/releases\/r1\/_adoption-fixtures"/,$p' "$workspace/audits/adoption/setup.sh" > "$root/finish-setup.sh"
. "$root/finish-setup.sh"

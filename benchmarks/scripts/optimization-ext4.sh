#!/bin/sh
set -eu
cd /mnt/c/Users/User001/r_site
out=${BENCHMARK_RESULT_DIR:-benchmarks/results/2026-10-29-optimization}
[ ! -e "$out/ext4-filesystem.txt" ] || { echo 'Choose a fresh BENCHMARK_RESULT_DIR' >&2; exit 1; }
native=/var/tmp/cran-optimization-20261029
mkdir -p "$native/original" "$native/redesign"
tar -xzf benchmarks/results/2026-10-28/original-snapshot.tar.gz -C "$native/original"
tar -xzf benchmarks/results/2026-10-28/candidate-snapshot.tar.gz -C "$native/redesign"
sed -e 's@/tmp/cran-optimization-20261029/@/var/tmp/cran-optimization-20261029/@g' "$out/nginx-native.conf" > "$out/nginx-ext4.conf"
# Same ports, process count and all HTTP settings, changed roots only.
nginx -s quit -c "/mnt/c/Users/User001/r_site/$out/nginx-native.conf"
sleep 1
nginx -t -c "/mnt/c/Users/User001/r_site/$out/nginx-ext4.conf"
nginx -c "/mnt/c/Users/User001/r_site/$out/nginx-ext4.conf"
df -T "$native" > "$out/ext4-filesystem.txt"
find "$native" -type f -exec sha256sum {} + > "$out/ext4-file-hashes.txt"

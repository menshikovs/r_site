#!/bin/sh
set -eu
cd /mnt/c/Users/User001/r_site
out=${BENCHMARK_RESULT_DIR:-benchmarks/results/2026-10-29-optimization}
[ ! -e "$out/environment-wsl.txt" ] || { echo 'Choose a fresh BENCHMARK_RESULT_DIR' >&2; exit 1; }
mkdir -p "$out"
native=/tmp/cran-optimization-20261029
mkdir -p "$native/original" "$native/redesign"
tar -xzf benchmarks/results/2026-10-28/original-snapshot.tar.gz -C "$native/original"
tar -xzf benchmarks/results/2026-10-28/candidate-snapshot.tar.gz -C "$native/redesign"
sed -e 's/8081/8083/g' -e 's/8082/8084/g' -e 's@/tmp/cran-comparison-nginx@/tmp/cran-optimization-nginx@g' -e "s@/mnt/c/Users/User001/r_site/benchmarks/.cache/original@$native/original@g" -e "s@/mnt/c/Users/User001/r_site/dist@$native/redesign@g" benchmarks/nginx-comparison.conf > "$out/nginx-native.conf"
nginx -t -c "/mnt/c/Users/User001/r_site/$out/nginx-native.conf"
nginx -c "/mnt/c/Users/User001/r_site/$out/nginx-native.conf"
{
  date -Is
  nginx -V 2>&1
  uname -a
  free -b
  getconf CLK_TCK
  for pidfile in /tmp/cran-comparison-nginx.pid /tmp/cran-optimization-nginx.pid; do
    master=$(cat "$pidfile")
    echo "$pidfile master=$master"
    cat "/proc/$master/limits"
    for child in $(cat "/proc/$master/task/$master/children"); do cat "/proc/$child/limits"; done
  done
  df -T /mnt/c "$native"
  journalctl -p err -n 20 --no-pager 2>&1 || true
} > "$out/environment-wsl.txt"
for port in 8081 8082 8083 8084; do curl -sI "http://127.0.0.1:$port/"; done > "$out/headers.txt"

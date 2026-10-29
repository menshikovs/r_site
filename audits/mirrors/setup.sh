#!/bin/sh
set -eu
w=/mnt/c/Users/User001/r_site
r=/var/tmp/cran-mirrors-20261029
o="$w/audits/mirrors/2026-10-29"
[ "$(realpath -m "$r")" = /var/tmp/cran-mirrors-20261029 ] || exit 1
[ ! -e "$r/ready" ] || { echo 'Refusing to overwrite a completed stand'; exit 1; }
mkdir -p "$r/full" "$r/releases/a" "$r/releases/b" "$r/mirror" "$r/baselineB" "$r/baselineC" "$r/mountB/pub" "$r/mountC/pub"
cp -a /var/tmp/cran-adoption-20261029/original/. "$r/full/"
node "$w/audits/mirrors/native-full.mjs"
for release in a b; do
  cp -a /var/tmp/cran-adoption-20261029/original/. "$r/releases/$release/"
  cp -a "$w/audits/mirrors/.cache/$release/." "$r/releases/$release/"
done
node "$w/audits/mirrors/stamp-fixtures.mjs"
ln -s "$r/full" "$r/mountB/CRAN"
ln -s "$r/full" "$r/mountC/pub/CRAN"
ln -s /var/tmp/cran-adoption-20261029/releases/r2 "$r/baselineB/CRAN"
mkdir -p "$r/baselineC/pub"
ln -s /var/tmp/cran-adoption-20261029/releases/r2 "$r/baselineC/pub/CRAN"
for d in "$r/full" "$r/mountB" "$r/mountC" "$r/mirror"; do
  printf '<!doctype html><html lang="en"><title>404</title><h1>Not found</h1><p>Local stand static error fixture.</p></html>\n' > "$d/__mirror-404.html"
done
df -T "$r" > "$o/filesystem.txt"
cat > "$o/nginx.conf" <<EOF
worker_processes 1;
pid /tmp/cran-mirrors-8101.pid;
error_log /tmp/cran-mirrors-8101-error.log warn;
events { worker_connections 256; }
http {
 include /etc/nginx/mime.types;
 default_type application/octet-stream;
 access_log off;
 index index.html;
 autoindex on;
EOF
for spec in '8101 full' '8102 mountB' '8103 mountC' '8104 mirror' '8111 /var/tmp/cran-adoption-20261029/releases/r2' '8112 baselineB' '8113 baselineC'; do
  set -- $spec
  port=$1; directory=$2
  case "$directory" in /*) ;; *) directory="$r/$directory";; esac
  printf 'server { listen 127.0.0.1:%s; root %s;\n' "$port" "$directory" >> "$o/nginx.conf"
  if [ "$port" -lt 8110 ]; then
    cat >> "$o/nginx.conf" <<'EOF'
 error_page 404 /__mirror-404.html;
 location ~ ^(?<mount>/(?:pub/)?CRAN)?/package=(?<pkg>[A-Za-z][A-Za-z0-9.]*)&version=(?<ver>[A-Za-z0-9.+-]+)$ {
   if (-f $document_root$mount/src/contrib/${pkg}_${ver}.tar.gz) { return 303 $mount/src/contrib/${pkg}_${ver}.tar.gz; }
   if (-f $document_root$mount/src/contrib/Archive/$pkg/${pkg}_${ver}.tar.gz) { return 303 $mount/src/contrib/Archive/$pkg/${pkg}_${ver}.tar.gz; }
   return 404;
 }
 location ~ ^(?<mount>/(?:pub/)?CRAN)?/package=(?<pkg>[A-Za-z][A-Za-z0-9.]*)$ {
   if (!-f $document_root$mount/web/packages/$pkg/index.html) { return 404; }
   return 303 $mount/web/packages/$pkg/index.html;
 }
EOF
  fi
  printf 'location / { try_files $uri $uri/ =404; }\n}\n' >> "$o/nginx.conf"
done
printf '}\n' >> "$o/nginx.conf"
nginx -t -c "$o/nginx.conf"
nginx -c "$o/nginx.conf"
touch "$r/ready"

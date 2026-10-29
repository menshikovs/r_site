#!/bin/sh
set -eu
workspace=/mnt/c/Users/User001/r_site
root=/var/tmp/cran-adoption-20261029
out="$workspace/audits/adoption/2026-10-29"
[ "$(realpath -m "$root")" = /var/tmp/cran-adoption-20261029 ] || exit 1
[ ! -e "$root" ] || { echo 'Use a fresh stand directory' >&2; exit 1; }
mkdir -p "$root/original" "$root/releases/r1" "$root/releases/r2" "$root/mirror" "$root/dist-only"
cp -a "$workspace/audits/adoption/.cache/original/." "$root/original/"
cp -a "$root/original/." "$root/releases/r1/"
cp -a "$root/original/." "$root/releases/r2/"
tar -xf "$workspace/audits/adoption/.cache/production.tar" -C "$root/releases/r1"
tar -xf "$workspace/audits/adoption/.cache/candidate.tar" -C "$root/releases/r2"
tar -xf "$workspace/audits/adoption/.cache/candidate.tar" -C "$root/dist-only"
cp -a "$root/original/." "$root/mirror/"
mkdir -p "$root/releases/r1/_adoption-fixtures" "$root/releases/r2/_adoption-fixtures"
printf 'Local retired-page fixture, not CRAN content\n' > "$root/releases/r1/_adoption-fixtures/retired.html"
ln -s ../src/contrib/termr_1.0.1.tar.gz "$root/releases/r1/_adoption-fixtures/source-link.tar.gz"
ln -s ../src/contrib/termr_1.0.1.tar.gz "$root/releases/r2/_adoption-fixtures/source-link.tar.gz"
ln -s releases/r1 "$root/current"
df -T "$root" > "$out/stand-filesystem.txt"
du -s -B1 "$root"/* > "$out/stand-disk.txt"
cat > "$out/stand-nginx.conf" <<'EOF'
worker_processes 1;
pid /tmp/cran-adoption-8088.pid;
error_log /tmp/cran-adoption-8088-error.log warn;
events { worker_connections 256; }
http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  access_log off;
  sendfile on;
  index index.html;
  autoindex on;
  server {
    listen 127.0.0.1:8088;
    root /var/tmp/cran-adoption-20261029/current;
    include /mnt/c/Users/User001/r_site/audits/adoption/2026-10-29/canonical-locations.conf;
    location / { try_files $uri $uri/ =404; }
  }
  server {
    listen 127.0.0.1:8089;
    root /var/tmp/cran-adoption-20261029/mirror;
    include /mnt/c/Users/User001/r_site/audits/adoption/2026-10-29/canonical-locations.conf;
    location / { try_files $uri $uri/ =404; }
  }
  server {
    listen 127.0.0.1:8091;
    location /CRAN/ { alias /var/tmp/cran-adoption-20261029/current/; }
    location / { return 404; }
  }
  server {
    listen 127.0.0.1:8092;
    root /var/tmp/cran-adoption-20261029/dist-only;
    location / { try_files $uri $uri/ =404; }
  }
}
EOF
cat > "$out/canonical-locations.conf" <<'EOF'
# Local engineering model derived from public URL contracts. Not CRAN config.
location ~ ^/package=(?<package>[A-Za-z][A-Za-z0-9.]*)&version=(?<version>[A-Za-z0-9.+-]+)$ {
  if (-f $document_root/src/contrib/${package}_${version}.tar.gz) {
    return 303 /src/contrib/${package}_${version}.tar.gz;
  }
  if (-f $document_root/src/contrib/Archive/$package/${package}_${version}.tar.gz) {
    return 303 /src/contrib/Archive/$package/${package}_${version}.tar.gz;
  }
  return 404;
}
location ~ ^/package=(?<package>[A-Za-z][A-Za-z0-9.]*)$ {
  if (!-f $document_root/web/packages/$package/index.html) { return 404; }
  return 303 /web/packages/$package/index.html;
}
EOF
nginx -t -c "$out/stand-nginx.conf"
nginx -c "$out/stand-nginx.conf"
nginx -v 2> "$out/nginx-version.txt"
rsync --version | head -4 > "$out/rsync-version.txt"

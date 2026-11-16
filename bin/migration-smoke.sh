#!/usr/bin/env bash
# Upgrade smoke test for the book-support fork.
#
# Boots OLD_IMAGE on an empty config volume so it creates the schema it ships,
# seeds one book request, then boots NEW_IMAGE on the same volume and reads the
# request back through the API. Fails when NEW_IMAGE's migrations crash on a
# book-support database, or drop the book columns or rows.
#
# Usage: bin/migration-smoke.sh <old-image> <new-image>
set -euo pipefail

old_image=${1:?usage: migration-smoke.sh <old-image> <new-image>}
new_image=${2:?usage: migration-smoke.sh <old-image> <new-image>}

name=seerr-migration-smoke
volume=$name-config
port=15055

cleanup() {
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

# Starts an image on the shared config volume and waits for it to serve requests.
start() {
  docker run -d --name "$name" -p "127.0.0.1:$port:5055" \
    -v "$volume:/app/config" "$1" >/dev/null

  for _ in $(seq 60); do
    if curl -fsS "http://127.0.0.1:$port/api/v1/status" >/dev/null 2>&1; then
      return
    fi
    if [[ $(docker inspect -f '{{.State.Running}}' "$name") != true ]]; then
      break
    fi
    sleep 2
  done

  echo "::error::$1 did not start on the smoke-test database"
  docker logs "$name"
  exit 1
}

echo "Creating a database with $old_image"
start "$old_image"
docker rm -f "$name" >/dev/null

echo "Seeding a book request"
docker run --rm -i -v "$volume:/config" alpine:3.23 sh -ec '
  apk add --no-cache -q sqlite
  sqlite3 -bail /config/db/db.sqlite3
  chown -R 1000:1000 /config/db
' <<'SQL'
INSERT INTO "user" ("id", "email", "username", "permissions", "avatar", "bookQuotaLimit", "bookQuotaDays")
  VALUES (1, 'smoke@example.invalid', 'smoke', 2, '', 7, 30);
INSERT INTO "media" ("id", "mediaType", "hcId", "status", "statusAlt")
  VALUES (1, 'book', 4242, 3, 1);
INSERT INTO "media_request" ("id", "status", "type", "mediaId", "requestedById", "isAlt", "metadataProfileId")
  VALUES (1, 2, 'book', 1, 1, 0, 9);
SQL

echo "Upgrading to $new_image"
start "$new_image"

echo "Reading the book request back"
docker exec -i "$name" node - <<'JS'
const assert = require('node:assert/strict');
const { main } = require('/app/config/settings.json');

(async () => {
  const res = await fetch(
    'http://127.0.0.1:5055/api/v1/request?mediaType=book',
    { headers: { 'X-API-Key': main.apiKey } }
  );
  const body = await res.text();
  assert.equal(res.status, 200, body);

  const [request] = JSON.parse(body).results;
  assert.deepEqual(
    {
      type: request?.type,
      hcId: request?.media?.hcId,
      metadataProfileId: request?.metadataProfileId,
    },
    { type: 'book', hcId: 4242, metadataProfileId: 9 }
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
JS

echo "Book data survived the upgrade"

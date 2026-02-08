#!/bin/bash
# Initialize MinIO buckets for SiteBuilder

set -e

MINIO_HOST=${MINIO_HOST:-"localhost:9000"}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-"minioadmin"}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-"minioadmin"}

echo "Waiting for MinIO to be ready..."
until curl -sf "http://${MINIO_HOST}/minio/health/live" > /dev/null 2>&1; do
  echo "MinIO is not ready yet. Waiting..."
  sleep 2
done
echo "MinIO is ready!"

# Configure mc (MinIO Client) alias
mc alias set sitebuilder "http://${MINIO_HOST}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}"

# Create buckets
BUCKETS=("scraped-assets" "site-media" "snapshots" "exports")

for bucket in "${BUCKETS[@]}"; do
  if mc ls sitebuilder/${bucket} > /dev/null 2>&1; then
    echo "Bucket '${bucket}' already exists"
  else
    echo "Creating bucket '${bucket}'..."
    mc mb sitebuilder/${bucket}
    echo "Bucket '${bucket}' created"
  fi
done

echo "MinIO initialization complete!"
echo "Buckets created: ${BUCKETS[*]}"

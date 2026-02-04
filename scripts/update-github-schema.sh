#!/bin/bash
# Download GitHub's REST API OpenAPI specification
# Run with: npm run schema:update

set -e

mkdir -p schemas

echo "Downloading GitHub REST API OpenAPI spec..."
curl -sS -o schemas/github-api.yaml \
  https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.yaml

echo "Schema downloaded to schemas/github-api.yaml"

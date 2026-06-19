#!/usr/bin/env bash
set -euo pipefail

if [ -z "${FONTAWESOME_PACKAGE_TOKEN:-}" ]; then
  echo "::error::FONTAWESOME_PACKAGE_TOKEN is not configured."
  echo "::error::Add a Font Awesome Package Token at Settings → Secrets and variables → Actions."
  echo "::error::Create one at https://fontawesome.com/account/general (Package Token section)."
  exit 1
fi

pnpm config set @awesome.me:registry https://npm.fontawesome.com/
pnpm config set @fortawesome:registry https://npm.fontawesome.com/
pnpm config set //npm.fontawesome.com/:_authToken "$FONTAWESOME_PACKAGE_TOKEN"

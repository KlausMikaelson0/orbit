#!/usr/bin/env bash
set -euo pipefail

echo "==> Orbit deployment preflight"
echo "Node: $(node -v)"
echo "NPM:  $(npm -v)"

if ! command -v vercel >/dev/null 2>&1; then
  echo "Vercel CLI not found. Install with: npm i -g vercel"
  exit 1
fi

echo "==> Running quality gates"
npm run lint
npm run build

echo "==> Deploying to Vercel production"
vercel --prod

echo "==> Deployment complete"

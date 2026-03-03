#!/bin/sh
set -e

on_exit() {
  code=$?
  if [ "$code" -ne 0 ]; then
    echo "validate-build failed" >&2
  fi
}
trap on_exit EXIT

if [ ! -x node_modules/.bin/tsc ] || [ ! -x node_modules/.bin/vite ]; then
  npm install --include=dev
fi

npm run build

if [ ! -d dist ]; then
  echo "dist/ was not generated" >&2
  exit 1
fi

echo "validate-build: dist/ exists"

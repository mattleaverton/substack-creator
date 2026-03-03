#!/bin/sh
set -e

on_exit() {
  code=$?
  if [ "$code" -ne 0 ]; then
    echo "validate-fmt failed" >&2
  fi
}
trap on_exit EXIT

npx prettier --check src/

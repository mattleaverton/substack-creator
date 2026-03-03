#!/bin/sh
set -e

on_exit() {
  code=$?
  if [ "$code" -ne 0 ]; then
    echo "fix-fmt failed" >&2
  fi
}
trap on_exit EXIT

npx prettier --write src/

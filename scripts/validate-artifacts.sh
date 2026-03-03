#!/bin/sh
set -e

MANIFEST_PATH=".ai/test-evidence/latest/manifest.json"
DOD_PATH=".ai/runs/01KJRQBB636W0FPZX0T4N46MFF/definition_of_done.md"

on_exit() {
  code=$?
  if [ "$code" -ne 0 ]; then
    echo "validate-artifacts failed" >&2
  fi
}
trap on_exit EXIT

if [ ! -f "$MANIFEST_PATH" ]; then
  echo "manifest missing: $MANIFEST_PATH" >&2
  exit 1
fi

if [ ! -f "$DOD_PATH" ]; then
  echo "DoD missing: $DOD_PATH" >&2
  exit 1
fi

expected_ids=$(grep -o 'IT-[0-9][0-9]*' "$DOD_PATH" | sort -u)
manifest_ids=$(grep -o '"IT-[0-9][0-9]*"' "$MANIFEST_PATH" | tr -d '"' | sort -u)

if [ "$expected_ids" != "$manifest_ids" ]; then
  echo "Scenario IDs mismatch between DoD and manifest" >&2
  echo "Expected:" >&2
  echo "$expected_ids" >&2
  echo "Found:" >&2
  echo "$manifest_ids" >&2
  exit 1
fi

echo "Artifact manifest scenario IDs match DoD"

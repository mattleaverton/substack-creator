#!/bin/sh
set -e

EVIDENCE_DIR=".ai/test-evidence/latest"
MANIFEST_PATH="$EVIDENCE_DIR/manifest.json"
mkdir -p "$EVIDENCE_DIR"

integration_status="pass"
smoke_status="pass"
overall=0

on_exit() {
  code=$?
  if [ "$code" -ne 0 ]; then
    echo "validate-test failed" >&2
  fi
}
trap on_exit EXIT

if npm run test:integration >"$EVIDENCE_DIR/integration.log" 2>&1; then
  integration_status="pass"
else
  integration_status="fail"
  smoke_status="skipped"
  overall=1
fi

if [ "$integration_status" = "pass" ]; then
  if npm run test:smoke >"$EVIDENCE_DIR/smoke.log" 2>&1; then
    smoke_status="pass"
  else
    smoke_status="fail"
    overall=1
  fi
fi

cat >"$MANIFEST_PATH" <<JSON
{
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "scenarios": [
    {"id": "IT-1", "status": "not_run", "artifacts": [{"type": "log", "path": "$EVIDENCE_DIR/integration.log"}], "summary": "Build/deploy readiness is reviewed separately."},
    {"id": "IT-2", "status": "not_run", "artifacts": [], "summary": "Browser coverage is handled by validate-browser."},
    {"id": "IT-3", "status": "not_run", "artifacts": [], "summary": "Browser coverage is handled by validate-browser."},
    {"id": "IT-4", "status": "not_run", "artifacts": [], "summary": "Browser coverage is handled by validate-browser."},
    {"id": "IT-5", "status": "not_run", "artifacts": [], "summary": "Browser coverage is handled by validate-browser."},
    {"id": "IT-6", "status": "not_run", "artifacts": [], "summary": "Browser coverage is handled by validate-browser."},
    {"id": "IT-7", "status": "not_run", "artifacts": [], "summary": "Browser coverage is handled by validate-browser."},
    {"id": "IT-8", "status": "not_run", "artifacts": [], "summary": "Browser coverage is handled by validate-browser."},
    {"id": "IT-9", "status": "$integration_status", "artifacts": [{"type": "log", "path": "$EVIDENCE_DIR/integration.log"}], "summary": "Structured output retry/backoff validation in integration tests."},
    {"id": "IT-10", "status": "$smoke_status", "artifacts": [{"type": "log", "path": "$EVIDENCE_DIR/smoke.log"}], "summary": "Integration runs before smoke; smoke uses lite model."},
    {"id": "IT-11", "status": "not_run", "artifacts": [], "summary": "Demo cache-miss path validated in integration test and browser checks."},
    {"id": "IT-12", "status": "not_run", "artifacts": [], "summary": "Visual checks covered in browser suite."}
  ]
}
JSON

exit "$overall"

#!/usr/bin/env bash
# Bulk-load seed corpus via the real ingest path (POST /api/events).
# Requires the API to be reachable; worker must be running separately to lodge matches.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORPUS_DIR="${SCRIPT_DIR}/corpus"
BASE_URL="${BASE_URL:-http://127.0.0.1:7871}"
EVENTS_URL="${BASE_URL%/}/api/events"

if [[ ! -d "${CORPUS_DIR}" ]]; then
  echo "error: corpus directory not found: ${CORPUS_DIR}" >&2
  exit 1
fi

shopt -s nullglob
files=("${CORPUS_DIR}"/*.json)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "error: no JSON fixtures in ${CORPUS_DIR}" >&2
  exit 1
fi

accepted=0
duplicates=0
failures=0

echo "Loading ${#files[@]} fixtures → ${EVENTS_URL}"

for file in "${files[@]}"; do
  name="$(basename "${file}")"
  # Capture body and write HTTP status on the last line.
  response="$(
    curl -sS -w "\n%{http_code}" -X POST "${EVENTS_URL}" \
      -H 'Content-Type: application/json' \
      --data-binary @"${file}"
  )"
  status="${response##*$'\n'}"
  body="${response%$'\n'*}"

  case "${status}" in
    202)
      accepted=$((accepted + 1))
      echo "  ${name}: 202 accepted"
      ;;
    409)
      duplicates=$((duplicates + 1))
      echo "  ${name}: 409 DUPLICATE_SNAPSHOT"
      ;;
    *)
      failures=$((failures + 1))
      echo "  ${name}: ${status} FAILED — ${body}" >&2
      ;;
  esac
done

echo
echo "Summary: accepted=${accepted} duplicates=${duplicates} failures=${failures} total=${#files[@]}"

if [[ "${failures}" -gt 0 ]]; then
  exit 1
fi

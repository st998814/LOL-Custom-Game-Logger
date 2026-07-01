#!/usr/bin/env bash
# Initialize the ideas directory for idea-refine skill output.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
IDEAS_DIR="${ROOT}/docs/ideas"

mkdir -p "${IDEAS_DIR}"

if [[ ! -f "${IDEAS_DIR}/.gitkeep" ]]; then
  touch "${IDEAS_DIR}/.gitkeep"
fi

echo "Ideas directory ready: ${IDEAS_DIR}"

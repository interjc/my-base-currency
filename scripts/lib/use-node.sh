#!/usr/bin/env bash

set -euo pipefail

node_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${node_script_dir}/../.." && pwd)"

if [[ -n "${NVM_DIR:-}" && -s "${NVM_DIR}/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  source "${NVM_DIR}/nvm.sh"
elif [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  source "${HOME}/.nvm/nvm.sh"
else
  echo "nvm was not found. Install nvm before running project scripts." >&2
  exit 1
fi

cd "${PROJECT_ROOT}"
nvm use --silent

# Some managed shells prepend their own Node shim after `nvm use`. Resolve the
# selected nvm executable explicitly so every wrapper really uses `.nvmrc`.
selected_node_path="$(nvm which "$(tr -d '[:space:]' < "${PROJECT_ROOT}/.nvmrc")")"
export PATH="$(dirname "${selected_node_path}"):${PATH}"
export WRANGLER_LOG_PATH="${WRANGLER_LOG_PATH:-${PROJECT_ROOT}/.wrangler/logs}"
export MINIFLARE_REGISTRY_PATH="${MINIFLARE_REGISTRY_PATH:-${PROJECT_ROOT}/.wrangler/registry}"
hash -r

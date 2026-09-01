#!/usr/bin/env bash

set -euo pipefail

web_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${web_script_dir}/../lib/use-node.sh"

if [[ $# -gt 0 ]]; then
  exec pnpm --filter @base-money/web run deploy -- "$@"
fi
exec pnpm --filter @base-money/web run deploy

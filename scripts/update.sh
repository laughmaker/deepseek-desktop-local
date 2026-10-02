#!/bin/bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$project_root/scripts/manage.mjs" "$@"

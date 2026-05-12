#!/bin/sh
set -eu

API_URL="${API_URL:-http://localhost:4000}"
WEB_URL="${WEB_URL:-http://localhost:3019}"

check_url() {
  url="$1"
  attempts="${2:-20}"
  index=1

  while [ "$index" -le "$attempts" ]; do
    if curl --fail --silent --show-error "$url" >/dev/null; then
      return 0
    fi
    echo "Waiting for ${url} (${index}/${attempts})"
    sleep 2
    index=$((index + 1))
  done

  curl --fail --silent --show-error "$url" >/dev/null
}

echo "Checking API health: ${API_URL}/health"
check_url "${API_URL}/health"

echo "Checking web console: ${WEB_URL}"
check_url "${WEB_URL}"

echo "Checking key API resources"
check_url "${API_URL}/api/dashboard/summary"
check_url "${API_URL}/api/servers"
check_url "${API_URL}/api/roles/summary"

echo "Smoke test passed"

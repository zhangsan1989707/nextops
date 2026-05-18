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

echo "Checking Agent registration and metrics"
curl --fail --silent --show-error \
  --request POST \
  --header "Content-Type: application/json" \
  --data '{
    "agentId":"smoke-local-agent",
    "hostname":"smoke-localhost",
    "ip":"127.0.0.1",
    "os":"SmokeOS",
    "environment":"local",
    "version":"0.1.0",
    "tags":["local","smoke"],
    "inventory":{
      "kernel":"smoke-kernel",
      "cpuModel":"smoke-cpu",
      "cpuCores":4,
      "memoryTotalMb":8192,
      "diskTotalGb":256,
      "uptimeSeconds":3600,
      "networkCards":["lo0"],
      "bootTime":"2026-05-13T00:00:00.000Z"
    }
  }' \
  "${API_URL}/api/agents/register" >/dev/null
curl --fail --silent --show-error \
  --request POST \
  --header "Content-Type: application/json" \
  --data '{"cpuUsage":11,"memoryUsage":22,"diskUsage":33,"loadAvg":1.1}' \
  "${API_URL}/api/agents/smoke-local-agent/metrics" >/dev/null
curl --fail --silent --show-error "${API_URL}/api/servers/srv-local-smoke-localhost" | node -e '
  let body = "";
  process.stdin.on("data", (chunk) => { body += chunk; });
  process.stdin.on("end", () => {
    const result = JSON.parse(body);
    if (result.dataMode !== "agent_metrics" || result.cpuUsage !== 11 || result.realtime.length === 0) {
      console.error("Invalid agent-backed server detail", result);
      process.exit(1);
    }
  });
'

echo "Checking AI diagnosis response"
curl --fail --silent --show-error \
  --request POST \
  --header "Content-Type: application/json" \
  --data '{}' \
  "${API_URL}/api/servers/srv-prod-db-01/diagnose" | node -e '
    let body = "";
    process.stdin.on("data", (chunk) => { body += chunk; });
    process.stdin.on("end", () => {
      const result = JSON.parse(body);
      const valid =
        typeof result.summary === "string" &&
        Array.isArray(result.evidence) &&
        Array.isArray(result.repairPlan) &&
        (result.mode === "model" || result.mode === "local_fallback");
      if (!valid) {
        console.error("Invalid diagnosis response", result);
        process.exit(1);
      }
    });
  '

echo "Checking ChatOps plan response"
curl --fail --silent --show-error \
  --request POST \
  --header "Content-Type: application/json" \
  --data '{"message":"/diagnose alert alt-001","useModel":false}' \
  "${API_URL}/api/chatops/message" | node -e '
    let body = "";
    process.stdin.on("data", (chunk) => { body += chunk; });
    process.stdin.on("end", () => {
      const result = JSON.parse(body);
      const valid =
        typeof result.taskId === "string" &&
        typeof result.intent === "string" &&
        Array.isArray(result.plan) &&
        result.executionMode === "planned_only" &&
        (result.mode === "model" || result.mode === "rule_fallback");
      if (!valid) {
        console.error("Invalid ChatOps response", result);
        process.exit(1);
      }
    });
  '

echo "Checking ChatOps stream response"
stream_output="$(curl --fail --silent --show-error \
  --request POST \
  --header "Content-Type: application/json" \
  --data '{"message":"/diagnose alert alt-001","useModel":false}' \
  "${API_URL}/api/chatops/stream")"
printf "%s" "${stream_output}" | grep "event: chunk" >/dev/null
printf "%s" "${stream_output}" | grep "event: done" >/dev/null

echo "Smoke test passed"

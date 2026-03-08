#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8787}"
API_KEY="${API_KEY:-dev-openclaw-key}"
MODEL="${MODEL:-openclaw-reia-mock}"

AUTH_HEADER=()
if [[ -n "${API_KEY}" ]]; then
  AUTH_HEADER=(-H "Authorization: Bearer ${API_KEY}")
fi

echo "== health =="
curl -sS "${BASE_URL}/health" | jq .

echo "== models =="
curl -sS "${BASE_URL}/v1/models" "${AUTH_HEADER[@]}" | jq .

echo "== chat completion (non-stream) =="
curl -sS "${BASE_URL}/v1/chat/completions" \
  "${AUTH_HEADER[@]}" \
  -H "Content-Type: application/json" \
  -d "$(jq -nc --arg model "${MODEL}" '{model:$model,messages:[{role:"user",content:"hello bridge"}]}')" | jq .

echo "== chat completion (stream) =="
curl -sS -N "${BASE_URL}/v1/chat/completions" \
  "${AUTH_HEADER[@]}" \
  -H "Content-Type: application/json" \
  -d "$(jq -nc --arg model "${MODEL}" '{model:$model,stream:true,messages:[{role:"user",content:"stream test"}]}')"

echo

echo "All curl checks completed."

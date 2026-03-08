#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8787}"
API_KEY="${API_KEY:-dev-openclaw-key}"
MODEL="${MODEL:-openclaw-reia-mock}"
TIMEOUT_SEC="${TIMEOUT_SEC:-8}"

AUTH_HEADER=()
if [[ -n "${API_KEY}" ]]; then
  AUTH_HEADER=(-H "Authorization: Bearer ${API_KEY}")
fi

CURL_COMMON=(--silent --show-error --max-time "${TIMEOUT_SEC}")

echo "[diag] base_url=${BASE_URL} model=${MODEL} timeout=${TIMEOUT_SEC}s"

echo "[diag] /health"
health="$(curl "${CURL_COMMON[@]}" "${BASE_URL}/health")"
echo "${health}" | jq .

echo "[diag] /v1/models"
models="$(curl "${CURL_COMMON[@]}" "${BASE_URL}/v1/models" "${AUTH_HEADER[@]}")"
echo "${models}" | jq .

echo "[diag] /v1/chat/completions non-stream"
non_stream_payload="$(jq -nc --arg model "${MODEL}" '{model:$model,messages:[{role:"user",content:"diag ping"}]}')"
non_stream_resp="$(curl "${CURL_COMMON[@]}" "${BASE_URL}/v1/chat/completions" "${AUTH_HEADER[@]}" -H 'Content-Type: application/json' -d "${non_stream_payload}")"
echo "${non_stream_resp}" | jq .

echo "[diag] /v1/chat/completions stream"
stream_payload="$(jq -nc --arg model "${MODEL}" '{model:$model,stream:true,messages:[{role:"user",content:"diag stream ping"}]}')"
stream_resp="$(curl "${CURL_COMMON[@]}" -N "${BASE_URL}/v1/chat/completions" "${AUTH_HEADER[@]}" -H 'Content-Type: application/json' -d "${stream_payload}")"
if [[ "${stream_resp}" != *"data: [DONE]"* ]]; then
  echo "[diag][error] stream response missing [DONE] terminator" >&2
  exit 2
fi

echo "[diag] stream tail"
printf '%s\n' "${stream_resp}" | tail -n 6

echo "[diag] PASS"

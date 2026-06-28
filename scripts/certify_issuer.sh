#!/usr/bin/env bash
# =============================================================================
# Passport LATAM — Certificar un issuer
# Uso: ./scripts/certify_issuer.sh <ISSUER_ADDRESS>
# =============================================================================
set -euo pipefail

NETWORK="testnet"
SIGNER="will"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC}   $1"; }
fail() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

[ $# -lt 1 ] && fail "Uso: $0 <ISSUER_ADDRESS>"

ISSUER_ADDRESS="$1"
CONTRACT_ID=$(cat .contract_id 2>/dev/null || fail "No se encontró .contract_id — ejecutar deploy.sh primero")
ADMIN_ADDRESS=$(stellar keys address "$SIGNER")

log "Certificando issuer: $ISSUER_ADDRESS"
log "Contract ID:         $CONTRACT_ID"
log "Admin:               $ADMIN_ADDRESS"

stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SIGNER" \
  --network "$NETWORK" \
  -- certify_issuer \
  --admin "$ADMIN_ADDRESS" \
  --issuer "$ISSUER_ADDRESS"

ok "Issuer certificado: $ISSUER_ADDRESS"

log "Verificando certificación..."
IS_CERTIFIED=$(stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SIGNER" \
  --network "$NETWORK" \
  -- is_certified_issuer \
  --issuer "$ISSUER_ADDRESS")

ok "is_certified_issuer: $IS_CERTIFIED"

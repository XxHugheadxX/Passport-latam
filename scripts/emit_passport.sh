#!/usr/bin/env bash
# =============================================================================
# Passport LATAM — Emitir un pasaporte de prueba
# Uso: ./scripts/emit_passport.sh
# =============================================================================
set -euo pipefail

NETWORK="testnet"
SIGNER="will"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC}   $1"; }
fail() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

CONTRACT_ID=$(cat .contract_id 2>/dev/null || fail "No se encontró .contract_id")
ISSUER=$(stellar keys address "$SIGNER")

# Datos de prueba — alpaca boliviana
PRODUCT_ID="prod-alpaca-001"
METADATA_HASH="a3f5c8d2e1b7094f6a2d3e8c1f4b5d6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2"
OWNER="$ISSUER"
CATEGORY="textile"
ORIGIN="BO"

log "Emitiendo pasaporte de prueba..."
log "  product_id:     $PRODUCT_ID"
log "  metadata_hash:  $METADATA_HASH (64 chars: $(echo -n $METADATA_HASH | wc -c | tr -d ' '))"
log "  owner:          $OWNER"
log "  category:       $CATEGORY"
log "  origin_country: $ORIGIN"

PASSPORT_ID=$(stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SIGNER" \
  --network "$NETWORK" \
  -- emit_passport \
  --issuer "$ISSUER" \
  --product_id "$PRODUCT_ID" \
  --metadata_hash "$METADATA_HASH" \
  --owner "$OWNER" \
  --category "$CATEGORY" \
  --origin_country "$ORIGIN")

ok "Pasaporte emitido!"
ok "passport_id: $PASSPORT_ID"
echo "$PASSPORT_ID" > .last_passport_id

log "Verificando pasaporte on-chain..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SIGNER" \
  --network "$NETWORK" \
  -- verify_passport \
  --passport_id "$PASSPORT_ID"

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  PASAPORTE EMITIDO EXITOSAMENTE        ${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "  passport_id guardado en .last_passport_id"
echo -e "  Próximo paso: ${BLUE}./scripts/verify.sh${NC}"

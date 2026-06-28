#!/usr/bin/env bash
# =============================================================================
# Passport LATAM — Verificar un pasaporte on-chain
# Uso: ./scripts/verify.sh [PASSPORT_ID]
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

if [ $# -ge 1 ]; then
  PASSPORT_ID="$1"
else
  PASSPORT_ID=$(cat .last_passport_id 2>/dev/null || fail "No passport_id. Pasar como argumento o ejecutar emit_passport.sh primero")
fi

log "Verificando pasaporte: $PASSPORT_ID"

RESULT=$(stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SIGNER" \
  --network "$NETWORK" \
  -- verify_passport \
  --passport_id "$PASSPORT_ID")

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  RESULTADO DE VERIFICACIÓN             ${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo "$RESULT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"  passport_id:  {data.get('passport_id','N/A')[:20]}...\")
    print(f\"  product_id:   {data.get('product_id','N/A')}\")
    print(f\"  owner:        {data.get('owner','N/A')[:20]}...\")
    print(f\"  issuer:       {data.get('issuer','N/A')[:20]}...\")
    print(f\"  is_active:    {data.get('is_active','N/A')}\")
    print(f\"  transfers:    {data.get('transfer_count','N/A')}\")
    print(f\"  ledger:       {data.get('issued_at_ledger','N/A')}\")
    print(f\"  category:     {data.get('category','N/A')}\")
    print(f\"  origin:       {data.get('origin_country','N/A')}\")
    active = data.get('is_active', False)
    print()
    if active:
        print('  STATUS: VERIFIED ✓')
    else:
        print('  STATUS: REVOKED ✗')
except:
    print('Raw output:')
    print(sys.stdin.read())
" 2>/dev/null || echo "$RESULT"
echo ""

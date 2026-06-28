#!/usr/bin/env bash
# =============================================================================
# Passport LATAM — Test de seguridad manual (auditoría básica)
# Verifica que todos los guards de autorización funcionen correctamente
# Uso: ./scripts/test_security.sh
# =============================================================================
set -euo pipefail

NETWORK="testnet"
SIGNER="will"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'
log()    { echo -e "${BLUE}[TEST]${NC}  $1"; }
pass()   { echo -e "${GREEN}[PASS]${NC}  $1"; }
fail()   { echo -e "${RED}[FAIL]${NC}  $1"; }
header() { echo -e "\n${YELLOW}══ $1 ══${NC}"; }

CONTRACT_ID=$(cat .contract_id 2>/dev/null) || { echo "No .contract_id — deploy primero"; exit 1; }
ADMIN=$(stellar keys address "$SIGNER")
PASSPORT_ID=$(cat .last_passport_id 2>/dev/null || echo "")

PASS=0; FAIL=0

run_test() {
  local name="$1"; local expected_fail="$2"; shift 2
  log "Ejecutando: $name"
  if "$@" > /tmp/test_out 2>&1; then
    if [ "$expected_fail" = "should_fail" ]; then
      fail "$name — DEBERÍA haber fallado pero pasó"
      ((FAIL++)) || true
    else
      pass "$name"
      ((PASS++)) || true
    fi
  else
    if [ "$expected_fail" = "should_fail" ]; then
      pass "$name — falló como esperado"
      ((PASS++)) || true
    else
      fail "$name — falló inesperadamente"
      cat /tmp/test_out | head -5
      ((FAIL++)) || true
    fi
  fi
}

# ── Generar una wallet atacante ───────────────────────────────────────────────
header "Preparando atacante"
stellar keys generate --global attacker --network "$NETWORK" 2>/dev/null || true
stellar keys fund attacker --network "$NETWORK" 2>/dev/null || true
ATTACKER=$(stellar keys address attacker)
log "Atacante generado: $ATTACKER"

# ── Test 1: doble inicialización ──────────────────────────────────────────────
header "Test 1 — Doble inicialización"
run_test "initialize() dos veces debe fallar" "should_fail" \
  stellar contract invoke --id "$CONTRACT_ID" --source "$SIGNER" --network "$NETWORK" \
  -- initialize --admin "$ADMIN"

# ── Test 2: atacante intenta certify_issuer ───────────────────────────────────
header "Test 2 — No-admin no puede certify_issuer"
run_test "Atacante no puede certify_issuer" "should_fail" \
  stellar contract invoke --id "$CONTRACT_ID" --source attacker --network "$NETWORK" \
  -- certify_issuer --admin "$ATTACKER" --issuer "$ATTACKER"

# ── Test 3: atacante intenta emit_passport ────────────────────────────────────
header "Test 3 — No-issuer no puede emitir pasaporte"
run_test "Atacante no puede emit_passport" "should_fail" \
  stellar contract invoke --id "$CONTRACT_ID" --source attacker --network "$NETWORK" \
  -- emit_passport \
  --issuer "$ATTACKER" \
  --product_id "fake-product" \
  --metadata_hash "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" \
  --owner "$ATTACKER" \
  --category "fake" \
  --origin_country "XX"

# ── Test 4: hash inválido (< 64 chars) ───────────────────────────────────────
header "Test 4 — Hash inválido rechazado"
run_test "Hash de 8 chars debe fallar" "should_fail" \
  stellar contract invoke --id "$CONTRACT_ID" --source "$SIGNER" --network "$NETWORK" \
  -- emit_passport \
  --issuer "$ADMIN" \
  --product_id "test" \
  --metadata_hash "tooshort" \
  --owner "$ADMIN" \
  --category "test" \
  --origin_country "BO"

# ── Test 5: product_id vacío ──────────────────────────────────────────────────
header "Test 5 — product_id vacío rechazado"
run_test "product_id vacío debe fallar" "should_fail" \
  stellar contract invoke --id "$CONTRACT_ID" --source "$SIGNER" --network "$NETWORK" \
  -- emit_passport \
  --issuer "$ADMIN" \
  --product_id "" \
  --metadata_hash "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" \
  --owner "$ADMIN" \
  --category "test" \
  --origin_country "BO"

# ── Test 6: pausa y verificación ─────────────────────────────────────────────
header "Test 6 — Pausa bloquea emisión pero NO la verificación"
if [ -n "$PASSPORT_ID" ]; then
  stellar contract invoke --id "$CONTRACT_ID" --source "$SIGNER" --network "$NETWORK" \
    -- pause --admin "$ADMIN" > /dev/null 2>&1
  run_test "Emisión bloqueada mientras pausado" "should_fail" \
    stellar contract invoke --id "$CONTRACT_ID" --source "$SIGNER" --network "$NETWORK" \
    -- emit_passport --issuer "$ADMIN" --product_id "test-pause" \
    --metadata_hash "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" \
    --owner "$ADMIN" --category "test" --origin_country "BO"
  run_test "verify_passport funciona mientras pausado" "should_pass" \
    stellar contract invoke --id "$CONTRACT_ID" --source "$SIGNER" --network "$NETWORK" \
    -- verify_passport --passport_id "$PASSPORT_ID"
  # Unpause para continuar
  stellar contract invoke --id "$CONTRACT_ID" --source "$SIGNER" --network "$NETWORK" \
    -- unpause --admin "$ADMIN" > /dev/null 2>&1
  pass "Contrato reactivado"
else
  log "Skipping test 6 — no hay passport_id (ejecutar emit_passport.sh primero)"
fi

# ── Test 7: transfer a sí mismo ───────────────────────────────────────────────
header "Test 7 — Transferir a sí mismo rechazado"
if [ -n "$PASSPORT_ID" ]; then
  run_test "Transfer a mismo owner debe fallar" "should_fail" \
    stellar contract invoke --id "$CONTRACT_ID" --source "$SIGNER" --network "$NETWORK" \
    -- transfer_ownership \
    --owner "$ADMIN" \
    --passport_id "$PASSPORT_ID" \
    --new_owner "$ADMIN"
else
  log "Skipping test 7 — no hay passport_id"
fi

# ── Test 8: atacante intenta transferir pasaporte ajeno ──────────────────────
header "Test 8 — No-owner no puede transferir"
if [ -n "$PASSPORT_ID" ]; then
  run_test "Atacante no puede transfer passport ajeno" "should_fail" \
    stellar contract invoke --id "$CONTRACT_ID" --source attacker --network "$NETWORK" \
    -- transfer_ownership \
    --owner "$ATTACKER" \
    --passport_id "$PASSPORT_ID" \
    --new_owner "$ATTACKER"
else
  log "Skipping test 8 — no hay passport_id"
fi

# ── Resumen ───────────────────────────────────────────────────────────────────
TOTAL=$((PASS + FAIL))
echo ""
echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo -e "${YELLOW}  RESUMEN DE AUDITORÍA DE SEGURIDAD     ${NC}"
echo -e "${YELLOW}════════════════════════════════════════${NC}"
echo -e "  Tests ejecutados: ${TOTAL}"
echo -e "  ${GREEN}PASS: ${PASS}${NC}"
echo -e "  ${RED}FAIL: ${FAIL}${NC}"
if [ "$FAIL" -eq 0 ]; then
  echo -e "\n  ${GREEN}✓ Todos los guards de seguridad funcionan correctamente${NC}"
else
  echo -e "\n  ${RED}✗ Hay $FAIL guard(s) que no funcionan — revisar contrato${NC}"
fi
echo ""

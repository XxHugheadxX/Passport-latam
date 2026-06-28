#!/usr/bin/env bash
# =============================================================================
# Passport LATAM — Deploy script (Testnet)
# Uso: ./scripts/deploy.sh
# =============================================================================
set -euo pipefail

# ── Configuración ─────────────────────────────────────────────────────────────
NETWORK="testnet"
SIGNER="will"           # nombre del keypair en stellar-cli
WASM="target/wasm32-unknown-unknown/release/passport_latam.wasm"

# ── Colores ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'

log()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC}   $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── 1. Verificar herramientas ─────────────────────────────────────────────────
log "Verificando herramientas..."
command -v stellar >/dev/null 2>&1 || fail "stellar-cli no instalado. Correr: cargo install --locked stellar-cli"
command -v cargo   >/dev/null 2>&1 || fail "cargo no encontrado. Instalar Rust: https://rustup.rs"
ok "stellar-cli y cargo disponibles"

# ── 2. Verificar target WASM ──────────────────────────────────────────────────
log "Verificando target wasm32-unknown-unknown..."
rustup target list --installed | grep -q "wasm32-unknown-unknown" \
  || { warn "Instalando target WASM..."; rustup target add wasm32-unknown-unknown; }
ok "Target WASM disponible"

# ── 3. Compilar ───────────────────────────────────────────────────────────────
log "Compilando contrato..."
stellar contract build 2>&1
[ -f "$WASM" ] || fail "WASM no generado en $WASM"
WASM_SIZE=$(du -sh "$WASM" | cut -f1)
ok "Contrato compilado: $WASM ($WASM_SIZE)"

# ── 4. Verificar/crear keypair ────────────────────────────────────────────────
log "Verificando keypair '$SIGNER'..."
if ! stellar keys show "$SIGNER" >/dev/null 2>&1; then
  warn "Keypair '$SIGNER' no existe. Generando..."
  stellar keys generate --global "$SIGNER" --network "$NETWORK"
fi
ADMIN_ADDRESS=$(stellar keys address "$SIGNER")
ok "Admin address: $ADMIN_ADDRESS"

# ── 5. Fondear cuenta en testnet ──────────────────────────────────────────────
log "Fondeando cuenta en testnet (Friendbot)..."
stellar keys fund "$SIGNER" --network "$NETWORK" 2>&1 || warn "Fondeo falló — puede que ya tenga fondos"

# ── 6. Deploy ─────────────────────────────────────────────────────────────────
log "Deployando contrato en testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM" \
  --source "$SIGNER" \
  --network "$NETWORK" \
  2>&1)

[ -z "$CONTRACT_ID" ] && fail "Deploy falló — CONTRACT_ID vacío"
ok "Contrato deployado: $CONTRACT_ID"

# ── 7. Guardar CONTRACT_ID ────────────────────────────────────────────────────
echo "$CONTRACT_ID" > .contract_id
ok "CONTRACT_ID guardado en .contract_id"

# ── 8. Inicializar contrato ───────────────────────────────────────────────────
log "Inicializando contrato..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SIGNER" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ADMIN_ADDRESS"
ok "Contrato inicializado con admin: $ADMIN_ADDRESS"

# ── 9. Verificar estado inicial ───────────────────────────────────────────────
log "Verificando estado inicial..."
IS_PAUSED=$(stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SIGNER" \
  --network "$NETWORK" \
  -- is_paused)
ADMIN_CHECK=$(stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SIGNER" \
  --network "$NETWORK" \
  -- get_admin)
ok "is_paused: $IS_PAUSED"
ok "admin on-chain: $ADMIN_CHECK"

# ── Resumen ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  DEPLOY EXITOSO — Passport LATAM       ${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "  Network:     ${YELLOW}$NETWORK${NC}"
echo -e "  Contract ID: ${YELLOW}$CONTRACT_ID${NC}"
echo -e "  Admin:       ${YELLOW}$ADMIN_ADDRESS${NC}"
echo -e "  WASM size:   ${YELLOW}$WASM_SIZE${NC}"
echo ""
echo -e "  Próximo paso: ${BLUE}./scripts/certify_issuer.sh <ISSUER_ADDRESS>${NC}"
echo ""

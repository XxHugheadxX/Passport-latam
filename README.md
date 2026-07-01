# Passport LATAM 🛂

> Pasaportes digitales de producto para América Latina, verificados on-chain en Stellar.

**Hackathon:** PULSO 2026 · NEARX × Stellar
**Track:** DeFi / RWA / Tokenización de activos
**Demo:** [passport-latam.vercel.app](https://passport-latam.vercel.app)

---

## De dónde nació la idea

La semilla de Passport LATAM la plantó **Odry Nataly**. La preocupación era concreta: la industria de la moda latinoamericana produce con identidad propia, pero esa identidad se pierde en cuanto el producto sale de las manos de quien lo hizo. Greenwashing, falsificaciones, cadenas de suministro opacas — el problema no es falta de calidad, es falta de prueba verificable.

Cuando Odry trajo la idea y la conversó con **Darianny Robledo**, **William** y **Alejandro**, el equipo vio el ángulo técnico: esto no se resuelve con un PDF ni con un sello — se resuelve con un registro inmutable en blockchain que cualquiera pueda consultar sin depender de ninguna empresa. Stellar y Soroban daban exactamente las herramientas para hacerlo accesible y a bajo costo para productores latinoamericanos que no tienen presupuesto para soluciones enterprise.

De esa conversación nació Passport LATAM: la idea de Odry, hecha realidad por el equipo completo.

---

## El problema

La industria de la moda es una de las cadenas de suministro más opacas y contaminantes del mundo. En América Latina, diseñadores, marcas emergentes y fabricantes producen prendas y accesorios de alta calidad — pero no tienen forma de demostrarlo más allá de papeles y sellos que se pueden falsificar o perder.

El problema tiene dos caras:

**Para los productores:** un taller en Lima, una marca de ropa en Buenos Aires o un diseñador en Bogotá no puede certificar de forma creíble el origen de sus materiales, las condiciones laborales de su producción ni las prácticas de sostenibilidad que dicen tener. Sin esa prueba, no pueden cobrar el precio que merecen ni acceder a mercados internacionales que exigen trazabilidad.

**Para los consumidores y compradores:** el **greenwashing** en la industria de la moda es masivo. Marcas que se autoproclaman "sostenibles", "orgánicas" o "de comercio justo" sin ningún mecanismo de verificación independiente. El consumidor no tiene forma de distinguir una marca que realmente cumple de una que simplemente usa el lenguaje correcto.

El resultado: **los compradores no confían, los productores no pueden cobrar el precio justo, y la cadena de suministro de la moda latinoamericana es opaca de punta a punta.**

Este problema está directamente alineado con los ejes del **Stellar Community Fund (SCF)** y de **PULSO 2026**: llevar infraestructura financiera y de confianza a mercados que históricamente no han tenido acceso a ella. No se trata de hacer blockchain por hacerla — se trata de resolver un problema real de millones de productores latinoamericanos usando la única tecnología que permite verificación pública, sin intermediarios y a costo accesible.

---

## La solución

**Passport LATAM** permite a fabricantes, artesanos y empresas emitir **pasaportes digitales de producto** en la red Stellar. Cada pasaporte es un activo no-fungible on-chain que certifica:

- **Origen** verificable: país, ciudad, productor
- **Metadatos del producto**: categoría, materiales, certificaciones, año de producción
- **Trazabilidad de eventos**: producción, certificaciones, logística — cada uno firmado on-chain
- **Transferencia de propiedad**: la cadena de custodia queda grabada para siempre en Stellar

Cualquier persona — un importador en Europa, un consumidor en Buenos Aires, un auditor de sostenibilidad — puede escanear el QR de un producto y verificar su autenticidad en tiempo real, directamente contra el contrato inteligente, sin confiar en ninguna empresa ni plataforma centralizada.

---

## Ejemplo real: Moda latinoamericana

Una marca de ropa independiente en Medellín lanza una colección cápsula con materiales reciclados. Registra cada prenda en Passport LATAM:

1. **La marca** crea su cuenta, conecta su wallet Stellar con Freighter y registra la prenda: `Chaqueta — algodón reciclado 80%, poliéster reciclado 20%, Medellín, Colombia, 2026`
2. **El sistema** calcula un hash SHA-256 de los metadatos y lo graba en el contrato Soroban junto con la dirección de la marca como issuer certificada
3. **Se genera un QR** único que se cose como etiqueta interior en la prenda
4. **La prenda viaja** a una tienda multimarca en Ciudad de México. El comprador mayorista escanea el QR, verifica el hash on-chain contra los datos declarados — si coinciden, el origen y los materiales son auténticos
5. **La tienda transfiere** la propiedad del pasaporte a su wallet — queda registrado que el activo pasó del fabricante al distribuidor
6. **El consumidor final** escanea la etiqueta QR en el probador y ve la historia completa: dónde se fabricó, qué materiales tiene, quién la certifica, cuántos dueños tuvo — en tiempo real, sin depender de lo que dice la etiqueta impresa

**El caso del greenwashing:** si mañana esa marca decide declarar que usa "100% algodón orgánico" en su próxima colección pero los materiales reales son distintos, el hash on-chain no va a coincidir con los datos que suben. El sistema no puede forzar honestidad en el input inicial, pero sí garantiza que lo que se declaró no puede ser modificado retroactivamente. Combinado con V4 (auditorías de terceros), ese gap se cierra por completo.

Todo esto sin intermediarios, sin PDFs que se pueden editar, sin sellos que se pueden copiar.

---

## Demo

🔗 **[https://passport-latam.vercel.app](https://passport-latam.vercel.app)**

**Contrato desplegado en Stellar Testnet:**
```
CCOP7W3HEKMXYNJY7QLULFKWIN2O54M4XVUL45MSYE7V5FEADTJXK6MW
```

**Flujo de demo:**
```
1. Registrarse como empresa emisora
2. Agregar un producto con sus datos
3. Emitir el pasaporte (firma con Freighter)
4. Escanear el QR generado
5. Verificar autenticidad on-chain sin login
```

---

## Arquitectura técnica

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend — Next.js 16 (Vercel)          │
│                                                           │
│  /dashboard ──► /emit ──► /api/certify ──► Soroban RPC  │
│  /verify/[id] ─────────────────────────► simulateTx     │
│  /transfer/[id] ───────────────────────► Freighter      │
└─────────────────────────────────────────────────────────┘
          │                          │
          ▼                          ▼
   Supabase (DB + Auth)       Stellar Testnet
   products, companies,       PassportLatamContract
   passports (off-chain)      (metadata_hash on-chain)
```

**La separación entre off-chain y on-chain es intencional:**
- Los **datos completos** del producto viven en Supabase (texto, imágenes, certificaciones)
- El **hash SHA-256** de esos datos vive en el contrato Soroban
- Al verificar, se recalcula el hash del lado del cliente y se compara con el on-chain — si coinciden, los datos no fueron manipulados

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Smart contract | Rust + Soroban SDK v21 |
| Red | Stellar Testnet (Soroban RPC) |
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, DaisyUI |
| Auth & DB | Supabase (PostgreSQL + RLS + Auth) |
| Wallet | Freighter (firma de transacciones del lado del cliente) |
| Deploy | Vercel |
| SDK Stellar | `@stellar/stellar-sdk` v16 |

---

## Contrato Soroban (`src/lib.rs`)

El contrato expone una API pública limpia:

| Función | Descripción |
|---------|-------------|
| `emit_passport` | Emite un pasaporte y devuelve su ID único (hash derivado) |
| `verify_passport` | Retorna `PassportView` con todos los datos on-chain |
| `transfer_ownership` | Transfiere el pasaporte a un nuevo dueño |
| `add_traceability_event` | Agrega un evento firmado (hasta 100 por pasaporte) |
| `revoke_passport` | Revoca un pasaporte (solo issuer o admin) |
| `update_metadata_hash` | Actualiza el hash si los metadatos cambian |
| `certify_issuer` | El admin certifica una wallet como emisora |
| `pause` / `unpause` | Pausa de emergencia del contrato |

**Seguridad del contrato:**
- TTL persistente: 535,000 ledgers (~30 años)
- Sin `unwrap()` ni `panic!()` — solo `panic_with_error!()` con errores tipados
- Hash validado on-chain: exactamente 64 chars hex
- Límite de 10,000 pasaportes por issuer, 100 eventos por pasaporte
- 23 tests de integración cubriendo todos los flujos y casos de error

---

## Instalación local

### Requisitos

- [Rust](https://rustup.rs) + target `wasm32-unknown-unknown`
- [stellar-cli](https://github.com/stellar/stellar-cli)
- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io)
- Cuenta en [Supabase](https://supabase.com)
- Extensión [Freighter](https://freighter.app) en el browser

### Variables de entorno

```bash
cp .env.example frontend/.env.local
# Completar con tus valores de Supabase y Stellar
```

```env
NEXT_PUBLIC_CONTRACT_ID=CCOP7W3HEKMXYNJY7QLULFKWIN2O54M4XVUL45MSYE7V5FEADTJXK6MW
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org

STELLAR_ADMIN_SECRET_KEY=S...        # NUNCA exponer al cliente

NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Correr en desarrollo

```bash
cd frontend
pnpm install
pnpm dev
# http://localhost:3000
```

### Deploy del contrato (opcional — ya está desplegado en testnet)

```bash
./scripts/deploy.sh
./scripts/certify_issuer.sh <ISSUER_ADDRESS>
```

---

## Roadmap — Más allá del MVP

El MVP del hackathon resuelve el problema central: identidad digital verificable on-chain para productos físicos latinoamericanos. Lo que sigue es la visión de hacia dónde escala la infraestructura una vez que el core está probado en producción.

---

### V2 — Oráculos: precio de mercado en tiempo real

**Qué resuelve:** hoy un pasaporte digital certifica origen y autenticidad, pero no dice nada sobre el valor de mercado del activo. Un coleccionista, un exportador o un comprador institucional necesita saber cuánto vale lo que está verificando, no solo que es genuino.

**Cómo se integra:** Reflector es el oráculo de referencia en Soroban — una red de nodos que agregan precios on-chain y off-chain y los exponen bajo el estándar SEP-40, ya usado por protocolos como Blend. Passport LATAM consultaría Reflector para mostrar, junto a cada pasaporte verificado, una valoración estimada basada en categoría, origen y comparables de mercado.

**Funciones nuevas en el contrato:**
```rust
fn get_estimated_value(env: Env, passport_id: String) -> i128
fn set_price_oracle(env: Env, admin: Address, oracle_address: Address)
```

**La lección de seguridad que hay que aplicar desde el diseño:** en febrero de 2026, Blend Protocol perdió $10.8M porque su integración con Reflector tomaba el último precio reportado sin filtrar volatilidad ni usar un Time-Weighted Average Price (TWAP). Un atacante depositó una cantidad mínima de un activo de bajo volumen, movió el precio reportado a un valor absurdo, y pidió prestado contra esa valoración falsa. La causa no fue un bug del contrato — fue confiar en un precio puntual sin protección.

Passport LATAM no es un protocolo de lending, así que el riesgo de explotación financiera directa es menor, pero la lección aplica igual: cualquier `get_estimated_value()` debe:
- Usar TWAP (precio promedio ponderado por tiempo) en lugar de spot price
- Validar que el oráculo tiene actualizaciones recientes (rechazar precios stale)
- Tratar el valor estimado como informativo, nunca como input de una transacción financiera automática

**Por qué no entra en el MVP:** agregar un oráculo mal diseñado es peor que no tenerlo — introduce una superficie de ataque nueva sin necesidad real para la demo del hackathon. Se documenta como roadmap consciente, no como ausencia por falta de tiempo.

---

### V3 — Tokenización avanzada de activos físicos

El MVP ya emite un pasaporte digital por producto (identidad, no tokenización financiera). V3 da el siguiente paso: convertir ese pasaporte en un activo negociable.

**V3.1 — Fractional ownership (SEP-41)**

Para activos de alto valor — una pieza de arte boliviana, un lote de café de origen único, una colección limitada — permitir que múltiples personas posean fracciones del mismo activo físico mediante un token fungible SEP-41 vinculado al `passport_id`.

```rust
fn fractionalize(env: Env, passport_id: String, total_shares: u32) -> Address // retorna el contrato del token SEP-41
fn redeem_full_ownership(env: Env, passport_id: String, holder: Address) // cuando alguien junta el 100% de shares
```

**V3.2 — Tokenización de inventario agregado**

Distinto de fraccionar un producto individual: un caficultor con 500 sacos de la misma cosecha no necesita 500 pasaportes idénticos — necesita un token que represente el lote completo, con trazabilidad compartida y divisibilidad para venta parcial.

**V3.3 — Garantía y colateral**

Una vez que el activo tiene un pasaporte verificado y un valor estimado (V2), se vuelve técnicamente posible usarlo como colateral en protocolos DeFi del ecosistema Stellar. Un productor podría obtener liquidez contra su próxima cosecha certificada sin vender el activo físico todavía. Esto requiere integración con un protocolo de lending existente (Blend u otro), no construir uno propio.

**Por qué no entra en el MVP:** cada una de estas piezas es un sistema de incentivos económicos completo, con sus propios vectores de ataque (qué pasa si el activo físico se daña después de tokenizarse, quién arbitra disputas, cómo se previene el doble gasto de la representación física vs. digital). Resolverlo bien toma semanas, no días.

---

### V4 — Trazabilidad anti-greenwashing *(iniciativa de Odry Nataly)*

**El problema que resuelve:** las certificaciones de sostenibilidad actuales (orgánico, comercio justo, carbono neutral) dependen de auditorías periódicas y documentos que se pueden falsificar o quedar desactualizados. Una marca puede certificarse una vez y seguir usando el sello años después aunque sus prácticas hayan cambiado.

**La propuesta:** usar la infraestructura de `add_traceability_event()` que ya existe en el contrato — no como historial estático, sino como un registro vivo y auditable de prácticas reales a lo largo de toda la cadena de producción.

```rust
fn add_sustainability_checkpoint(
    env: Env,
    issuer: Address,
    passport_id: String,
    checkpoint_type: Symbol,  // "water_usage", "carbon_offset", "fair_wage_audit"...
    verified_by: Address,     // auditor independiente, no el propio issuer
    data_hash: String,        // hash del reporte de auditoría off-chain
)

fn get_sustainability_score(env: Env, passport_id: String) -> SustainabilityReport
```

**La diferencia clave frente a una certificación tradicional:** cada checkpoint requiere la firma de un `verified_by` que NO es el mismo issuer — un auditor tercero certificado en el contrato. Esto evita que una empresa se autocertifique como sostenible.

**Caso de uso concreto:** un productor de alpaca boliviana certifica en el pasaporte no solo "origen: Bolivia" sino una línea de tiempo verificable: análisis de uso de agua en marzo, auditoría de condiciones laborales en junio, certificación de tinte natural en septiembre — cada uno firmado por un auditor distinto, cada uno con su hash de reporte. Un comprador internacional no confía en una etiqueta, confía en un historial on-chain que no se puede reescribir retroactivamente.

**Por qué es una categoría diferente al resto del roadmap:** V2 y V3 son extensiones técnicas naturales del modelo ya construido. V4 es un cambio de tesis — pasa de "verificar qué es el producto" a "verificar cómo se comportó la empresa a lo largo del tiempo". Es la pieza que más distingue a Passport LATAM de un simple verificador de autenticidad y lo acerca a ser infraestructura de confianza real para el comercio LATAM-Europa, donde las regulaciones anti-greenwashing (como la CSRD europea) exigen cada vez más evidencia verificable y menos autodeclaración.

---

### Resumen de roadmap

| Versión | Qué agrega | Complejidad |
|---------|-----------|-------------|
| V2 — Oráculos | Valoración en tiempo real vía Reflector (SEP-40) + protección TWAP | Media |
| V3.1 — Fractional ownership | Tokens SEP-41 vinculados a pasaportes | Alta |
| V3.2 — Inventario agregado | Tokenización de lotes, no unidades individuales | Media |
| V3.3 — Colateral DeFi | Pasaportes como garantía en protocolos de lending | Alta |
| V4 — Anti-greenwashing | Auditorías verificables on-chain por terceros certificados | Media-Alta |

Ninguna de estas piezas es necesaria para demostrar el concepto central en el hackathon. Se documentan acá porque un roadmap honesto y técnicamente fundamentado — incluyendo los riesgos conocidos como el exploit de Blend — pesa más ante los jueces que funcionalidades a medias construidas bajo presión de tiempo.

---

## Seguridad

- `STELLAR_ADMIN_SECRET_KEY` nunca se expone al cliente — solo existe en variables de entorno del servidor
- Todos los endpoints de servidor requieren token Supabase válido
- RLS habilitado en todas las tablas de Supabase
- Hash de metadatos: SHA-256 canónico (campos en orden alfabético, sin espacios) via Web Crypto API
- Hash validado on-chain: exactamente 64 chars hex, rechazado por el contrato si tiene otro largo
- Sin `unwrap()` ni `bare panic!()` en el contrato — solo `panic_with_error!()` con errores tipados

---

## Tests

```bash
# Smart contract — Windows
cargo test --target x86_64-pc-windows-msvc
```

23 tests cubriendo: inicialización, certificación de issuers, emisión, transferencia, revocación, trazabilidad, pausado, validación de hash, contadores y límites de capacidad.

---

## Equipo

| Nombre | Rol | GitHub |
|--------|-----|--------|
| William Yucra | Smart contract (Soroban/Rust) + Backend | [@XxHugheadxX](https://github.com/XxHugheadxX) |
| Alejandro Anchundia | Frontend (Next.js + UI/UX) | [@anchundiatech](https://github.com/anchundiatech) |
| Odry Nataly | Origen de la idea + propuesta V4 anti-greenwashing | — |
| Darianny Robledo | Investigación y documentación | — |

---

## Recursos del proyecto

📁 **[Documentación y materiales](https://drive.google.com/drive/folders/1Zs7auUlKZtbnlDxUUdG8KddBNUCC5luY?usp=sharing)**

---

## Licencia

MIT

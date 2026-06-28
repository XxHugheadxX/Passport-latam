#![no_std]
extern crate alloc;

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    symbol_short, panic_with_error,
    Address, Bytes, Env, String, Symbol,
};

// ─── Errors ──────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PassportError {
    AlreadyInitialized     = 1,
    NotInitialized         = 2,
    NotAdmin               = 3,
    NotCertifiedIssuer     = 4,
    PassportNotFound       = 5,
    NotOwner               = 6,
    PassportRevoked        = 7,
    InvalidHashFormat      = 8,
    EmptyProductId         = 9,
    SameOwner              = 10,
    ContractPaused         = 11,
    IssuerAlreadyCertified = 12,
    IssuerNotFound         = 13,
    IssuanceCapReached     = 14,
    EventCapReached        = 15,
    EventIndexOutOfBounds  = 16,
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum StorageKey {
    Admin,
    Paused,
    // Individual certification flag per issuer — avoids Map reload inconsistencies
    IssuerCertified(Address),
    Passport(String),
    PassportState(String),
    IssuerCount(Address),
    EventCount(String),
    PassportEvent(String, u32),
}

// ─── Data structures ──────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PassportData {
    pub product_id:       String,
    pub metadata_hash:    String,
    pub issuer:           Address,
    pub issued_at_ledger: u32,
    pub category:         Symbol,
    pub origin_country:   Symbol,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PassportState {
    pub owner:                Address,
    pub is_active:            bool,
    pub last_transfer_ledger: u32,
    pub transfer_count:       u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TraceabilityEvent {
    pub event_type: Symbol,
    pub notes:      String,
    pub ledger:     u32,
    pub issuer:     Address,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PassportView {
    pub passport_id:          String,
    pub product_id:           String,
    pub metadata_hash:        String,
    pub issuer:               Address,
    pub owner:                Address,
    pub is_active:            bool,
    pub issued_at_ledger:     u32,
    pub last_transfer_ledger: u32,
    pub transfer_count:       u32,
    pub category:             Symbol,
    pub origin_country:       Symbol,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct PassportLatamContract;

// ─── Private helpers ──────────────────────────────────────────────────────────

impl PassportLatamContract {
    fn load_admin(env: &Env) -> Address {
        env.storage()
            .instance()
            .get::<StorageKey, Address>(&StorageKey::Admin)
            .unwrap_or_else(|| panic_with_error!(env, PassportError::NotInitialized))
    }

    fn assert_admin(env: &Env, caller: &Address) {
        if *caller != Self::load_admin(env) {
            panic_with_error!(env, PassportError::NotAdmin);
        }
        caller.require_auth();
    }

    fn assert_not_paused(env: &Env) {
        if env.storage()
            .instance()
            .get::<StorageKey, bool>(&StorageKey::Paused)
            .unwrap_or(false)
        {
            panic_with_error!(env, PassportError::ContractPaused);
        }
    }

    fn assert_certified_issuer(env: &Env, caller: &Address) {
        let certified = env.storage()
            .instance()
            .get::<StorageKey, bool>(&StorageKey::IssuerCertified(caller.clone()))
            .unwrap_or(false);
        if !certified {
            panic_with_error!(env, PassportError::NotCertifiedIssuer);
        }
        caller.require_auth();
    }

    fn load_data(env: &Env, passport_id: &String) -> PassportData {
        env.storage()
            .persistent()
            .get::<StorageKey, PassportData>(&StorageKey::Passport(passport_id.clone()))
            .unwrap_or_else(|| panic_with_error!(env, PassportError::PassportNotFound))
    }

    fn load_state(env: &Env, passport_id: &String) -> PassportState {
        env.storage()
            .persistent()
            .get::<StorageKey, PassportState>(&StorageKey::PassportState(passport_id.clone()))
            .unwrap_or_else(|| panic_with_error!(env, PassportError::PassportNotFound))
    }

    fn validate_hash(env: &Env, hash: &String) {
        if hash.len() != 64 {
            panic_with_error!(env, PassportError::InvalidHashFormat);
        }
    }

    fn validate_product_id(env: &Env, product_id: &String) {
        if product_id.len() == 0 {
            panic_with_error!(env, PassportError::EmptyProductId);
        }
    }

    fn derive_passport_id(env: &Env, _issuer: &Address, product_id: &String, ledger: u32) -> String {
        let mut input = Bytes::new(env);

        // product_id bytes via fixed stack buffer — no heap allocation, WASM-safe
        let pid_len = product_id.len() as usize;
        let mut pid_buf = [0u8; 512];
        let copy_len = pid_len.min(512);
        product_id.copy_into_slice(&mut pid_buf[..copy_len]);
        input.extend_from_slice(&pid_buf[..copy_len]);
        input.push_back(b':');

        // ledger as big-endian bytes
        input.extend_from_slice(&ledger.to_be_bytes());

        let hash = env.crypto().sha256(&input);
        let hex_chars = b"0123456789abcdef";
        let mut hex = [0u8; 64];
        for (i, b) in hash.to_array().iter().enumerate() {
            hex[i * 2]     = hex_chars[(b >> 4) as usize];
            hex[i * 2 + 1] = hex_chars[(b & 0xf) as usize];
        }
        String::from_bytes(env, &hex)
    }

    fn bump_ttl(env: &Env, passport_id: &String) {
        const TTL: u32 = 535_000;
        env.storage().persistent().extend_ttl(
            &StorageKey::Passport(passport_id.clone()), TTL, TTL,
        );
        env.storage().persistent().extend_ttl(
            &StorageKey::PassportState(passport_id.clone()), TTL, TTL,
        );
    }
}

// ─── Public ABI ───────────────────────────────────────────────────────────────

#[contractimpl]
impl PassportLatamContract {

    // ── Init ────────────────────────────────────────────────────────────────

    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&StorageKey::Admin) {
            panic_with_error!(&env, PassportError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&StorageKey::Admin, &admin);
        env.storage().instance().set(&StorageKey::Paused, &false);
        env.storage().instance().extend_ttl(535_000, 535_000);
        env.events().publish(
            (symbol_short!("init"), symbol_short!("admin")),
            admin,
        );
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    pub fn certify_issuer(env: Env, admin: Address, issuer: Address) {
        Self::assert_admin(&env, &admin);
        Self::assert_not_paused(&env);

        let key = StorageKey::IssuerCertified(issuer.clone());
        if env.storage().instance().get::<StorageKey, bool>(&key).unwrap_or(false) {
            panic_with_error!(&env, PassportError::IssuerAlreadyCertified);
        }
        env.storage().instance().set(&key, &true);
        env.storage().instance().extend_ttl(535_000, 535_000);
        env.events().publish(
            (symbol_short!("issuer"), symbol_short!("certif")),
            issuer.clone(),
        );
    }

    pub fn revoke_issuer(env: Env, admin: Address, issuer: Address) {
        Self::assert_admin(&env, &admin);

        let key = StorageKey::IssuerCertified(issuer.clone());
        if !env.storage().instance().get::<StorageKey, bool>(&key).unwrap_or(false) {
            panic_with_error!(&env, PassportError::IssuerNotFound);
        }
        env.storage().instance().set(&key, &false);
        env.events().publish(
            (symbol_short!("issuer"), symbol_short!("revoked")),
            issuer.clone(),
        );
    }

    pub fn pause(env: Env, admin: Address) {
        Self::assert_admin(&env, &admin);
        env.storage().instance().set(&StorageKey::Paused, &true);
        env.events().publish(
            (symbol_short!("contract"), symbol_short!("paused")),
            admin,
        );
    }

    pub fn unpause(env: Env, admin: Address) {
        Self::assert_admin(&env, &admin);
        env.storage().instance().set(&StorageKey::Paused, &false);
        env.events().publish(
            (symbol_short!("contract"), symbol_short!("unpaused")),
            admin,
        );
    }

    pub fn transfer_admin(env: Env, admin: Address, new_admin: Address) {
        Self::assert_admin(&env, &admin);
        new_admin.require_auth();
        env.storage().instance().set(&StorageKey::Admin, &new_admin);
        env.events().publish(
            (symbol_short!("admin"), symbol_short!("changed")),
            (&admin, &new_admin),
        );
    }

    // ── Passport operations ──────────────────────────────────────────────────

    pub fn emit_passport(
        env:            Env,
        issuer:         Address,
        product_id:     String,
        metadata_hash:  String,
        owner:          Address,
        category:       Symbol,
        origin_country: Symbol,
    ) -> String {
        Self::assert_not_paused(&env);
        Self::assert_certified_issuer(&env, &issuer);
        Self::validate_product_id(&env, &product_id);
        Self::validate_hash(&env, &metadata_hash);

        const MAX_PER_ISSUER: u32 = 10_000;
        let count_key = StorageKey::IssuerCount(issuer.clone());
        // current is READ here (in simulation), so it's stable in the footprint.
        // Using it as the derivation seed avoids passport_id changing between sim/exec.
        let current = env.storage()
            .persistent()
            .get::<StorageKey, u32>(&count_key)
            .unwrap_or(0u32);
        if current >= MAX_PER_ISSUER {
            panic_with_error!(&env, PassportError::IssuanceCapReached);
        }

        let ledger = env.ledger().sequence();
        let passport_id = Self::derive_passport_id(&env, &issuer, &product_id, current);

        env.storage().persistent().set(
            &StorageKey::Passport(passport_id.clone()),
            &PassportData {
                product_id:       product_id.clone(),
                metadata_hash:    metadata_hash.clone(),
                issuer:           issuer.clone(),
                issued_at_ledger: ledger,
                category:         category.clone(),
                origin_country:   origin_country.clone(),
            },
        );
        env.storage().persistent().set(
            &StorageKey::PassportState(passport_id.clone()),
            &PassportState {
                owner:                owner.clone(),
                is_active:            true,
                last_transfer_ledger: 0u32,
                transfer_count:       0u32,
            },
        );

        let new_count = current
            .checked_add(1)
            .unwrap_or_else(|| panic_with_error!(&env, PassportError::IssuanceCapReached));
        env.storage().persistent().set(&count_key, &new_count);

        const TTL: u32 = 535_000;
        Self::bump_ttl(&env, &passport_id);
        env.storage().persistent().extend_ttl(&count_key, TTL, TTL);

        env.events().publish(
            (symbol_short!("passport"), symbol_short!("emitted")),
            (passport_id.clone(), issuer.clone(), owner.clone()),
        );
        passport_id
    }

    pub fn verify_passport(env: Env, passport_id: String) -> PassportView {
        let data  = Self::load_data(&env, &passport_id);
        let state = Self::load_state(&env, &passport_id);
        Self::bump_ttl(&env, &passport_id);
        PassportView {
            passport_id,
            product_id:           data.product_id,
            metadata_hash:        data.metadata_hash,
            issuer:               data.issuer,
            owner:                state.owner,
            is_active:            state.is_active,
            issued_at_ledger:     data.issued_at_ledger,
            last_transfer_ledger: state.last_transfer_ledger,
            transfer_count:       state.transfer_count,
            category:             data.category,
            origin_country:       data.origin_country,
        }
    }

    pub fn transfer_ownership(env: Env, owner: Address, passport_id: String, new_owner: Address) {
        Self::assert_not_paused(&env);
        let state = Self::load_state(&env, &passport_id);
        if owner != state.owner {
            panic_with_error!(&env, PassportError::NotOwner);
        }
        owner.require_auth();
        if !state.is_active {
            panic_with_error!(&env, PassportError::PassportRevoked);
        }
        if new_owner == state.owner {
            panic_with_error!(&env, PassportError::SameOwner);
        }

        let ledger = env.ledger().sequence();
        let new_count = state.transfer_count.checked_add(1).unwrap_or(u32::MAX);

        env.storage().persistent().set(
            &StorageKey::PassportState(passport_id.clone()),
            &PassportState {
                owner:                new_owner.clone(),
                is_active:            true,
                last_transfer_ledger: ledger,
                transfer_count:       new_count,
            },
        );
        Self::bump_ttl(&env, &passport_id);
        env.events().publish(
            (symbol_short!("passport"), symbol_short!("transf")),
            (passport_id.clone(), owner.clone(), new_owner.clone()),
        );
    }

    pub fn revoke_passport(env: Env, caller: Address, passport_id: String) {
        Self::assert_not_paused(&env);
        let data  = Self::load_data(&env, &passport_id);
        let state = Self::load_state(&env, &passport_id);
        if !state.is_active {
            panic_with_error!(&env, PassportError::PassportRevoked);
        }
        let admin = Self::load_admin(&env);
        if caller != admin && caller != data.issuer {
            panic_with_error!(&env, PassportError::NotCertifiedIssuer);
        }
        caller.require_auth();

        env.storage().persistent().set(
            &StorageKey::PassportState(passport_id.clone()),
            &PassportState { is_active: false, ..state },
        );
        Self::bump_ttl(&env, &passport_id);
        env.events().publish(
            (symbol_short!("passport"), symbol_short!("revoked")),
            (passport_id.clone(), caller.clone()),
        );
    }

    pub fn update_metadata_hash(env: Env, issuer: Address, passport_id: String, new_hash: String) {
        Self::assert_not_paused(&env);
        Self::validate_hash(&env, &new_hash);

        let mut data = Self::load_data(&env, &passport_id);
        let state    = Self::load_state(&env, &passport_id);

        if !state.is_active {
            panic_with_error!(&env, PassportError::PassportRevoked);
        }
        if issuer != data.issuer {
            panic_with_error!(&env, PassportError::NotCertifiedIssuer);
        }
        issuer.require_auth();

        data.metadata_hash = new_hash.clone();
        env.storage().persistent().set(&StorageKey::Passport(passport_id.clone()), &data);
        Self::bump_ttl(&env, &passport_id);
        env.events().publish(
            (symbol_short!("passport"), symbol_short!("updated")),
            passport_id.clone(),
        );
    }

    pub fn add_traceability_event(
        env:        Env,
        issuer:     Address,
        passport_id: String,
        event_type: Symbol,
        notes:      String,
    ) {
        Self::assert_not_paused(&env);

        let data  = Self::load_data(&env, &passport_id);
        let state = Self::load_state(&env, &passport_id);

        if !state.is_active {
            panic_with_error!(&env, PassportError::PassportRevoked);
        }
        if issuer != data.issuer {
            panic_with_error!(&env, PassportError::NotCertifiedIssuer);
        }
        issuer.require_auth();

        const MAX_EVENTS: u32 = 100;
        let count_key   = StorageKey::EventCount(passport_id.clone());
        let event_count = env.storage()
            .persistent()
            .get::<StorageKey, u32>(&count_key)
            .unwrap_or(0u32);
        if event_count >= MAX_EVENTS {
            panic_with_error!(&env, PassportError::EventCapReached);
        }

        let event = TraceabilityEvent {
            event_type: event_type.clone(),
            notes:      notes.clone(),
            ledger:     env.ledger().sequence(),
            issuer:     issuer.clone(),
        };
        let event_key = StorageKey::PassportEvent(passport_id.clone(), event_count);
        env.storage().persistent().set(&event_key, &event);

        let new_count = event_count
            .checked_add(1)
            .unwrap_or_else(|| panic_with_error!(&env, PassportError::EventCapReached));
        env.storage().persistent().set(&count_key, &new_count);

        const TTL: u32 = 535_000;
        env.storage().persistent().extend_ttl(&event_key, TTL, TTL);
        env.storage().persistent().extend_ttl(&count_key, TTL, TTL);

        env.events().publish(
            (symbol_short!("trace"), symbol_short!("added")),
            (passport_id.clone(), event_type.clone()),
        );
    }

    pub fn get_traceability_event(env: Env, passport_id: String, index: u32) -> TraceabilityEvent {
        let count = env.storage()
            .persistent()
            .get::<StorageKey, u32>(&StorageKey::EventCount(passport_id.clone()))
            .unwrap_or(0u32);
        if index >= count {
            panic_with_error!(&env, PassportError::EventIndexOutOfBounds);
        }
        env.storage()
            .persistent()
            .get::<StorageKey, TraceabilityEvent>(
                &StorageKey::PassportEvent(passport_id, index),
            )
            .unwrap_or_else(|| panic_with_error!(&env, PassportError::EventIndexOutOfBounds))
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    pub fn get_event_count(env: Env, passport_id: String) -> u32 {
        env.storage()
            .persistent()
            .get::<StorageKey, u32>(&StorageKey::EventCount(passport_id))
            .unwrap_or(0u32)
    }

    pub fn is_certified_issuer(env: Env, issuer: Address) -> bool {
        env.storage()
            .instance()
            .get::<StorageKey, bool>(&StorageKey::IssuerCertified(issuer))
            .unwrap_or(false)
    }

    pub fn get_admin(env: Env) -> Address {
        Self::load_admin(&env)
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get::<StorageKey, bool>(&StorageKey::Paused)
            .unwrap_or(false)
    }

    pub fn get_issuer_passport_count(env: Env, issuer: Address) -> u32 {
        env.storage()
            .persistent()
            .get::<StorageKey, u32>(&StorageKey::IssuerCount(issuer))
            .unwrap_or(0u32)
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, String, symbol_short};

    fn setup() -> (Env, Address, Address, Address) {
        let env         = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, PassportLatamContract);
        let admin       = Address::generate(&env);
        let issuer      = Address::generate(&env);
        PassportLatamContractClient::new(&env, &contract_id).initialize(&admin);
        (env, contract_id, admin, issuer)
    }

    fn emit_one(
        client: &PassportLatamContractClient,
        env: &Env,
        issuer: &Address,
        owner: &Address,
        product_id: &str,
        hash_char: u8,
    ) -> String {
        let hash = alloc::string::String::from_utf8(alloc::vec![hash_char; 64]).unwrap();
        client.emit_passport(
            issuer,
            &String::from_str(env, product_id),
            &String::from_str(env, &hash),
            owner,
            &symbol_short!("textile"),
            &symbol_short!("BO"),
        )
    }

    // 1
    #[test]
    fn test_initialize_once() {
        let (env, contract_id, admin, _) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        assert!(client.try_initialize(&admin).is_err());
    }

    // 2
    #[test]
    fn test_certify_issuer() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        assert!(!client.is_certified_issuer(&issuer));
        client.certify_issuer(&admin, &issuer);
        assert!(client.is_certified_issuer(&issuer));
    }

    // 3
    #[test]
    fn test_issuer_already_certified_panics() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        client.certify_issuer(&admin, &issuer);
        assert!(client.try_certify_issuer(&admin, &issuer).is_err());
    }

    // 4
    #[test]
    fn test_revoke_issuer() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        client.certify_issuer(&admin, &issuer);
        client.revoke_issuer(&admin, &issuer);
        assert!(!client.is_certified_issuer(&issuer));
    }

    // 5
    #[test]
    fn test_revoke_issuer_not_found_panics() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        assert!(client.try_revoke_issuer(&admin, &issuer).is_err());
    }

    // 6
    #[test]
    fn test_emit_passport_basic() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        let owner  = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);

        let pid = emit_one(&client, &env, &issuer, &owner, "prod-001", b'a');
        let view = client.verify_passport(&pid);
        assert_eq!(view.owner, owner);
        assert_eq!(view.issuer, issuer);
        assert!(view.is_active);
        assert_eq!(view.transfer_count, 0u32);
        assert_eq!(view.category, symbol_short!("textile"));
        assert_eq!(view.origin_country, symbol_short!("BO"));
    }

    // 7
    #[test]
    fn test_passport_id_is_64_chars() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        let owner  = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);
        let pid = emit_one(&client, &env, &issuer, &owner, "prod-002", b'b');
        assert_eq!(pid.len(), 64);
    }

    // 8
    #[test]
    fn test_transfer_ownership() {
        let (env, contract_id, admin, issuer) = setup();
        let client    = PassportLatamContractClient::new(&env, &contract_id);
        let owner     = Address::generate(&env);
        let new_owner = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);
        let pid = emit_one(&client, &env, &issuer, &owner, "prod-003", b'c');
        client.transfer_ownership(&owner, &pid, &new_owner);
        let view = client.verify_passport(&pid);
        assert_eq!(view.owner, new_owner);
        assert_eq!(view.transfer_count, 1u32);
    }

    // 9
    #[test]
    fn test_revoke_by_issuer() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        let owner  = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);
        let pid = emit_one(&client, &env, &issuer, &owner, "prod-004", b'd');
        client.revoke_passport(&issuer, &pid);
        assert!(!client.verify_passport(&pid).is_active);
    }

    // 10
    #[test]
    fn test_revoke_by_admin() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        let owner  = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);
        let pid = emit_one(&client, &env, &issuer, &owner, "prod-005", b'e');
        client.revoke_passport(&admin, &pid);
        assert!(!client.verify_passport(&pid).is_active);
    }

    // 11
    #[test]
    fn test_revoke_by_third_party_panics() {
        let (env, contract_id, admin, issuer) = setup();
        let client      = PassportLatamContractClient::new(&env, &contract_id);
        let owner       = Address::generate(&env);
        let third_party = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);
        let pid = emit_one(&client, &env, &issuer, &owner, "prod-006", b'f');
        assert!(client.try_revoke_passport(&third_party, &pid).is_err());
    }

    // 12
    #[test]
    fn test_pause_blocks_emission() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        let owner  = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);
        client.pause(&admin);
        assert!(client.is_paused());
        let hash = alloc::string::String::from_utf8(alloc::vec![b'0'; 64]).unwrap();
        assert!(client.try_emit_passport(
            &issuer,
            &String::from_str(&env, "prod-007"),
            &String::from_str(&env, &hash),
            &owner,
            &symbol_short!("textile"),
            &symbol_short!("BO"),
        ).is_err());
    }

    // 13
    #[test]
    fn test_unpause_resumes_emission() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        let owner  = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);
        client.pause(&admin);
        client.unpause(&admin);
        assert!(!client.is_paused());
        assert!(emit_one(&client, &env, &issuer, &owner, "prod-008", b'1').len() == 64);
    }

    // 14
    #[test]
    fn test_invalid_hash_panics() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        let owner  = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);
        assert!(client.try_emit_passport(
            &issuer,
            &String::from_str(&env, "prod-009"),
            &String::from_str(&env, "tooshort"),
            &owner,
            &symbol_short!("textile"),
            &symbol_short!("BO"),
        ).is_err());
    }

    // 15
    #[test]
    fn test_empty_product_id_panics() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        let owner  = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);
        let hash = alloc::string::String::from_utf8(alloc::vec![b'a'; 64]).unwrap();
        assert!(client.try_emit_passport(
            &issuer,
            &String::from_str(&env, ""),
            &String::from_str(&env, &hash),
            &owner,
            &symbol_short!("textile"),
            &symbol_short!("BO"),
        ).is_err());
    }

    // 16
    #[test]
    fn test_same_owner_transfer_panics() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        let owner  = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);
        let pid = emit_one(&client, &env, &issuer, &owner, "prod-010", b'2');
        assert!(client.try_transfer_ownership(&owner, &pid, &owner).is_err());
    }

    // 17
    #[test]
    fn test_non_owner_transfer_panics() {
        let (env, contract_id, admin, issuer) = setup();
        let client      = PassportLatamContractClient::new(&env, &contract_id);
        let owner       = Address::generate(&env);
        let third_party = Address::generate(&env);
        let new_owner   = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);
        let pid = emit_one(&client, &env, &issuer, &owner, "prod-011", b'3');
        assert!(client.try_transfer_ownership(&third_party, &pid, &new_owner).is_err());
    }

    // 18
    #[test]
    fn test_add_and_get_traceability_event() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        let owner  = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);
        let pid = emit_one(&client, &env, &issuer, &owner, "prod-012", b'4');

        client.add_traceability_event(
            &issuer,
            &pid,
            &symbol_short!("certif"),
            &String::from_str(&env, "OEKO-TEX certified"),
        );

        let event = client.get_traceability_event(&pid, &0u32);
        assert_eq!(event.event_type, symbol_short!("certif"));
        assert_eq!(event.issuer, issuer);
    }

    // 19
    #[test]
    fn test_event_count_increments() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        let owner  = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);
        let pid = emit_one(&client, &env, &issuer, &owner, "prod-013", b'5');

        assert_eq!(client.get_event_count(&pid), 0u32);
        client.add_traceability_event(
            &issuer, &pid, &symbol_short!("shipped"),
            &String::from_str(&env, "Shipped from La Paz"),
        );
        assert_eq!(client.get_event_count(&pid), 1u32);
        client.add_traceability_event(
            &issuer, &pid, &symbol_short!("arrived"),
            &String::from_str(&env, "Arrived in Buenos Aires"),
        );
        assert_eq!(client.get_event_count(&pid), 2u32);
    }

    // 20
    #[test]
    fn test_update_metadata_hash() {
        let (env, contract_id, admin, issuer) = setup();
        let client   = PassportLatamContractClient::new(&env, &contract_id);
        let owner    = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);
        let pid      = emit_one(&client, &env, &issuer, &owner, "prod-014", b'6');
        let new_hash = String::from_str(
            &env,
            &alloc::string::String::from_utf8(alloc::vec![b'7'; 64]).unwrap(),
        );
        client.update_metadata_hash(&issuer, &pid, &new_hash);
        assert_eq!(client.verify_passport(&pid).metadata_hash, new_hash);
    }

    // 21
    #[test]
    fn test_issuer_passport_count() {
        let (env, contract_id, admin, issuer) = setup();
        let client = PassportLatamContractClient::new(&env, &contract_id);
        let owner  = Address::generate(&env);
        client.certify_issuer(&admin, &issuer);
        assert_eq!(client.get_issuer_passport_count(&issuer), 0u32);
        emit_one(&client, &env, &issuer, &owner, "prod-015", b'8');
        assert_eq!(client.get_issuer_passport_count(&issuer), 1u32);
        emit_one(&client, &env, &issuer, &owner, "prod-016", b'9');
        assert_eq!(client.get_issuer_passport_count(&issuer), 2u32);
    }

    // 22
    #[test]
    fn test_non_issuer_cannot_emit() {
        let (env, contract_id, _, _) = setup();
        let client     = PassportLatamContractClient::new(&env, &contract_id);
        let fake_actor = Address::generate(&env);
        let owner      = Address::generate(&env);
        let hash = alloc::string::String::from_utf8(alloc::vec![b'a'; 64]).unwrap();
        assert!(client.try_emit_passport(
            &fake_actor,
            &String::from_str(&env, "prod-017"),
            &String::from_str(&env, &hash),
            &owner,
            &symbol_short!("textile"),
            &symbol_short!("BO"),
        ).is_err());
    }

    // 23
    #[test]
    fn test_transfer_admin() {
        let (env, contract_id, admin, _) = setup();
        let client    = PassportLatamContractClient::new(&env, &contract_id);
        let new_admin = Address::generate(&env);
        client.transfer_admin(&admin, &new_admin);
        assert_eq!(client.get_admin(), new_admin);
    }
}

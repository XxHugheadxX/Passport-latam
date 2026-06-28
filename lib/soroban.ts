import {
  Address,
  Contract,
  Networks,
  SorobanRpc,
  Transaction,
  TransactionBuilder,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

// ─── Config ───────────────────────────────────────────────────────────────────

function networkPassphrase(): string {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;
}

let _server: SorobanRpc.Server | null = null;
let _contract: Contract | null = null;

function getServer(): SorobanRpc.Server {
  if (!_server) {
    _server = new SorobanRpc.Server(process.env.NEXT_PUBLIC_STELLAR_RPC_URL!);
  }
  return _server;
}

function getContract(): Contract {
  if (!_contract) {
    _contract = new Contract(process.env.NEXT_PUBLIC_CONTRACT_ID!);
  }
  return _contract;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PassportView {
  passport_id: string;
  product_id: string;
  metadata_hash: string;
  issuer: string;
  owner: string;
  is_active: boolean;
  issued_at_ledger: number;
  last_transfer_ledger: number;
  transfer_count: number;
  category: string;
  origin_country: string;
}

export interface EmitPassportParams {
  issuer: string;
  product_id: string;
  metadata_hash: string;
  owner: string;
  category: string;
  origin_country: string;
}

export interface TransferOwnershipParams {
  owner: string;
  passport_id: string;
  new_owner: string;
}

export interface AddTraceabilityEventParams {
  issuer: string;
  passport_id: string;
  event_type: string;
  notes: string;
}

// ─── ScVal helpers ────────────────────────────────────────────────────────────

function str(s: string): xdr.ScVal {
  return xdr.ScVal.scvString(Buffer.from(s, "utf-8"));
}

function sym(s: string): xdr.ScVal {
  return xdr.ScVal.scvSymbol(s);
}

function addr(a: string): xdr.ScVal {
  return new Address(a).toScVal();
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Simulates verify_passport and returns the full PassportView or null if not found.
 * sourcePublicKey must be any funded Stellar account (e.g. the connected wallet).
 */
export async function verifyPassport(
  passportId: string,
  sourcePublicKey: string,
): Promise<PassportView | null> {
  const srv = getServer();
  const account = await srv.getAccount(sourcePublicKey);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(getContract().call("verify_passport", str(passportId)))
    .setTimeout(30)
    .build();

  const sim = await srv.simulateTransaction(tx);
  if (!SorobanRpc.Api.isSimulationSuccess(sim) || !sim.result) return null;

  return scValToNative(sim.result.retval) as PassportView;
}

// ─── Transaction builders ─────────────────────────────────────────────────────

/**
 * Builds an assembled emit_passport transaction ready to be signed by the issuer.
 */
export async function buildEmitPassportTx(
  params: EmitPassportParams,
  sourcePublicKey: string,
): Promise<Transaction> {
  const srv = getServer();
  const account = await srv.getAccount(sourcePublicKey);

  const tx = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(
      getContract().call(
        "emit_passport",
        addr(params.issuer),
        str(params.product_id),
        str(params.metadata_hash),
        addr(params.owner),
        sym(params.category),
        sym(params.origin_country),
      ),
    )
    .setTimeout(30)
    .build();

  const sim = await srv.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  return SorobanRpc.assembleTransaction(tx, sim).build();
}

/**
 * Builds an assembled transfer_ownership transaction ready to be signed by the current owner.
 */
export async function buildTransferOwnershipTx(
  params: TransferOwnershipParams,
  sourcePublicKey: string,
): Promise<Transaction> {
  const srv = getServer();
  const account = await srv.getAccount(sourcePublicKey);

  const tx = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(
      getContract().call(
        "transfer_ownership",
        addr(params.owner),
        str(params.passport_id),
        addr(params.new_owner),
      ),
    )
    .setTimeout(30)
    .build();

  const sim = await srv.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  return SorobanRpc.assembleTransaction(tx, sim).build();
}

/**
 * Builds an assembled add_traceability_event transaction ready to be signed by the issuer.
 */
export async function buildAddTraceabilityEventTx(
  params: AddTraceabilityEventParams,
  sourcePublicKey: string,
): Promise<Transaction> {
  const srv = getServer();
  const account = await srv.getAccount(sourcePublicKey);

  const tx = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(
      getContract().call(
        "add_traceability_event",
        addr(params.issuer),
        str(params.passport_id),
        sym(params.event_type),
        str(params.notes),
      ),
    )
    .setTimeout(30)
    .build();

  const sim = await srv.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  return SorobanRpc.assembleTransaction(tx, sim).build();
}

import { NextRequest, NextResponse } from "next/server";
import {
  Address,
  Contract,
  Keypair,
  Networks,
  rpc,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { createClient } from "@supabase/supabase-js";

// â”€â”€â”€ Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CONTRACT_ID  = process.env.NEXT_PUBLIC_CONTRACT_ID!;
const RPC_URL      = process.env.NEXT_PUBLIC_STELLAR_RPC_URL!;
const NETWORK      = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet";
const PASSPHRASE   = NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
const ADMIN_SECRET = process.env.STELLAR_ADMIN_SECRET_KEY!;

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function addr(a: string): xdr.ScVal {
  return new Address(a).toScVal();
}

const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

// Waits up to 20 s for the transaction to leave NOT_FOUND state.
async function waitForTx(
  server: rpc.Server,
  hash: string,
): Promise<rpc.Api.GetTransactionResponse> {
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const result = await server.getTransaction(hash);
    if (result.status !== rpc.Api.GetTransactionStatus.NOT_FOUND) {
      return result;
    }
  }
  throw new Error("Transaction did not confirm within 20 s");
}

// â”€â”€â”€ POST /api/certify â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function POST(req: NextRequest) {
  // â”€â”€ Auth: solo usuarios autenticados en Supabase pueden certificar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // â”€â”€ Validar wallet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const body = await req.json().catch(() => ({}));
  const { wallet } = body as { wallet?: string };

  if (!wallet || !STELLAR_ADDRESS_RE.test(wallet)) {
    return NextResponse.json({ error: "Invalid Stellar address" }, { status: 400 });
  }

  // â”€â”€ Certificar on-chain â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  try {
    const adminKeypair = Keypair.fromSecret(ADMIN_SECRET);
    const server       = new rpc.Server(RPC_URL);
    const contract     = new Contract(CONTRACT_ID);

    // Construir tx
    const account = await server.getAccount(adminKeypair.publicKey());
    const tx = new TransactionBuilder(account, {
      fee: "1000000",
      networkPassphrase: PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "certify_issuer",
          addr(adminKeypair.publicKey()),
          addr(wallet),
        ),
      )
      .setTimeout(30)
      .build();

    // Simular
    const sim = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(sim)) {
      // Ya estaba certificado â€” no es un error para el frontend
      if (sim.error.includes("IssuerAlreadyCertified") || sim.error.includes("#12")) {
        return NextResponse.json({ certified: true, already: true });
      }
      return NextResponse.json({ error: sim.error }, { status: 500 });
    }

    // Ensamblar, firmar y enviar
    const assembled = rpc.assembleTransaction(tx, sim).build();
    assembled.sign(adminKeypair);

    const sent = await server.sendTransaction(assembled);
    if (sent.status === "ERROR") {
      return NextResponse.json(
        { error: JSON.stringify(sent.errorResult) },
        { status: 500 },
      );
    }

    // Esperar confirmaciÃ³n
    const confirmed = await waitForTx(server, sent.hash);
    if (confirmed.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      return NextResponse.json(
        { error: `Transaction failed: ${confirmed.status}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ certified: true, tx_hash: sent.hash });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}


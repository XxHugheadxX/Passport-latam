import {
  Account,
  Contract,
  rpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk'

const SIMULATION_ACCOUNT = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'
function fakeAccount() {
  return new Account(SIMULATION_ACCOUNT, '0')
}

function getConfig() {
  const rpcUrl = process.env.NEXT_PUBLIC_STELLAR_RPC_URL
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK

  if (!rpcUrl) throw new Error('Missing NEXT_PUBLIC_STELLAR_RPC_URL')
  if (!contractId) throw new Error('Missing NEXT_PUBLIC_CONTRACT_ID')

  return {
    rpcUrl,
    contractId,
    networkPassphrase: network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET,
  }
}

function getServer() {
  const { rpcUrl } = getConfig()
  return new rpc.Server(rpcUrl)
}

function getContract() {
  const { contractId } = getConfig()
  return new Contract(contractId)
}

export function getNetworkPassphrase() {
  return getConfig().networkPassphrase
}

export async function isCertifiedIssuer(address: string): Promise<boolean> {
  const server = getServer()
  const contract = getContract()
  const account = fakeAccount()
  const np = getConfig().networkPassphrase

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: np,
  })
    .addOperation(contract.call('is_certified_issuer', nativeToScVal(address, { type: 'address' })))
    .setTimeout(30)
    .build()

  const result = await server.simulateTransaction(tx)

  if (rpc.Api.isSimulationSuccess(result)) {
    return scValToNative(result.result!.retval) as boolean
  }
  throw new Error('is_certified_issuer failed: ' + JSON.stringify(result))
}

export async function verifyPassport(passportId: string) {
  const server = getServer()
  const contract = getContract()
  const account = fakeAccount()
  const np = getConfig().networkPassphrase

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: np,
  })
    .addOperation(contract.call('verify_passport', nativeToScVal(passportId, { type: 'string' })))
    .setTimeout(30)
    .build()

  const result = await server.simulateTransaction(tx)

  if (rpc.Api.isSimulationError(result)) {
    throw new Error('El contrato respondió con un error: ' + result.error)
  }

  if (!rpc.Api.isSimulationSuccess(result) || !result.result?.retval) {
    throw new Error('No se pudo obtener el resultado del contrato en Stellar.')
  }

  let native
  try {
    native = scValToNative(result.result.retval)
  } catch {
    throw new Error('Error al interpretar la respuesta del contrato. Posiblemente el pasaporte no existe on-chain.')
  }

  // Handle different return formats
  if (typeof native === 'string') {
    return { metadata_hash: native, owner: '', issuer: '' }
  }
  if (Array.isArray(native)) {
    return {
      metadata_hash: String(native[0] ?? ''),
      owner: String(native[1] ?? ''),
      issuer: String(native[2] ?? ''),
    }
  }
  if (native && typeof native === 'object') {
    const obj = native as Record<string, unknown>
    return {
      metadata_hash: String(obj.metadata_hash ?? obj[0] ?? ''),
      owner: String(obj.owner ?? obj[1] ?? ''),
      issuer: String(obj.issuer ?? obj[2] ?? ''),
    }
  }
  return { metadata_hash: String(native), owner: '', issuer: '' }
}

export async function buildEmitPassportTx(
  issuer: string,
  productId: string,
  metadataHash: string,
  owner: string,
  category: string,
  originCountry: string
) {
  const server = getServer()
  const contract = getContract()
  const account = await server.getAccount(issuer)
  const np = getConfig().networkPassphrase

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: np,
  })
    .addOperation(contract.call('emit_passport',
      nativeToScVal(issuer, { type: 'address' }),
      nativeToScVal(productId, { type: 'string' }),
      nativeToScVal(metadataHash, { type: 'string' }),
      nativeToScVal(owner, { type: 'address' }),
      nativeToScVal(category, { type: 'symbol' }),
      nativeToScVal(originCountry, { type: 'symbol' }),
    ))
    .setTimeout(30)
    .build()

  const prepared = await server.prepareTransaction(tx)
  return prepared.toXDR()
}

export async function buildTransferOwnershipTx(
  owner: string,
  passportId: string,
  newOwner: string
) {
  const server = getServer()
  const contract = getContract()
  const account = await server.getAccount(owner)
  const np = getConfig().networkPassphrase

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: np,
  })
    .addOperation(contract.call('transfer_ownership',
      nativeToScVal(owner, { type: 'address' }),
      nativeToScVal(passportId, { type: 'string' }),
      nativeToScVal(newOwner, { type: 'address' }),
    ))
    .setTimeout(30)
    .build()

  const prepared = await server.prepareTransaction(tx)
  return prepared.toXDR()
}

export async function submitAndWait(signedXdr: string) {
  const server = getServer()
  const np = getConfig().networkPassphrase
  const tx = TransactionBuilder.fromXDR(signedXdr, np)
  const response = await server.sendTransaction(tx)

  if (response.status === 'ERROR') {
    throw new Error('Submit failed: ' + response.errorResult)
  }

  let getResponse = await server.getTransaction(response.hash)
  while (getResponse.status === 'NOT_FOUND') {
    await new Promise(r => setTimeout(r, 1000))
    getResponse = await server.getTransaction(response.hash)
  }

  if (getResponse.status === 'SUCCESS') {
    return {
      hash: response.hash,
      result: getResponse.returnValue ? scValToNative(getResponse.returnValue) : null,
    }
  }
  throw new Error('Transaction failed: ' + getResponse.status)
}
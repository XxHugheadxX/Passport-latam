import {
  Contract,
  rpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk'

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
  const sourceAccount = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'
  const account = await server.getAccount(sourceAccount)
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
  const sourceAccount = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'
  const account = await server.getAccount(sourceAccount)
  const np = getConfig().networkPassphrase

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: np,
  })
    .addOperation(contract.call('verify_passport', nativeToScVal(passportId, { type: 'string' })))
    .setTimeout(30)
    .build()

  const result = await server.simulateTransaction(tx)

  if (rpc.Api.isSimulationSuccess(result)) {
    return scValToNative(result.result!.retval)
  }
  throw new Error('verify_passport failed: ' + JSON.stringify(result))
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
    return { hash: response.hash, result: getResponse.returnValue }
  }
  throw new Error('Transaction failed: ' + getResponse.status)
}
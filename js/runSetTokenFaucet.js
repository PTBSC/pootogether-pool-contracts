const hardhat = require("hardhat");

const VALID_CHAIN_IDS = [3, 4, 5, 42, 56, 97]

const toWei = hardhat.ethers.utils.parseEther
const toEth = hardhat.ethers.utils.formatEther

const getChainName = (chainId) => {
  switch (chainId) {
    case 1: return 'mainnet';
    case 3: return 'ropsten';
    case 4: return 'rinkeby';
    case 5: return 'goerli';
    case 42: return 'kovan';
    case 56: return 'BSC';
    case 97: return 'BSC_TESTNET';
    case 31337: return 'HardhatEVM';
    default: return 'unknown';
  }
}

async function getProxy(tx) { 
  await tx.wait()
  const tokenFaucetProxyFactoryDeployment = await deployments.get('TokenFaucetProxyFactory')
  const gnosisSafe = await ethers.provider.getUncheckedSigner('0x7000443212d412ec304f1925b58fe7e8cf681bc6')
  const tokenFaucetProxyFactory = await ethers.getContractAt('TokenFaucetProxyFactory', '0xb2f91435b2A5187A1151639C93Ca0684752Dcc79', gnosisSafe)
  console.log(`Fetching result receipt for: ${tx.hash}\n`)
  const createResultReceipt = await ethers.provider.getTransactionReceipt(tx.hash)
  console.log(`Result receipt: ${createResultReceipt}\n`)
  const createResultEvents = createResultReceipt.logs.map(log => { try { return tokenFaucetProxyFactory.interface.parseLog(log) } catch (e) { return null } })
  return createResultEvents[0].args.proxy
}

async function main() {
  // Run with CLI flag --silent to suppress log output

  console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
  console.log("PoolTogether Pool Contracts - Get Controlled Token")
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")

  const { getNamedAccounts, getChainId, ethers } = hardhat
  const { deployer } = await getNamedAccounts()
  const wallet = [deployer]
  const chainId = parseInt(await getChainId(), 10)
  const chainName = getChainName(chainId)
  if (!VALID_CHAIN_IDS.includes(chainId) || !chainName.length) {
    throw new Error('\nInvalid network specified, aborting.\n\n')
  }
  console.log(`Using network: ${chainName}\n`)

  const signer = await hardhat.ethers.provider.getSigner(deployer)

  // create token faucet

  console.log('starting faucet creation')

  const daiDripAmount = ethers.utils.parseEther('750000') // 750k POO
  const daiDripRate = daiDripAmount.div(98 * 24 * 3600)
  const pooToken = await hardhat.ethers.getContractAt('IERC20Upgradeable', '0x9cda4f937e9083C7216aEBE20d3cA4CE4ad10F11', signer)
  const ticket = '0x7F9875F1BA1B225C4886e1D94B4E6fc5f2ee4114'
  const tfpfArtifact = require('./deployments/BSC_TESTNET/TokenFaucetProxyFactory.json')
  let tfpfContract = new hardhat.ethers.Contract(tfpfArtifact.address, tfpfArtifact.abi, signer)
  const busdTokenFaucetTx = await tfpfContract.create(pooToken.address, ticket, daiDripRate)
  const prizePoolStrategyAddress = '0x34d67A6d1a4e11E1a8Fc0B0eA8f9e5b649dEbD7E'
  const vbusdPrizeStrategyArtifacts = require(`../abis/MultipleWinners.json`)
  let ppStrategy = new hardhat.ethers.Contract(prizePoolStrategyAddress, vbusdPrizeStrategyArtifacts, signer)
  const newTokenFaucetProxyAddress = '0x5c6d926201585AC28fD06B31cDc1BD2690CF81c4' // got manually
  await ppStrategy.SetTokenListener(newTokenFaucetProxyAddress)
  console.log(`Token listener set to ${newTokenFaucetProxyAddress}`)
  await pooToken.transfer(newTokenFaucetProxyAddress, daiDripAmount)
  console.log(`Poo tokens transferred to ${newTokenFaucetProxyAddress}`)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

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


async function getProxy(tx, signer) { 
  await tx.wait()
  const tokenFaucetProxyFactoryDeployment = await deployments.get('TokenFaucetProxyFactory')
  const tokenFaucetProxyFactory = new hardhat.ethers.Contract(tokenFaucetProxyFactoryDeployment.address, tokenFaucetProxyFactoryDeployment.abi, signer)
  const createResultReceipt = await ethers.provider.getTransactionReceipt(tx.hash)
  const createResultEvents = createResultReceipt.logs.map(log => { try { return tokenFaucetProxyFactory.interface.parseLog(log) } catch (e) { return null } })
  return createResultEvents[0].args.proxy
}

async function getLogs(tx, contract) {
  // Waiting for inclusion and receipt generation
  await tx.wait()
  const createResultReceipt = await ethers.provider.getTransactionReceipt(tx.hash)
  const createResultEvents = createResultReceipt.logs.map(log => { try { return contract.interface.parseLog(log) } catch (e) { return null } })
  return createResultEvents.filter(x => x)
}

async function main() {
  // Run with CLI flag --silent to suppress log output

  console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
  console.log("PoolTogether Pool Contracts - Testnet Transactions Script")
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")

  const { getNamedAccounts, getChainId, ethers } = hardhat
  const { deployer, rng } = await getNamedAccounts()
  const wallet = [deployer]
  const chainId = parseInt(await getChainId(), 10)
  const chainName = getChainName(chainId)
  if (!VALID_CHAIN_IDS.includes(chainId) || !chainName.length) {
    throw new Error('\nInvalid network specified, aborting.\n\n')
  }
  console.log(`Using network: ${chainName}\n`)

  // Get instance / object PoolWithMultipleWinnersBuilder build
  const pwmwbArtifacts = require(`../deployments/${chainName}/PoolWithMultipleWinnersBuilder.json`)

  console.log(`\n  Loading PoolWithMultipleWinnersBuilder from address: "${pwmwbArtifacts.address}"...`)
  const signer = await hardhat.ethers.provider.getSigner(deployer)
  const pwmwb = new hardhat.ethers.Contract(pwmwbArtifacts.address, pwmwbArtifacts.abi, signer)
  const vBUSDToken = await ethers.getContractAt('IERC20Upgradeable', '0x08e0A5575De71037aE36AbfAfb516595fE68e5e4', signer)
  const BUSDToken = await ethers.getContractAt('IERC20Upgradeable', '0x8301F2213c0eeD49a7E28Ae4c3e91722919B8B47', signer)
  

  // set params
  const now = () => (new Date()).getTime() / 1000 | 0

  let multipleWinnersConfig = {
    rngService: rng,
    prizePeriodStart: now(),
    prizePeriodSeconds: 1000,
    ticketName: "Poo Venus BUSD",
    ticketSymbol: "PvBUSD",
    sponsorshipName: "SponsorPoo",
    sponsorshipSymbol: "SPOO",
    ticketCreditLimitMantissa: toWei('0.01'),
    ticketCreditRateMantissa: toWei('0.000000005787037037'), // 10 day cooldown for 1% fee
    numberOfWinners: 1
  }
  let prizePoolConfig = {
    cToken: vBUSDToken.address, //vBUSD TESTNET
    maxExitFeeMantissa: toWei('0.1'),
    maxTimelockDuration: 2419200
  }
  let decimals = 18

  // call createCompoundMultipleWinners

  console.log(`\n  Creating PoolWithMultipleWinnersBuilder from address: "${pwmwbArtifacts.address}"...`)
  let tx = await pwmwb.createCompoundMultipleWinners(
    prizePoolConfig,
    multipleWinnersConfig,
    decimals
  )
  //////////////////////////////////////
  // Script Complete
  /////////////////////////////////////
  let logs = await getLogs(tx, pwmwb)
  let prizePool
  let prizePoolStrategy
  for (const eventLog of logs) {
    if (eventLog.eventFragment.name == 'CompoundPrizePoolWithMultipleWinnersCreated') {
      prizePool = eventLog.args['prizePool']
      prizePoolStrategy = eventLog.args['prizeStrategy']
    }
  }

  const prizePoolStrategyArtifacts = require(`../abis/MultipleWinners.json`)
  const prizePoolStrategyContract = new hardhat.ethers.Contract(prizePoolStrategy, prizePoolStrategyArtifacts, signer)
  
  const prizePoolArtifacts = require(`../abis/PrizePool.json`)
  const prizePoolContract = new hardhat.ethers.Contract(prizePool, prizePoolArtifacts, signer)

  let prizePoolControlledTokens = await prizePoolContract.tokens()
  
  console.log(`Created PrizePool at ${prizePool} => ${tx.hash}`)
  console.log(`Created prizePoolStrategy at ${prizePoolStrategy} => ${tx.hash}`)
  console.log(`PrizePool controlled tokens are sponsor: ${prizePoolControlledTokens[0]} and ticket: ${prizePoolControlledTokens[1]}`)
  // TokenFaucet testing
  console.log('starting faucet creation')

  const allocatedToken = ethers.utils.parseEther('750000')
  const dripRate = allocatedToken.div(98 * 24 * 3600)

  // getter
  const tfpArtifacts = require(`../deployments/${chainName}/TokenFaucetProxyFactory.json`)
  const tokenFaucetProxyFactory = new hardhat.ethers.Contract(tfpArtifacts.address, tfpArtifacts.abi, signer)

  const vbusdPrizeStrategyArtifacts = require(`../abis/MultipleWinners.json`)
  const vbusdPrizeStrategy = new hardhat.ethers.Contract(prizePoolStrategy, vbusdPrizeStrategyArtifacts, signer)
  const pooToken = await ethers.getContractAt('IERC20Upgradeable', '0xeA5633dd173c9BD34570Ceacc73Ea976711Fe26f', signer)

  let ticket = await vbusdPrizeStrategy.ticket()
  // Create token faucet
  tx = await tokenFaucetProxyFactory.create(pooToken.address, ticket, dripRate)
  const vbusdTokenFaucet = await getProxy(tx, signer)
  console.log([pooToken.address, ticket, dripRate,vbusdTokenFaucet])
  console.log(`Created TokenFaucet at ${vbusdTokenFaucet} => ${tx.hash}`)
  tx = await vbusdPrizeStrategy.setTokenListener(vbusdTokenFaucet)
  console.log(`Set Token Listener at ${vbusdTokenFaucet} => ${tx.hash}`)

  tx = await pooToken.transfer(vbusdTokenFaucet, allocatedToken) // pootoken
  console.log(`Transfer  ${vbusdTokenFaucet} => ${tx.hash}`)

  console.log({
    busdPrizePool: prizePool,
    busdControlledToken: ticket,
    busdPrizePoolStrategy: prizePoolStrategy,
    busdTokenFaucet: vbusdTokenFaucet,
    poo: pooToken.address,
  })

  // Deposit to pool with deployer for a ticket (TEST)
  tx = await BUSDToken.approve(prizePool, ethers.constants.MaxUint256)
  console.log(`Approve `+ethers.constants.MaxUint256+` => ${tx.hash}`)
  tx = await prizePoolContract.depositTo(
    deployer,
    toWei('1'),
    ticket,
    '0x0000000000000000000000000000000000000000', {gasLimit: 20000000})

  console.log(`Deposit for 1 unit => ${tx.hash}`)
  console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")
  process.exit(0)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

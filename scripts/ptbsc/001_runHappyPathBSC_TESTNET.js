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
  const { deployer, rng, pool, BUSDTokenAddr, vBUSDTokenAddr } = await getNamedAccounts()
  const chainId = parseInt(await getChainId(), 10)
  const chainName = getChainName(chainId)
  if (!VALID_CHAIN_IDS.includes(chainId) || !chainName.length) {
    throw new Error('\nInvalid network specified, aborting.\n\n')
  }
  console.log(`Using network: ${chainName}\n`)

  // Get instance / object PoolWithMultipleWinnersBuilder build
  const pwmwbArtifacts = require(`../../deployments/${chainName}/PoolWithMultipleWinnersBuilder.json`)

  console.log(`\n  Loading PoolWithMultipleWinnersBuilder from address: "${pwmwbArtifacts.address}"...`)
  const signer = await hardhat.ethers.provider.getSigner(deployer)
  const pwmwb = new hardhat.ethers.Contract(pwmwbArtifacts.address, pwmwbArtifacts.abi, signer)
  const vBUSDToken = await ethers.getContractAt('IERC20Upgradeable', vBUSDTokenAddr, signer)
  const BUSDToken = await ethers.getContractAt('IERC20Upgradeable', BUSDTokenAddr, signer)
  
  const isTestnet = chainId != 56

  console.log(`Testnet configuration: ${isTestnet}`)
  // set params
  const now = () => (new Date()).getTime() / 1000 | 0
  const week = 3600 * 24 * 7

  const prizePeriodSeconds = isTestnet ? 1000 : week

  let multipleWinnersConfig = {
    rngService: rng,
    prizePeriodStart: now(),
    prizePeriodSeconds: prizePeriodSeconds,
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

  const prizePoolStrategyArtifacts = require(`../../abis/MultipleWinners.json`)
  const prizePoolStrategyContract = new hardhat.ethers.Contract(prizePoolStrategy, prizePoolStrategyArtifacts, signer)
  
  const prizePoolArtifacts = require(`../../abis/PrizePool.json`)
  const prizePoolContract = new hardhat.ethers.Contract(prizePool, prizePoolArtifacts, signer)

  let prizePoolControlledTokens = await prizePoolContract.tokens()
  
  console.log(`Created PrizePool at ${prizePool} => ${tx.hash}`)
  console.log(`Created prizePoolStrategy at ${prizePoolStrategy} => ${tx.hash}`)
  console.log(`PrizePool controlled tokens are sponsor: ${prizePoolControlledTokens[0]} and ticket: ${prizePoolControlledTokens[1]}`)
  // TokenFaucet testing
  console.log('starting faucet creation')

  const allocatedToken = ethers.utils.parseEther('250000')
  const dripRate = allocatedToken.div(98 * 24 * 3600)

  // getter
  const tfpArtifacts = require(`../../deployments/${chainName}/TokenFaucetProxyFactory.json`)
  const tokenFaucetProxyFactory = new hardhat.ethers.Contract(tfpArtifacts.address, tfpArtifacts.abi, signer)

  const vbusdPrizeStrategyArtifacts = require(`../../abis/MultipleWinners.json`)
  const vbusdPrizeStrategy = new hardhat.ethers.Contract(prizePoolStrategy, vbusdPrizeStrategyArtifacts, signer)
  const pooToken = await ethers.getContractAt('IERC20Upgradeable', pool, signer)

  let ticket = await vbusdPrizeStrategy.ticket()
  // Create token faucet
  tx = await tokenFaucetProxyFactory.create(pooToken.address, ticket, dripRate)
  const vbusdTokenFaucet = await getProxy(tx, signer)
  console.log([pooToken.address, ticket, dripRate,vbusdTokenFaucet])
  console.log(`Created TokenFaucet at ${vbusdTokenFaucet} => ${tx.hash}`)
  tx = await vbusdPrizeStrategy.setTokenListener(vbusdTokenFaucet)
  console.log(`Set Token Listener at ${vbusdTokenFaucet} => ${tx.hash}`)

// Move to disburse
  tx = await pooToken.transfer(vbusdTokenFaucet, allocatedToken) // pootoken
  console.log(`Transfer  ${vbusdTokenFaucet} => ${tx.hash}`)

/*
  // Deposit to pool with deployer for a ticket (TEST)
  tx = await BUSDToken.approve(prizePool, ethers.constants.MaxUint256)
  console.log(`Approve `+ethers.constants.MaxUint256+` => ${tx.hash}`)
  tx = await prizePoolContract.depositTo(
    deployer,
    toWei('1'),
    ticket,
    '0x0000000000000000000000000000000000000000', {gasLimit: 20000000})

  console.log(`Deposit for 1 unit => ${tx.hash}`)*/
  console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")
  process.exit(0)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

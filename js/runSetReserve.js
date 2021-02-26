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

async function main() {
  // Run with CLI flag --silent to suppress log output

  console.log("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
  console.log("PoolTogether Pool Contracts - Set Reserve Fee")
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

  // load registry
  const registryArtifact = require(`../abis/Registry.json`)
  const registryAddress = '0x1f6caa8140D43Fd2baaf239ea8926f901d9688A0'
  let registryContract = new hardhat.ethers.Contract(registryAddress, registryArtifact, signer)

  const reserveAddress = await registryContract.lookup()
  

  const reserveArtifact = require(`../abis/Reserve.json`)
  let reserveContract = new hardhat.ethers.Contract(reserveAddress, reserveArtifact, signer)

  await reserveContract.setRateMantissa(toWei('0.1'))

  // withdraw reserve example
  // await reserveContract.withdrawReserve('0x83315fA0caa1D5682cE7F62Df1e597647f20ba1a', '0x793D91FABF7fAA2e973e120B129f63A65b485Ff9')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
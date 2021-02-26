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
    const pooToken = await ethers.getContractAt('IERC20Upgradeable', '0x9cda4f937e9083C7216aEBE20d3cA4CE4ad10F11', signer)
    const allocatedToken = ethers.utils.parseEther('750000')
    // sends poo tokens to the LP unipool reward faucet
    const pooToken = await ethers.getContractAt('IERC20Upgradeable', '0x17fddb10BE012503c20478Ee2c109f4767fC89B1', signer)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
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
    console.log("PooTogether Pool Contracts - PrizeStrategy Test")
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
  
    // get the prize strategy

    const prizePoolStrategyAddress = '0x34d67A6d1a4e11E1a8Fc0B0eA8f9e5b649dEbD7E'
    const vbusdPrizeStrategyArtifacts = require(`../abis/MultipleWinners.json`)
    let prizeStrategy = new hardhat.ethers.Contract(prizePoolStrategyAddress, vbusdPrizeStrategyArtifacts, signer)

    // get the prize pool
    const prizePoolAddress = '0x83315fA0caa1D5682cE7F62Df1e597647f20ba1a'
    const prizePoolArtifacts = require(`../abis/PrizePool.json`)
    let prizePool = new hardhat.ethers.Contract(prizePoolAddress, prizePoolArtifacts, signer)

    // before starting it, check if you have added all the external erc20s that you want to be awarded
    // await ppStrategy.addExternalErc20Award('0x16227d60f7a0e586c66b005219dfc887d13c9531')

    console.log(`Checking if can start award\n`)
    // if we cannot complete, let's startt it
    if (await prizeStrategy.canStartAward()) {
        console.log(`Starting award\n`)        
        await prizeStrategy.startAward()
        console.log(`10s wait for RNG service to complete\n`)
        await new Promise(resolve => setTimeout(resolve, 10000));
    }




    console.log(`Checking if can complete award\n`)
    if (await prizeStrategy.canCompleteAward()) {
        console.log(`Can complete award\n`)
        const completeAwardTx = await prizeStrategy.completeAward()
        const completeAwardReceipt = await hardhat.ethers.provider.getTransactionReceipt(completeAwardTx.hash)
        const completeAwardEvents = completeAwardReceipt.logs.reduce((array, log) => { try { array.push(prizePool.interface.parseLog(log)) } catch (e) {} return array }, [])
        const awardedEvents = completeAwardEvents.filter(event => event.name === 'Awarded')
        const awardedExternalERC721Events = completeAwardEvents.filter(event => event.name === 'AwardedExternalERC721')
        const awardedExternalERC20Events = completeAwardEvents.filter(event => event.name === 'AwardedExternalERC20')
        console.log(`Winners log start\n`)
        const winners = new Set()
      
        awardedEvents.forEach(event => {
          console.log(`Awarded ${ethers.utils.formatEther(event.args.amount)} of token ${event.args.token} to ${event.args.winner}`)
          winners.add(event.args.winner)
        })

        awardedExternalERC20Events.forEach(event => {
          console.log(`Awarded ${ethers.utils.formatEther(event.args.amount)} of token ${event.args.token} to ${event.args.winner}`)
          winners.add(event.args.winner)
        })
      
        awardedExternalERC721Events.forEach(event => {
          console.log(`Awarded external erc721 ${event.args.token} token ids ${event.args.tokenIds.join(', ')} to ${event.args.winner}`)
          winners.add(event.args.winner)
        })
      }



}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

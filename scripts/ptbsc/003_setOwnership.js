const hardhat = require('hardhat')
const chalk = require("chalk")

function dim() {
  console.log(chalk.dim.call(chalk, ...arguments))
}

function green() {
  console.log(chalk.green.call(chalk, ...arguments))
}

const { ethers, deployments, getNamedAccounts } = hardhat

async function run() {
  const { deployer } = await getNamedAccounts()
  const signer = await hardhat.ethers.provider.getSigner(deployer)

  const contractList = await deployments.all()

  for (const entity in contractList) {
    const addr = contractList[entity].address
    const ownableToken = await ethers.getContractAt('OwnableUpgradeable', addr, signer)
    try {
        let owner = await ownableToken.callStatic.owner()
        dim(`Contract owner of ${addr} is ${owner}`)
    } catch (e) {
        continue
    }
    //
  }
}

run()

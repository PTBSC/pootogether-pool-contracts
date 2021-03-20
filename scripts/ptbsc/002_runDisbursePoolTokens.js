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
  const { deployer, pool } = await getNamedAccounts()
  const signer = await hardhat.ethers.provider.getSigner(deployer)
  const poolToken = await ethers.getContractAt('IERC20Upgradeable', pool, signer)

//  dim(`Disbursing to liquidity program...`)
//  await poolToken.transfer('0xA743f8A9d7c2d7e56e6983d0b60FF19EBc0cE727', ethers.utils.parseEther('750000'))

  dim(`Disbursing to merkle distributor...`)
  let tx = await poolToken.transfer('0x18115ffAA133b60aAE45b5cf9dDF27d4dE6A0730', ethers.utils.parseEther('2000000'))
  dim(`TX Hash => ${tx.hash}`)

}

run()

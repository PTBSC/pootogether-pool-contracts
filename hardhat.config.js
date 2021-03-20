const networks = require('./hardhat.networks')

const RNGBlockhashRopsten = require('@pooltogether/pooltogether-rng-contracts/deployments/ropsten/RNGBlockhash.json')
const RNGBlockhashRinkeby = require('@pooltogether/pooltogether-rng-contracts/deployments/rinkeby/RNGBlockhash.json')
const RNGBlockhashKovan = require('@pooltogether/pooltogether-rng-contracts/deployments/kovan/RNGBlockhash.json')

require("@nomiclabs/hardhat-waffle");
require('hardhat-deploy')
require('hardhat-deploy-ethers')
require('solidity-coverage')
require("@nomiclabs/hardhat-etherscan")
require('hardhat-abi-exporter')

const testnetAdmin = '0xE0F4217390221aF47855E094F6e112D43C8698fE' // Account 1
const testnetUser1 = '0xeedDf4937E3A7aBe03E08963C3c20affbD770b51' // Account 3
const testnetUser2 = '0xcE53382F96FdE0DB592574ed2571B3307dB859Ce' // Account 4
const testnetUser3 = '0x381843c8b4a4a0Da3C0800708c84AA2d792D22b1' // Account 5

const optimizerEnabled = !process.env.OPTIMIZER_DISABLED

const config = {
  solidity: {
    version: "0.6.12",
    settings: {
      optimizer: {
        enabled: optimizerEnabled,
        runs: 200
      },
      evmVersion: "istanbul"
    }
  },
  networks,
  gasReporter: {
    currency: 'CHF',
    gasPrice: 21,
    enabled: (process.env.REPORT_GAS) ? true : false
  },
  namedAccounts: {
    deployer: {
      default: 0
    },
    pool: {
      default: "0x07c03e176FB92fD7C932880b8cdFd09FC9834592"
    },
    vBUSDTokenAddr: {
      56: '0x95c78222B3D6e262426483D42CfA53685A67Ab9D',
      97: '0x08e0A5575De71037aE36AbfAfb516595fE68e5e4'
    },
    BUSDTokenAddr: {
      56: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
      97: '0x8301f2213c0eed49a7e28ae4c3e91722919b8b47'
    },
    comptroller: {
      1: '0x4027dE966127af5F015Ea1cfd6293a3583892668',
      97: '0x1D68110AB521597ed0D78Bf7e60E5040306D8740'
    },
    reserveRegistry: {
      1: '0x3e8b9901dBFE766d3FE44B36c180A1bca2B9A295',
      97: '0xEF1A31406b33C2F2F80e3520441dd6bf36c733e9'
    },
    rng: {
      42: RNGBlockhashKovan.address,
      4: RNGBlockhashRinkeby.address,
      3: RNGBlockhashRopsten.address,
      56: '0xeDd591436169297c2B9A11ED55f71A33F4BcC36c',
      97: '0x85Fce8834f5631cadbBCdDCb22feDed1200dB160'
    },
    adminAccount: {
      42: testnetAdmin,
      4: testnetAdmin,
      3: testnetAdmin
    },
    testnetUser1: {
      default: testnetUser1,
      3: testnetUser1,
      4: testnetUser1,
      42: testnetUser1,
    },
    testnetUser2: {
      default: testnetUser2,
      3: testnetUser2,
      4: testnetUser2,
      42: testnetUser2,
    },
    testnetUser3: {
      default: testnetUser3,
      3: testnetUser3,
      4: testnetUser3,
      42: testnetUser3,
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  mocha: {
    timeout: 30000
  },
  abiExporter: {
    path: './abis',
    clear: true,
    flat: true
  }
};

module.exports = config

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
      default: "0x07c03e176FB92fD7C932880b8cdFd09FC9834592",
      56: '0x0B20198aae954782848C9D019370C771245f0d48',
      97: '0x07c03e176FB92fD7C932880b8cdFd09FC9834592'
    },
    vBUSDTokenAddr: {
      56: '0x95c78222B3D6e262426483D42CfA53685A67Ab9D',
      97: '0x08e0A5575De71037aE36AbfAfb516595fE68e5e4'
    },
    vBNBTokenAddr: {
      56: '0xA07c5b74C9B40447a954e1466938b865b6BBea36',
      97: '0x2E7222e51c0f6e98610A1543Aa3836E092CDe62c'
    },
    BNBTokenAddr: {
      56: '0x094616f0bdfb0b526bd735bf66eca0ad254ca81f',
      97: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
    },
    BUSDTokenAddr: {
      56: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
      97: '0x8301f2213c0eed49a7e28ae4c3e91722919b8b47'
    },
    comptroller: {
      1: '',
      56: '0xCA8Bd35d14A96904Ae841Abb737fa2f786412f76',
      97: '0x1D68110AB521597ed0D78Bf7e60E5040306D8740'
    },
    reserveRegistry: {
      1: '',
      56: '0xe3Fef3AE02353b6c4b7C883d757d5e1caEc1D17c',
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

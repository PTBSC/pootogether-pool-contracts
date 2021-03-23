const ethers = require('ethers')

const networks = {
  coverage: {
    url: 'http://127.0.0.1:8555',
    blockGasLimit: 200000000,
    allowUnlimitedContractSize: true
  },
  localhost: {
    url: 'http://127.0.0.1:8545',
    blockGasLimit: 200000000,
    allowUnlimitedContractSize: true
  },
  BSC: {
    chainId: 56,
    url: 'https://bsc-dataseed.binance.org/',
    accounts: [""]
  },
  BSC_TESTNET: {
    chainId: 97,
    url: 'https://data-seed-prebsc-2-s1.binance.org:8545/',
    accounts: [""] 
  }
}

if (process.env.INFURA_API_KEY) {
  networks.hardhat = {
    chainId: 1,
    hardfork: "istanbul",
    forking: {
      url: process.env.ALCHEMY_URL,
      blockNumber: 11870772
    },
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
  networks.poaMainnet = {
    chainId: 99,
    url: 'https://core.poanetwork.dev',
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
  networks.poaSokol = {
    chainId: 77,
    url: 'https://sokol.poa.network',
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
}

if (process.env.INFURA_API_KEY && process.env.HDWALLET_MNEMONIC) {
  networks.kovan = {
    url: `https://kovan.infura.io/v3/${process.env.INFURA_API_KEY}`,
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }

  networks.ropsten = {
    url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }

  networks.rinkeby = {
    url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }

  networks.mainnet = {
    url: process.env.ALCHEMY_URL,
    accounts: {
      mnemonic: process.env.HDWALLET_MNEMONIC
    }
  }
} else {
  console.warn('No infura or hdwallet available for testnets')
}

module.exports = networks

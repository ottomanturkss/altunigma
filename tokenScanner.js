const Web3 = require('web3');

// Standard ERC-20 ABI for token balance checking
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  }
];

// Common ERC-20 tokens on Ethereum mainnet
const COMMON_TOKENS = {
  'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  'LINK': '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  'UNI': '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  'AAVE': '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  'COMP': '0xc00e94Cb662C3520282E6f5717214004A7f26888',
  'MKR': '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
  'SNX': '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F'
};

class TokenScanner {
  constructor(web3Provider) {
    // Handle both Web3 instance or provider URL
    if (typeof web3Provider === 'string') {
      this.web3 = new Web3(web3Provider);
    } else if (web3Provider instanceof Web3) {
      this.web3 = web3Provider;
    } else {
      throw new Error('Invalid web3 provider');
    }
    
    this.tokenContracts = {};
    
    // Initialize token contracts
    Object.entries(COMMON_TOKENS).forEach(([symbol, address]) => {
      this.tokenContracts[symbol] = new this.web3.eth.Contract(ERC20_ABI, address);
    });
  }

  /**
   * Get token information (name, symbol, decimals)
   * @param {string} tokenSymbol - The token symbol
   * @returns {Promise<Object>} Token information
   */
  async getTokenInfo(tokenSymbol) {
    try {
      const contract = this.tokenContracts[tokenSymbol];
      if (!contract) {
        throw new Error(`Token ${tokenSymbol} not found`);
      }

      // Use Promise.allSettled to handle potential failures
      const [nameResult, symbolResult, decimalsResult] = await Promise.allSettled([
        contract.methods.name().call(),
        contract.methods.symbol().call(),
        contract.methods.decimals().call()
      ]);

      return { 
        name: nameResult.status === 'fulfilled' ? nameResult.value : tokenSymbol,
        symbol: symbolResult.status === 'fulfilled' ? symbolResult.value : tokenSymbol,
        decimals: decimalsResult.status === 'fulfilled' ? parseInt(decimalsResult.value) : 18
      };
    } catch (error) {
      console.error(`Error getting token info for ${tokenSymbol}:`, error.message);
      return { name: tokenSymbol, symbol: tokenSymbol, decimals: 18 };
    }
  }

  /**
   * Get token balance for an address
   * @param {string} address - The wallet address
   * @param {string} tokenSymbol - The token symbol
   * @returns {Promise<string>} Token balance in human-readable format
   */
  async getTokenBalance(address, tokenSymbol) {
    try {
      const contract = this.tokenContracts[tokenSymbol];
      if (!contract) {
        throw new Error(`Token ${tokenSymbol} not found`);
      }

      const balance = await contract.methods.balanceOf(address).call();
      const tokenInfo = await this.getTokenInfo(tokenSymbol);
      
      // Convert from wei to token units based on decimals
      const formattedBalance = this.web3.utils.fromWei(
        balance.padEnd(tokenInfo.decimals + 1, '0'), 
        'ether'
      );
      
      return formattedBalance;
    } catch (error) {
      console.error(`Error getting ${tokenSymbol} balance for ${address}:`, error.message);
      return 'Error';
    }
  }

  /**
   * Get balances for all common tokens for an address
   * @param {string} address - The wallet address
   * @returns {Promise<Object>} Object with token symbols as keys and balances as values
   */
  async getAllTokenBalances(address) {
    const balances = {};
    const tokenSymbols = Object.keys(this.tokenContracts);
    
    // Use Promise.allSettled to handle potential failures
    const results = await Promise.allSettled(
      tokenSymbols.map(async (symbol) => {
        const balance = await this.getTokenBalance(address, symbol);
        return { symbol, balance };
      })
    );
    
    // Process results
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const { symbol, balance } = result.value;
        balances[symbol] = balance;
      }
    });
    
    return balances;
  }

  /**
   * Get list of available token symbols
   * @returns {Array<string>} Array of token symbols
   */
  getAvailableTokens() {
    return Object.keys(this.tokenContracts);
  }
}

module.exports = TokenScanner; 
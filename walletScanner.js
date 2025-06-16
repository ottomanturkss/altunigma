const bip39 = require('bip39');
const hdkey = require('hdkey');
const Web3 = require('web3');
const EthereumjsWallet = require('ethereumjs-wallet').default;

// Configuration
const INFURA_API_KEY = process.env.INFURA_API_KEY || 'your_infura_api_key_here';
const INFURA_NETWORK = process.env.INFURA_NETWORK || 'mainnet';
const DERIVATION_PATH = process.env.DERIVATION_PATH || "m/44'/60'/0'/0/";

// Initialize Web3 with Infura
const DEFAULT_WEB3_PROVIDER = `https://${INFURA_NETWORK}.infura.io/v3/${INFURA_API_KEY}`;
const web3 = new Web3(DEFAULT_WEB3_PROVIDER);

/**
 * Create a new Web3 instance with a custom provider
 * @param {string} provider - Custom RPC provider URL
 * @returns {Web3} New Web3 instance
 */
function createWeb3WithProvider(provider) {
  return new Web3(provider || DEFAULT_WEB3_PROVIDER);
}

/**
 * Generate a new mnemonic phrase
 * @param {string} wordCount - Number of words (12 or 24)
 * @returns {string} Mnemonic phrase
 */
function generateMnemonic(wordCount) {
  const strength = wordCount === '24' ? 256 : 128; // 128 bits for 12 words, 256 for 24 words
  return bip39.generateMnemonic(strength);
}

/**
 * Derive addresses from mnemonic
 * @param {string} mnemonic - Mnemonic phrase
 * @param {number} numAddresses - Number of addresses to derive
 * @returns {Promise<Array>} Array of derived addresses
 */
async function deriveAddresses(mnemonic, numAddresses) {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }

  const seed = await bip39.mnemonicToSeed(mnemonic);
  const hdwallet = hdkey.fromMasterSeed(seed);
  const addresses = [];

  for (let i = 0; i < numAddresses; i++) {
    const path = `${DERIVATION_PATH}${i}`;
    const wallet = hdwallet.derive(path);
    const privateKey = wallet.privateKey;
    const ethWallet = EthereumjsWallet.fromPrivateKey(Buffer.from(privateKey));
    const address = ethWallet.getAddressString();
    const privateKeyHex = '0x' + privateKey.toString('hex');
    
    addresses.push({ 
      index: i, 
      address, 
      path,
      privateKey: privateKeyHex
    });
  }

  return addresses;
}

/**
 * Get wallet balance
 * @param {string} address - Ethereum address
 * @param {string} customProvider - Optional custom RPC provider
 * @returns {Promise<string>} Balance in ETH
 */
async function getWalletBalance(address, customProvider) {
  try {
    const customWeb3 = customProvider ? createWeb3WithProvider(customProvider) : web3;
    const balance = await customWeb3.eth.getBalance(address);
    return customWeb3.utils.fromWei(balance, 'ether');
  } catch (error) {
    console.error(`Error fetching balance for ${address}:`, error.message);
    return 'Error';
  }
}

/**
 * Get transaction count
 * @param {string} address - Ethereum address
 * @param {string} customProvider - Optional custom RPC provider
 * @returns {Promise<number>} Transaction count
 */
async function getTransactionCount(address, customProvider) {
  try {
    const customWeb3 = customProvider ? createWeb3WithProvider(customProvider) : web3;
    return await customWeb3.eth.getTransactionCount(address);
  } catch (error) {
    console.error(`Error fetching transaction count for ${address}:`, error.message);
    return 'Error';
  }
}

module.exports = {
  generateMnemonic,
  deriveAddresses,
  getWalletBalance,
  getTransactionCount,
  createWeb3WithProvider,
  DEFAULT_WEB3_PROVIDER
}; 
require('dotenv').config();
const bip39 = require('bip39');
const hdkey = require('hdkey');
const Web3 = require('web3');
const { program } = require('commander');
const EthereumjsWallet = require('ethereumjs-wallet').default;
const TokenScanner = require('./tokenScanner');

// Configuration
const INFURA_API_KEY = process.env.INFURA_API_KEY || 'your_infura_api_key_here';
const INFURA_NETWORK = process.env.INFURA_NETWORK || 'mainnet';
const NUM_ADDRESSES = parseInt(process.env.NUM_ADDRESSES || '5');
const DERIVATION_PATH = process.env.DERIVATION_PATH || "m/44'/60'/0'/0/";

// Initialize Web3 with Infura
const web3Provider = `https://${INFURA_NETWORK}.infura.io/v3/${INFURA_API_KEY}`;
const web3 = new Web3(web3Provider);
const tokenScanner = new TokenScanner(web3Provider);

// Command line interface setup
program
  .version('1.0.0')
  .description('Wallet Scanner - Scan Ethereum wallets using mnemonic phrases')
  .option('-m, --mnemonic <phrase>', 'Mnemonic phrase (12 or 24 words)')
  .option('-g, --generate <words>', 'Generate a new mnemonic (12 or 24 words)', '12')
  .option('-n, --num-addresses <number>', 'Number of addresses to derive', NUM_ADDRESSES.toString())
  .option('-t, --tokens', 'Scan for ERC-20 token balances')
  .option('-s, --specific-token <symbol>', 'Scan for a specific ERC-20 token balance')
  .parse(process.argv);

const options = program.opts();

// Function to generate a new mnemonic
function generateMnemonic(wordCount) {
  const strength = wordCount === '24' ? 256 : 128; // 128 bits for 12 words, 256 for 24 words
  return bip39.generateMnemonic(strength);
}

// Function to derive addresses from mnemonic
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
    addresses.push({ index: i, address, path });
  }

  return addresses;
}

// Function to get wallet balance
async function getWalletBalance(address) {
  try {
    const balance = await web3.eth.getBalance(address);
    return web3.utils.fromWei(balance, 'ether');
  } catch (error) {
    console.error(`Error fetching balance for ${address}:`, error.message);
    return 'Error';
  }
}

// Function to get transaction count
async function getTransactionCount(address) {
  try {
    return await web3.eth.getTransactionCount(address);
  } catch (error) {
    console.error(`Error fetching transaction count for ${address}:`, error.message);
    return 'Error';
  }
}

// Main function
async function main() {
  let mnemonic;
  
  if (options.mnemonic) {
    mnemonic = options.mnemonic;
    console.log('Using provided mnemonic phrase');
  } else if (options.generate) {
    if (options.generate !== '12' && options.generate !== '24') {
      console.error('Mnemonic word count must be 12 or 24');
      process.exit(1);
    }
    mnemonic = generateMnemonic(options.generate);
    console.log(`Generated ${options.generate}-word mnemonic phrase:`);
    console.log(mnemonic);
  } else {
    console.error('Please provide a mnemonic phrase or use the generate option');
    program.help();
    process.exit(1);
  }

  const numAddresses = parseInt(options.numAddresses);
  
  try {
    console.log(`\nDeriving ${numAddresses} addresses from mnemonic...`);
    const addresses = await deriveAddresses(mnemonic, numAddresses);
    
    console.log('\nFetching wallet information...');
    console.log('--------------------------------------------------------------');
    console.log('Index | Address                                    | Balance (ETH) | Tx Count');
    console.log('--------------------------------------------------------------');
    
    for (const { index, address } of addresses) {
      const balance = await getWalletBalance(address);
      const txCount = await getTransactionCount(address);
      console.log(`${index.toString().padEnd(5)} | ${address} | ${balance.padEnd(12)} | ${txCount}`);
      
      // Check for token balances if requested
      if (options.tokens || options.specificToken) {
        console.log('  Token Balances:');
        
        if (options.specificToken) {
          // Scan for a specific token
          const symbol = options.specificToken.toUpperCase();
          const balance = await tokenScanner.getTokenBalance(address, symbol);
          console.log(`    ${symbol}: ${balance}`);
        } else {
          // Scan for all common tokens
          const tokenBalances = await tokenScanner.getAllTokenBalances(address);
          Object.entries(tokenBalances).forEach(([symbol, balance]) => {
            if (balance !== '0' && balance !== 'Error') {
              console.log(`    ${symbol}: ${balance}`);
            }
          });
        }
      }
    }
    
    console.log('--------------------------------------------------------------');
    console.log('Wallet scanning complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error); 
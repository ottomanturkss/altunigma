require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const walletScanner = require('./walletScanner');
const TokenScanner = require('./tokenScanner');
const Web3 = require('web3');
const bip39 = require('bip39');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const BASE_PATH = process.env.BASE_PATH || '';

// Extract path portion if BASE_PATH is a full URL
const basePath = BASE_PATH.startsWith('http') 
  ? new URL(BASE_PATH).pathname 
  : BASE_PATH;

// Configure middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Add base path to locals so it's available in templates
// For client-side API requests, we need to use just the path portion
app.locals.basePath = basePath;

console.log("Setting basePath for templates:", basePath);
console.log("Original BASE_PATH:", BASE_PATH);

// Initialize Web3 with Infura
const INFURA_API_KEY = process.env.INFURA_API_KEY || 'your_infura_api_key_here';
const INFURA_NETWORK = process.env.INFURA_NETWORK || 'mainnet';

// Create a router with the BASE_PATH prefix
const router = express.Router();

// Routes
// Home page
router.get('/', (req, res) => {
  res.render('index', { 
    title: 'Altunigma',
    infuraNetwork: INFURA_NETWORK
  });
});

// Add route for /walletscanner to match the URL in meta tags
router.get('/walletscanner', (req, res) => {
  res.render('index', { 
    title: 'Altunigma',
    infuraNetwork: INFURA_NETWORK
  });
});

// Generate mnemonic
router.post('/walletscanner/generate-mnemonic', (req, res) => {
  const wordCount = req.body.wordCount || '12';
  try {
    const mnemonic = walletScanner.generateMnemonic(wordCount);
    res.json({ success: true, mnemonic });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get BIP39 word list
router.get('/walletscanner/bip39-wordlist', (req, res) => {
  try {
    const wordlist = bip39.wordlists.english;
    res.json({ success: true, wordlist });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Scan wallet
router.post('/scan-wallet', async (req, res) => {
  const { mnemonic, numAddresses, scanTokens, rpcUrl } = req.body;
  
  if (!mnemonic) {
    return res.status(400).json({ success: false, error: 'Mnemonic phrase is required' });
  }

  if (!rpcUrl) {
    return res.status(400).json({ success: false, error: 'RPC URL is required. Please provide a valid RPC endpoint.' });
  }

  try {
    // Validate RPC URL by making a test request
    try {
      const testWeb3 = new Web3(rpcUrl);
      await testWeb3.eth.getBlockNumber();
    } catch (rpcError) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid RPC URL or connection failed: ${rpcError.message}` 
      });
    }
    
    // Use the provided RPC URL
    const web3Provider = rpcUrl;
    
    // Create token scanner with the specified provider
    const tokenScanner = new TokenScanner(web3Provider);
    
    // Derive addresses from mnemonic
    const addresses = await walletScanner.deriveAddresses(mnemonic, numAddresses || 5);
    
    // Get wallet information
    const walletInfo = [];
    const errors = [];
    
    for (const { index, address, path, privateKey } of addresses) {
      try {
        const balance = await walletScanner.getWalletBalance(address, web3Provider);
        const txCount = await walletScanner.getTransactionCount(address, web3Provider);
        
        const walletData = {
          index,
          address,
          path,
          privateKey,
          balance,
          txCount,
          tokens: {},
          errors: []
        };
        
        // Check for token balances if requested
        if (scanTokens === 'true' || scanTokens === true) {
          try {
            const tokenBalances = await tokenScanner.getAllTokenBalances(address);
            // Only include tokens with non-zero balances
            Object.entries(tokenBalances).forEach(([symbol, balance]) => {
              if (balance !== '0' && balance !== 'Error') {
                walletData.tokens[symbol] = balance;
              }
            });
          } catch (tokenError) {
            walletData.errors.push(`Token scan error: ${tokenError.message}`);
            errors.push(`Token scan error for ${address}: ${tokenError.message}`);
          }
        }
        
        walletInfo.push(walletData);
      } catch (addressError) {
        walletInfo.push({
          index,
          address,
          path,
          privateKey,
          balance: 'Error',
          txCount: 'Error',
          tokens: {},
          errors: [`Wallet scan error: ${addressError.message}`]
        });
        errors.push(`Error scanning address ${address}: ${addressError.message}`);
      }
    }
    
    res.json({ 
      success: true, 
      walletInfo,
      availableTokens: tokenScanner.getAvailableTokens(),
      provider: 'Custom RPC',
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Auto scan wallet with missing words
router.post('/auto-scan-wallet', async (req, res) => {
  const { 
    mnemonicTemplate, 
    numAddresses, 
    scanTokens, 
    rpcUrl,
    maxCombinations = Number.MAX_SAFE_INTEGER
  } = req.body;
  
  if (!mnemonicTemplate || !Array.isArray(mnemonicTemplate)) {
    return res.status(400).json({ success: false, error: 'Mnemonic template is required' });
  }

  if (!rpcUrl) {
    return res.status(400).json({ success: false, error: 'RPC URL is required. Please provide a valid RPC endpoint.' });
  }

  try {
    // Validate RPC URL by making a test request
    try {
      const testWeb3 = new Web3(rpcUrl);
      await testWeb3.eth.getBlockNumber();
    } catch (rpcError) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid RPC URL or connection failed: ${rpcError.message}` 
      });
    }

    // Count blank words (represented by "_" or empty strings)
    const blankIndices = mnemonicTemplate
      .map((word, index) => (word === '_' || word === '') ? index : -1)
      .filter(index => index !== -1);
    
    if (blankIndices.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No blank words found in template. Use "_" for words you want to be randomly generated.'
      });
    }
    
    // Get the BIP39 wordlist
    const wordlist = bip39.wordlists.english;
    
    // Calculate total possible combinations (use a reasonable cap for display purposes)
    const totalPossibleCombinations = Math.pow(wordlist.length, blankIndices.length);
    // Cap the displayed total at a reasonable number to avoid UI issues
    const displayTotalCombinations = Math.min(totalPossibleCombinations, Number.MAX_SAFE_INTEGER);
    // Actual combinations to try (could be "infinite")
    const actualCombinations = Math.min(totalPossibleCombinations, maxCombinations);
    
    // Use the provided RPC URL
    const web3Provider = rpcUrl;
    
    // Create a single instance of token scanner
    const tokenScanner = new TokenScanner(web3Provider);
    
    // Generate a random combination
    const generateRandomCombination = async () => {
      let mnemonic;
      let isValid = false;
      let addresses = [];
      
      // Keep generating until we find a valid mnemonic that can derive addresses
      while (!isValid) {
        try {
          const template = [...mnemonicTemplate];
          
          blankIndices.forEach(index => {
            // Get a random word from the BIP39 wordlist
            const randomWordIndex = Math.floor(Math.random() * wordlist.length);
            template[index] = wordlist[randomWordIndex];
          });
          
          mnemonic = template.join(' ');
          
          // Check if the mnemonic is valid
          if (bip39.validateMnemonic(mnemonic)) {
            // Try to derive addresses to ensure it works
            addresses = await walletScanner.deriveAddresses(mnemonic, 1);
            if (addresses && addresses.length > 0 && addresses[0].address) {
              isValid = true;
            }
          }
        } catch (error) {
          console.error('Error generating valid mnemonic:', error);
          // Continue trying
        }
      }
      
      return { mnemonic, addresses };
    };
    
    // Scan a single combination
    const scanCombination = async (mnemonic) => {
      // Validate the mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        return { valid: false, mnemonic };
      }
      
      try {
        // Always derive addresses from mnemonic
        const addresses = await walletScanner.deriveAddresses(mnemonic, numAddresses || 1);
        const results = [];
        const errors = [];
        
        // Get the first address for display
        let firstAddress = null;
        let firstPrivateKey = null;
        let firstPath = null;
        
        if (addresses && addresses.length > 0) {
          firstAddress = addresses[0].address;
          firstPrivateKey = addresses[0].privateKey;
          firstPath = addresses[0].path;
        }
        
        // Check for balances
        for (const { index, address, path, privateKey } of addresses) {
          try {
            const balance = await walletScanner.getWalletBalance(address, web3Provider);
            const txCount = await walletScanner.getTransactionCount(address, web3Provider);
            
            // Skip if balance is error or zero
            if (balance === 'Error' || parseFloat(balance) === 0) {
              continue;
            }
            
            const walletData = {
              index,
              address,
              path,
              privateKey,
              balance,
              txCount,
              tokens: {},
              errors: []
            };
            
            // Check for token balances if requested
            if (scanTokens === 'true' || scanTokens === true) {
              try {
                const tokenBalances = await tokenScanner.getAllTokenBalances(address);
                // Only include tokens with non-zero balances
                Object.entries(tokenBalances).forEach(([symbol, balance]) => {
                  if (balance !== '0' && balance !== 'Error') {
                    walletData.tokens[symbol] = balance;
                  }
                });
              } catch (tokenError) {
                walletData.errors.push(`Token scan error: ${tokenError.message}`);
                errors.push(`Token scan error for ${address}: ${tokenError.message}`);
              }
            }
            
            results.push(walletData);
          } catch (addressError) {
            errors.push(`Error scanning address ${address}: ${addressError.message}`);
          }
        }
        
        return { 
          valid: true, 
          mnemonic, 
          results,
          hasBalance: results.length > 0,
          errors: errors.length > 0 ? errors : undefined,
          address: firstAddress,
          privateKey: firstPrivateKey,
          path: firstPath
        };
      } catch (error) {
        return { 
          valid: false, 
          mnemonic, 
          error: error.message 
        };
      }
    };
    
    // Generate and scan the first combination
    const firstCombination = await generateRandomCombination();
    const firstResult = await scanCombination(firstCombination.mnemonic);
    
    // Return initial response with the first result and total combinations
    res.json({
      success: true,
      totalCombinations: displayTotalCombinations,
      firstCombination: {
        mnemonic: firstCombination.mnemonic,
        valid: firstResult.valid,
        results: firstResult.results || [],
        hasBalance: firstResult.hasBalance || false,
        errors: firstResult.errors,
        address: firstResult.address,
        privateKey: firstResult.privateKey,
        path: firstResult.path
      },
      blankIndices,
      provider: 'Custom RPC'
    });
    
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Check next combination in auto scan
router.post('/check-combination', async (req, res) => {
  const { 
    mnemonicTemplate, 
    blankIndices, 
    numAddresses, 
    scanTokens, 
    rpcUrl 
  } = req.body;
  
  if (!mnemonicTemplate || !blankIndices) {
    return res.status(400).json({ success: false, error: 'Missing required parameters' });
  }

  if (!rpcUrl) {
    return res.status(400).json({ success: false, error: 'RPC URL is required' });
  }

  try {
    // Get the BIP39 wordlist
    const wordlist = bip39.wordlists.english;
    
    // Use the provided RPC URL
    const web3Provider = rpcUrl;
    
    // Create a single instance of token scanner
    const tokenScanner = new TokenScanner(web3Provider);
    
    // Generate a valid random combination
    let mnemonic;
    let addresses = [];
    let isValid = false;
    let hasBalance = false;
    let walletWithBalance = null;
    
    // Keep generating until we find a valid mnemonic that can derive addresses
    while (!isValid) {
      try {
        const template = [...mnemonicTemplate];
        
        blankIndices.forEach(index => {
          // Get a random word from the BIP39 wordlist
          const randomWordIndex = Math.floor(Math.random() * wordlist.length);
          template[index] = wordlist[randomWordIndex];
        });
        
        mnemonic = template.join(' ');
        
        // Check if the mnemonic is valid
        if (bip39.validateMnemonic(mnemonic)) {
          // Try to derive addresses to ensure it works
          addresses = await walletScanner.deriveAddresses(mnemonic, 1);
          if (addresses && addresses.length > 0 && addresses[0].address) {
            isValid = true;
          }
        }
      } catch (error) {
        console.error('Error generating valid mnemonic:', error);
        // Continue trying
      }
    }
    
    // Get the first address for display
    let firstAddress = null;
    let firstPrivateKey = null;
    let firstPath = null;
    
    if (addresses && addresses.length > 0) {
      firstAddress = addresses[0].address;
      firstPrivateKey = addresses[0].privateKey;
      firstPath = addresses[0].path;
    }
    
    // Now derive the requested number of addresses
    addresses = await walletScanner.deriveAddresses(mnemonic, numAddresses || 1);
    const results = [];
    const errors = [];
    
    // Check for balances
    for (const { index, address, path, privateKey } of addresses) {
      try {
        const balance = await walletScanner.getWalletBalance(address, web3Provider);
        const txCount = await walletScanner.getTransactionCount(address, web3Provider);
        
        // Skip if balance is error or zero
        if (balance === 'Error' || parseFloat(balance) === 0) {
          continue;
        }
        
        // We found a wallet with balance!
        hasBalance = true;
        
        const walletData = {
          index,
          address,
          path,
          privateKey,
          balance,
          txCount,
          tokens: {},
          errors: []
        };
        
        // Check for token balances if requested
        if (scanTokens === 'true' || scanTokens === true) {
          try {
            const tokenBalances = await tokenScanner.getAllTokenBalances(address);
            // Only include tokens with non-zero balances
            Object.entries(tokenBalances).forEach(([symbol, balance]) => {
              if (balance !== '0' && balance !== 'Error') {
                walletData.tokens[symbol] = balance;
              }
            });
          } catch (tokenError) {
            walletData.errors.push(`Token scan error: ${tokenError.message}`);
            errors.push(`Token scan error for ${address}: ${tokenError.message}`);
          }
        }
        
        results.push(walletData);
        
        // Store the first wallet with balance for detailed display
        if (!walletWithBalance) {
          walletWithBalance = walletData;
        }
      } catch (addressError) {
        errors.push(`Error scanning address ${address}: ${addressError.message}`);
      }
    }
    
    res.json({ 
      success: true, 
      valid: true,
      mnemonic,
      results,
      hasBalance,
      errors: errors.length > 0 ? errors : undefined,
      address: hasBalance && walletWithBalance ? walletWithBalance.address : firstAddress,
      privateKey: hasBalance && walletWithBalance ? walletWithBalance.privateKey : firstPrivateKey,
      path: hasBalance && walletWithBalance ? walletWithBalance.path : firstPath
    });
    
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get wallet info from mnemonic (lightweight version without balance checking)
router.post('/get-wallet-info', async (req, res) => {
  const { mnemonic, numAddresses, rpcUrl } = req.body;
  
  if (!mnemonic) {
    return res.status(400).json({ success: false, error: 'Mnemonic phrase is required' });
  }

  if (!rpcUrl) {
    return res.status(400).json({ success: false, error: 'RPC URL is required' });
  }

  try {
    // Derive addresses from mnemonic
    const addresses = await walletScanner.deriveAddresses(mnemonic, numAddresses || 1);
    
    // Return wallet info without checking balances
    const walletInfo = addresses.map(({ index, address, path, privateKey }) => ({
      index,
      address,
      path,
      privateKey,
      balance: '0',
      txCount: '0',
      tokens: {}
    }));
    
    res.json({ 
      success: true, 
      walletInfo
    });
    
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Handle stop scanning request
router.post('/stop-scan', (req, res) => {
  // This endpoint doesn't need to do anything special on the server
  // It's just a way for the client to signal that it wants to stop
  res.json({ 
    success: true, 
    message: 'Stop request received'
  });
});

// Register the router with the BASE_PATH
app.use(basePath, router);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Base path: ${basePath}`);
  console.log(`Full URL: ${BASE_PATH}`);
  console.log(`Access the app at: http://localhost:${PORT}${basePath}`);
}); 
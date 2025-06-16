// Wallet Scanner Web Interface

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements - Regular Scan
    const generateForm = document.getElementById('generateForm');
    const scanForm = document.getElementById('scanForm');
    const generatedMnemonic = document.getElementById('generatedMnemonic');
    const mnemonicText = document.getElementById('mnemonicText');
    const useMnemonicBtn = document.getElementById('useMnemonic');
    const copyMnemonicBtn = document.getElementById('copyMnemonic');
    const mnemonicInput = document.getElementById('mnemonic');
    const rpcUrlInput = document.getElementById('rpcUrl');
    const numAddressesInput = document.getElementById('numAddresses');
    const scanTokensCheckbox = document.getElementById('scanTokens');
    const resultsSection = document.getElementById('resultsSection');
    const walletResults = document.getElementById('walletResults');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');

    // DOM Elements - Auto Scanner
    const autoScanForm = document.getElementById('autoScanForm');
    const wordCountAuto = document.getElementById('wordCountAuto');
    const createTemplateBtn = document.getElementById('createTemplateBtn');
    const mnemonicTemplate = document.getElementById('mnemonicTemplate');
    const rpcUrlAuto = document.getElementById('rpcUrlAuto');
    const numAddressesAuto = document.getElementById('numAddressesAuto');
    const maxCombinations = document.getElementById('maxCombinations');
    const scanTokensAuto = document.getElementById('scanTokensAuto');
    const stopScanBtn = document.getElementById('stopScanBtn');
    const scanProgressContainer = document.getElementById('scanProgressContainer');
    const scanProgress = document.getElementById('scanProgress');
    const autoScanStatus = document.getElementById('autoScanStatus');
    const statusText = document.getElementById('statusText');
    const currentCombination = document.getElementById('currentCombination');
    const combinationsChecked = document.getElementById('combinationsChecked');
    const totalCombinations = document.getElementById('totalCombinations');
    const foundWalletsContainer = document.getElementById('foundWalletsContainer');
    const foundWallets = document.getElementById('foundWallets');

    // Auto scanner state
    let isScanning = false;
    let shouldStopScanning = false;
    let bip39Wordlist = [];
    let currentBlankIndices = [];
    let currentTemplate = [];
    let combinationsCount = 0;
    let totalCombinationsCount = 0;
    let foundWalletsCount = 0;

    // Get the base path from the HTML
    const basePath = document.querySelector('meta[name="base-path"]')?.getAttribute('content') || '/walletscanner';
    
    // For API requests, ensure we have the correct path
    // We're using relative paths, so we don't need the domain part
    const apiBasePath = basePath.startsWith('http') 
        ? new URL(basePath).pathname  // Extract just the path from the full URL
        : (basePath.startsWith('/') ? basePath : '/' + basePath);
    
    console.log("Base path from meta tag:", basePath);
    console.log("Using API base path:", apiBasePath);

    // Fetch BIP39 wordlist
    async function fetchWordlist() {
        try {
            const endpoint = `${apiBasePath}/walletscanner/bip39-wordlist`;
            console.log("Fetching wordlist from:", endpoint);
            const response = await fetch(endpoint);
            const data = await response.json();
            
            if (data.success) {
                bip39Wordlist = data.wordlist;
            } else {
                showError('Failed to fetch BIP39 wordlist');
            }
        } catch (error) {
            console.error('Error fetching wordlist:', error);
        }
    }

    // Call fetchWordlist on page load
    fetchWordlist();

    // Generate Mnemonic Form
    generateForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get selected word count
        const wordCount = document.querySelector('input[name="wordCount"]:checked').value;
        
        try {
            // Show loading
            showLoading();
            hideError();
            
            // Call API to generate mnemonic
            const response = await fetch(`${apiBasePath}/walletscanner/generate-mnemonic`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ wordCount })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Display generated mnemonic
                mnemonicText.textContent = data.mnemonic;
                generatedMnemonic.style.display = 'block';
            } else {
                showError(data.error || 'Failed to generate mnemonic');
            }
        } catch (error) {
            showError('Error: ' + error.message);
        } finally {
            hideLoading();
        }
    });

    // Use Generated Mnemonic
    useMnemonicBtn.addEventListener('click', function() {
        mnemonicInput.value = mnemonicText.textContent;
    });

    // Copy Mnemonic to Clipboard
    copyMnemonicBtn.addEventListener('click', function() {
        navigator.clipboard.writeText(mnemonicText.textContent)
            .then(() => {
                // Change button text temporarily
                const originalText = copyMnemonicBtn.textContent;
                copyMnemonicBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyMnemonicBtn.textContent = originalText;
                }, 2000);
            })
            .catch(err => {
                showError('Failed to copy: ' + err);
            });
    });

    // Scan Wallet Form
    scanForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form values
        const mnemonic = mnemonicInput.value.trim();
        const rpcUrl = rpcUrlInput.value.trim();
        const numAddresses = numAddressesInput.value;
        const scanTokens = scanTokensCheckbox.checked;
        
        if (!mnemonic) {
            showError('Please enter a mnemonic phrase');
            return;
        }
        
        if (!rpcUrl) {
            showError('RPC URL is required. Please provide a valid RPC endpoint.');
            return;
        }
        
        try {
            // Show loading, hide results and errors
            showLoading();
            hideError();
            resultsSection.style.display = 'none';
            
            // Call API to scan wallet
            const response = await fetch(`${apiBasePath}/scan-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    mnemonic, 
                    numAddresses, 
                    scanTokens,
                    rpcUrl
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Display wallet information
                displayWalletInfo(data.walletInfo);
                resultsSection.style.display = 'block';
                
                // Display errors if any
                if (data.errors && data.errors.length > 0) {
                    showWarning('Some errors occurred during scanning. Check console for details.');
                    console.warn('Wallet scanning errors:', data.errors);
                }
            } else {
                showError(data.error || 'Failed to scan wallet');
            }
        } catch (error) {
            showError('Error: ' + error.message);
        } finally {
            hideLoading();
        }
    });

    // Create Template Button
    createTemplateBtn.addEventListener('click', function() {
        const wordCount = parseInt(wordCountAuto.value);
        createMnemonicTemplate(wordCount);
    });

    // Create Target Template Button
    const createTargetTemplateBtn = document.getElementById('createTargetTemplateBtn');
    const targetMnemonicTemplate = document.getElementById('targetMnemonicTemplate');
    const clearTargetTemplateBtn = document.getElementById('clearTargetTemplateBtn');
    
    if (createTargetTemplateBtn) {
        createTargetTemplateBtn.addEventListener('click', function() {
            const wordCount = parseInt(wordCountTarget.value);
            createTargetMnemonicTemplate(wordCount);
        });
    }
    
    if (clearTargetTemplateBtn) {
        clearTargetTemplateBtn.addEventListener('click', function() {
            targetMnemonicTemplate.innerHTML = '';
            targetMnemonicTemplate.classList.add('d-none');
        });
    }

    // Create mnemonic template inputs
    function createMnemonicTemplate(wordCount) {
        mnemonicTemplate.innerHTML = '';
        mnemonicTemplate.classList.remove('d-none');
        
        const row = document.createElement('div');
        row.className = 'row g-2';
        
        for (let i = 0; i < wordCount; i++) {
            const col = document.createElement('div');
            col.className = 'col-md-2 col-sm-3 col-4 mb-2';
            
            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group input-group-sm';
            
            const indexSpan = document.createElement('span');
            indexSpan.className = 'input-group-text';
            indexSpan.textContent = (i + 1);
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control form-control-sm word-input';
            input.placeholder = 'word or _';
            input.dataset.index = i;
            
            inputGroup.appendChild(indexSpan);
            inputGroup.appendChild(input);
            col.appendChild(inputGroup);
            row.appendChild(col);
        }
        
        mnemonicTemplate.appendChild(row);
    }

    // Create target mnemonic template inputs
    function createTargetMnemonicTemplate(wordCount) {
        targetMnemonicTemplate.innerHTML = '';
        targetMnemonicTemplate.classList.remove('d-none');
        
        const row = document.createElement('div');
        row.className = 'row g-2';
        
        for (let i = 0; i < wordCount; i++) {
            const col = document.createElement('div');
            col.className = 'col-md-2 col-sm-3 col-4 mb-2';
            
            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group input-group-sm';
            
            const indexSpan = document.createElement('span');
            indexSpan.className = 'input-group-text';
            indexSpan.textContent = (i + 1);
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control form-control-sm target-word-input';
            input.placeholder = 'word or _';
            input.dataset.index = i;
            
            inputGroup.appendChild(indexSpan);
            inputGroup.appendChild(input);
            col.appendChild(inputGroup);
            row.appendChild(col);
        }
        
        const helpText = document.createElement('div');
        helpText.className = 'col-12 mt-2 mb-3';
        helpText.innerHTML = `
            <small class="text-muted">
                Fill in known words and use "_" (underscore) for unknown words. 
                The system will try different combinations for the unknown words.
            </small>
        `;
        
        targetMnemonicTemplate.appendChild(row);
        targetMnemonicTemplate.appendChild(helpText);
    }

    // Auto Scan Form
    autoScanForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (isScanning) {
            return;
        }
        
        // Get all word inputs
        const wordInputs = document.querySelectorAll('.word-input');
        if (wordInputs.length === 0) {
            showError('Please create a mnemonic template first');
            return;
        }
        
        // Build mnemonic template
        const template = Array.from(wordInputs).map(input => input.value.trim() || '_');
        
        // Check if there are any blank words
        if (!template.some(word => word === '_')) {
            showError('Please leave at least one word blank (use "_") for auto scanning');
            return;
        }
        
        // Get other form values
        const rpcUrl = rpcUrlAuto.value.trim();
        const numAddresses = numAddressesAuto.value;
        // Set max combinations to a very large number for "infinite" scanning
        const maxCombo = maxCombinations.value === '' ? Number.MAX_SAFE_INTEGER : parseInt(maxCombinations.value);
        const scanTokens = scanTokensAuto.checked;
        
        // Check if RPC URL is provided
        if (!rpcUrl) {
            showError('RPC URL is required. Please provide a valid RPC endpoint.');
            return;
        }
        
        // Start scanning
        startAutoScan(template, rpcUrl, numAddresses, maxCombo, scanTokens);
    });

    // Stop Scan Button
    stopScanBtn.addEventListener('click', function() {
        stopScanningProcess();
    });

    // Function to stop the scanning process
    async function stopScanningProcess() {
        shouldStopScanning = true;
        statusText.textContent = 'Stopping scan...';
        
        // Call the stop-scan endpoint to notify the server
        try {
            await fetch(`${apiBasePath}/stop-scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Error stopping scan:', error);
        }
    }

    // Continue scanning with more combinations
    async function continueScan() {
        if (shouldStopScanning) {
            stopAutoScan();
            return;
        }
        
        if (!isScanning) {
            return;
        }
        
        try {
            // Get current template values
            const template = [];
            const wordInputs = mnemonicTemplate.querySelectorAll('.word-input');
            
            wordInputs.forEach(input => {
                template.push(input.value.trim().toLowerCase());
            });
            
            // Call API to check next combination
            const response = await fetch(`${apiBasePath}/check-combination`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mnemonicTemplate: template,
                    numAddresses: numAddressesAuto.value,
                    scanTokens: scanTokensAuto.checked,
                    rpcUrl: rpcUrlAuto.value
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Process the result
                await processCombinationResult(result);
                
                // Update progress
                combinationsCount++;
                combinationsChecked.textContent = combinationsCount;
                
                // Update progress bar if we have a max combinations value
                if (totalCombinationsCount > 0) {
                    const progressPercent = (combinationsCount / totalCombinationsCount) * 100;
                    scanProgress.style.width = `${Math.min(progressPercent, 100)}%`;
                }
                
                // Continue scanning
                setTimeout(continueScan, 10);
            } else {
                showError(result.error || 'Failed to check combination');
                stopAutoScan('Error: ' + (result.error || 'Failed to check combination'));
            }
        } catch (error) {
            console.error('Error in continueScan:', error);
            showError('Error: ' + error.message);
            stopAutoScan('Error: ' + error.message);
        }
    }

    // Process a combination result
    async function processCombinationResult(result) {
        // Increment counter
        combinationsCount++;
        
        console.log("Processing result:", result); // Debug log
        
        // Update UI
        currentCombination.textContent = result.mnemonic;
        combinationsChecked.textContent = combinationsCount;
        scanProgress.style.width = `${(combinationsCount / totalCombinationsCount) * 100}%`;
        
        // Clear any previous wallet details
        const existingDetails = autoScanStatus.querySelector('.wallet-details-container');
        if (existingDetails) {
            existingDetails.remove();
        }
        
        // Create wallet details container
        const walletDetails = document.createElement('div');
        walletDetails.className = 'wallet-details-container mt-3 p-3 bg-light rounded';
        
        // Create wallet details header
        const detailsHeader = document.createElement('h6');
        detailsHeader.className = 'mb-3';
        detailsHeader.innerHTML = '<i class="bi bi-info-circle me-2"></i>Current Wallet Details:';
        walletDetails.appendChild(detailsHeader);
        
        // Display the mnemonic
        const mnemonicDiv = document.createElement('div');
        mnemonicDiv.className = 'mb-3';
        mnemonicDiv.innerHTML = `<strong>Mnemonic:</strong> <span class="text-monospace">${result.mnemonic}</span>`;
        walletDetails.appendChild(mnemonicDiv);
        
        // Log address and private key for debugging
        console.log("Address:", result.address);
        console.log("Private Key:", result.privateKey);
        console.log("Path:", result.path);
        console.log("Has Balance:", result.hasBalance);
        
        // If we have results with balance
        if (result.hasBalance && result.results && result.results.length > 0) {
            // Create details list for wallets with balance
            result.results.forEach(wallet => {
                const detailItem = document.createElement('div');
                detailItem.className = 'mb-3 border-bottom pb-3';
                
                // Address with copy button
                const addressDiv = document.createElement('div');
                addressDiv.className = 'd-flex align-items-center mb-2';
                
                const addressLabel = document.createElement('strong');
                addressLabel.className = 'me-2';
                addressLabel.textContent = 'Address:';
                addressDiv.appendChild(addressLabel);
                
                const addressText = document.createElement('span');
                addressText.className = 'me-2 text-monospace';
                addressText.textContent = wallet.address;
                addressDiv.appendChild(addressText);
                
                const copyAddressBtn = document.createElement('i');
                copyAddressBtn.className = 'bi bi-clipboard copy-btn';
                copyAddressBtn.title = 'Copy address';
                copyAddressBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(wallet.address)
                        .then(() => {
                            copyAddressBtn.className = 'bi bi-check-circle text-success';
                            setTimeout(() => {
                                copyAddressBtn.className = 'bi bi-clipboard copy-btn';
                            }, 2000);
                        });
                });
                addressDiv.appendChild(copyAddressBtn);
                
                detailItem.appendChild(addressDiv);
                
                // Balance
                const balanceDiv = document.createElement('div');
                balanceDiv.className = 'mb-2';
                balanceDiv.innerHTML = `<strong>Balance:</strong> ${wallet.balance} ETH`;
                detailItem.appendChild(balanceDiv);
                
                // Transaction count
                const txCountDiv = document.createElement('div');
                txCountDiv.className = 'mb-2';
                txCountDiv.innerHTML = `<strong>Transactions:</strong> ${wallet.txCount}`;
                detailItem.appendChild(txCountDiv);
                
                // Private key with copy button
                const privateKeyDiv = document.createElement('div');
                privateKeyDiv.className = 'd-flex align-items-center mb-2';
                
                const privateKeyLabel = document.createElement('strong');
                privateKeyLabel.className = 'me-2';
                privateKeyLabel.textContent = 'Private Key:';
                privateKeyDiv.appendChild(privateKeyLabel);
                
                const privateKeyText = document.createElement('span');
                privateKeyText.className = 'me-2 text-monospace text-truncate';
                privateKeyText.style.maxWidth = '300px';
                privateKeyText.textContent = wallet.privateKey;
                privateKeyDiv.appendChild(privateKeyText);
                
                const copyPrivateKeyBtn = document.createElement('i');
                copyPrivateKeyBtn.className = 'bi bi-clipboard copy-btn';
                copyPrivateKeyBtn.title = 'Copy private key';
                copyPrivateKeyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(wallet.privateKey)
                        .then(() => {
                            copyPrivateKeyBtn.className = 'bi bi-check-circle text-success';
                            setTimeout(() => {
                                copyPrivateKeyBtn.className = 'bi bi-clipboard copy-btn';
                            }, 2000);
                        });
                });
                privateKeyDiv.appendChild(copyPrivateKeyBtn);
                
                detailItem.appendChild(privateKeyDiv);
                
                // Derivation path
                const pathDiv = document.createElement('div');
                pathDiv.className = 'mb-2';
                pathDiv.innerHTML = `<strong>Derivation Path:</strong> ${wallet.path}`;
                detailItem.appendChild(pathDiv);
                
                // Token balances
                if (wallet.tokens && Object.keys(wallet.tokens).length > 0) {
                    const tokensDiv = document.createElement('div');
                    tokensDiv.className = 'mb-2';
                    
                    const tokensLabel = document.createElement('strong');
                    tokensLabel.textContent = 'Token Balances:';
                    tokensDiv.appendChild(tokensLabel);
                    
                    const tokensList = document.createElement('div');
                    tokensList.className = 'ms-3 mt-1';
                    
                    Object.entries(wallet.tokens).forEach(([symbol, balance]) => {
                        const tokenItem = document.createElement('div');
                        tokenItem.textContent = `${symbol}: ${balance}`;
                        tokensList.appendChild(tokenItem);
                    });
                    
                    tokensDiv.appendChild(tokensList);
                    detailItem.appendChild(tokensDiv);
                }
                
                walletDetails.appendChild(detailItem);
            });
            
            // Add a success message
            const successMessage = document.createElement('div');
            successMessage.className = 'alert alert-success mt-3';
            successMessage.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i><strong>Success!</strong> Found a wallet with balance! Scanning stopped.';
            walletDetails.appendChild(successMessage);
        } else {
            // Display wallet info for the current combination even if no balance
            const detailItem = document.createElement('div');
            detailItem.className = 'mb-3 pb-3';
            
            // We should always have an address now
            if (result.address) {
                // Address with copy button
                const addressDiv = document.createElement('div');
                addressDiv.className = 'd-flex align-items-center mb-2';
                
                const addressLabel = document.createElement('strong');
                addressLabel.className = 'me-2';
                addressLabel.textContent = 'Address:';
                addressDiv.appendChild(addressLabel);
                
                const addressText = document.createElement('span');
                addressText.className = 'me-2 text-monospace';
                addressText.textContent = result.address;
                addressDiv.appendChild(addressText);
                
                const copyAddressBtn = document.createElement('i');
                copyAddressBtn.className = 'bi bi-clipboard copy-btn';
                copyAddressBtn.title = 'Copy address';
                copyAddressBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(result.address)
                        .then(() => {
                            copyAddressBtn.className = 'bi bi-check-circle text-success';
                            setTimeout(() => {
                                copyAddressBtn.className = 'bi bi-clipboard copy-btn';
                            }, 2000);
                        });
                });
                addressDiv.appendChild(copyAddressBtn);
                
                detailItem.appendChild(addressDiv);
                
                // Balance (zero for no balance)
                const balanceDiv = document.createElement('div');
                balanceDiv.className = 'mb-2';
                balanceDiv.innerHTML = `<strong>Balance:</strong> 0 ETH (No balance found)`;
                detailItem.appendChild(balanceDiv);
                
                // Private key with copy button
                if (result.privateKey) {
                    const privateKeyDiv = document.createElement('div');
                    privateKeyDiv.className = 'd-flex align-items-center mb-2';
                    
                    const privateKeyLabel = document.createElement('strong');
                    privateKeyLabel.className = 'me-2';
                    privateKeyLabel.textContent = 'Private Key:';
                    privateKeyDiv.appendChild(privateKeyLabel);
                    
                    const privateKeyText = document.createElement('span');
                    privateKeyText.className = 'me-2 text-monospace text-truncate';
                    privateKeyText.style.maxWidth = '300px';
                    privateKeyText.textContent = result.privateKey;
                    privateKeyDiv.appendChild(privateKeyText);
                    
                    const copyPrivateKeyBtn = document.createElement('i');
                    copyPrivateKeyBtn.className = 'bi bi-clipboard copy-btn';
                    copyPrivateKeyBtn.title = 'Copy private key';
                    copyPrivateKeyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(result.privateKey)
                            .then(() => {
                                copyPrivateKeyBtn.className = 'bi bi-check-circle text-success';
                                setTimeout(() => {
                                    copyPrivateKeyBtn.className = 'bi bi-clipboard copy-btn';
                                }, 2000);
                            });
                    });
                    privateKeyDiv.appendChild(copyPrivateKeyBtn);
                    
                    detailItem.appendChild(privateKeyDiv);
                }
                
                // Derivation path
                if (result.path) {
                    const pathDiv = document.createElement('div');
                    pathDiv.className = 'mb-2';
                    pathDiv.innerHTML = `<strong>Derivation Path:</strong> ${result.path}`;
                    detailItem.appendChild(pathDiv);
                }
            } else {
                // This should never happen now with our improved server code
                const noAddressDiv = document.createElement('div');
                noAddressDiv.className = 'alert alert-warning';
                noAddressDiv.textContent = 'No wallet address available for this combination.';
                detailItem.appendChild(noAddressDiv);
            }
            
            walletDetails.appendChild(detailItem);
        }
        
        // Add wallet details to the status area
        autoScanStatus.appendChild(walletDetails);
        
        // Make sure the status area is visible
        autoScanStatus.classList.remove('d-none');
        
        // Check if this combination has a balance
        if (result.valid && result.hasBalance) {
            console.log("Found wallet with balance:", result); // Debug log
            
            // Add to found wallets
            addFoundWallet(result.mnemonic, result.results);
            
            // Show found wallets container if not already visible
            if (foundWalletsCount === 1) {
                foundWalletsContainer.classList.remove('d-none');
            }
            
            // Stop scanning if we found a wallet with balance
            shouldStopScanning = true;
            stopAutoScan(`Found wallet with balance! Stopping scan.`);
            return true; // Return true to indicate we found a wallet with balance
        }
        
        // Small delay to allow UI to update and prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
        return false; // Return false to indicate we didn't find a wallet with balance
    }

    // Display wallet information in the table
    function displayWalletInfo(walletInfo) {
        // Clear previous results
        walletResults.innerHTML = '';
        
        // Add each wallet to the table
        walletInfo.forEach(wallet => {
            const row = document.createElement('tr');
            
            // Index
            const indexCell = document.createElement('td');
            indexCell.textContent = wallet.index;
            row.appendChild(indexCell);
            
            // Address with copy button
            const addressCell = document.createElement('td');
            addressCell.className = 'address-cell';
            
            const addressContainer = document.createElement('div');
            addressContainer.className = 'd-flex align-items-center';
            
            const addressText = document.createElement('span');
            addressText.className = 'me-2 text-truncate';
            addressText.textContent = wallet.address;
            addressContainer.appendChild(addressText);
            
            const copyBtn = document.createElement('i');
            copyBtn.className = 'bi bi-clipboard copy-btn';
            copyBtn.title = 'Copy address';
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(wallet.address)
                    .then(() => {
                        copyBtn.className = 'bi bi-check-circle text-success';
                        setTimeout(() => {
                            copyBtn.className = 'bi bi-clipboard copy-btn';
                        }, 2000);
                    });
            });
            addressContainer.appendChild(copyBtn);
            
            addressCell.appendChild(addressContainer);
            row.appendChild(addressCell);
            
            // Balance
            const balanceCell = document.createElement('td');
            balanceCell.textContent = wallet.balance;
            if (wallet.balance === 'Error') {
                balanceCell.className = 'text-danger';
            }
            row.appendChild(balanceCell);
            
            // Transaction Count
            const txCountCell = document.createElement('td');
            txCountCell.textContent = wallet.txCount;
            if (wallet.txCount === 'Error') {
                txCountCell.className = 'text-danger';
            }
            row.appendChild(txCountCell);
            
            // Private Key with copy button
            const privateKeyCell = document.createElement('td');
            privateKeyCell.className = 'private-key-cell';
            
            const privateKeyContainer = document.createElement('div');
            privateKeyContainer.className = 'd-flex align-items-center';
            
            const privateKeyText = document.createElement('span');
            privateKeyText.className = 'me-2 text-truncate';
            privateKeyText.textContent = wallet.privateKey || 'Not available';
            privateKeyContainer.appendChild(privateKeyText);
            
            const copyPrivateKeyBtn = document.createElement('i');
            copyPrivateKeyBtn.className = 'bi bi-clipboard copy-btn';
            copyPrivateKeyBtn.title = 'Copy private key';
            copyPrivateKeyBtn.addEventListener('click', () => {
                if (wallet.privateKey) {
                    navigator.clipboard.writeText(wallet.privateKey)
                        .then(() => {
                            copyPrivateKeyBtn.className = 'bi bi-check-circle text-success';
                            setTimeout(() => {
                                copyPrivateKeyBtn.className = 'bi bi-clipboard copy-btn';
                            }, 2000);
                        });
                }
            });
            privateKeyContainer.appendChild(copyPrivateKeyBtn);
            
            privateKeyCell.appendChild(privateKeyContainer);
            row.appendChild(privateKeyCell);
            
            // Derivation Path
            const pathCell = document.createElement('td');
            pathCell.textContent = wallet.path || 'Not available';
            row.appendChild(pathCell);
            
            // Token Balances
            const tokensCell = document.createElement('td');
            const tokenEntries = Object.entries(wallet.tokens);
            
            if (tokenEntries.length > 0) {
                tokenEntries.forEach(([symbol, balance]) => {
                    const tokenBadge = document.createElement('span');
                    tokenBadge.className = 'token-badge';
                    tokenBadge.textContent = `${symbol}: ${balance}`;
                    tokensCell.appendChild(tokenBadge);
                });
            } else {
                tokensCell.textContent = 'No tokens found';
            }
            
            // Add error indicators if there are errors
            if (wallet.errors && wallet.errors.length > 0) {
                const errorIcon = document.createElement('i');
                errorIcon.className = 'bi bi-exclamation-triangle-fill text-warning ms-2';
                errorIcon.title = wallet.errors.join('\n');
                tokensCell.appendChild(errorIcon);
            }
            
            row.appendChild(tokensCell);
            
            // Add row to table
            walletResults.appendChild(row);
        });
    }

    // Add a found wallet to the results table
    function addFoundWallet(mnemonic, results) {
        results.forEach(wallet => {
            foundWalletsCount++;
            
            const row = document.createElement('tr');
            
            // Mnemonic
            const mnemonicCell = document.createElement('td');
            mnemonicCell.className = 'text-truncate';
            mnemonicCell.style.maxWidth = '150px';
            mnemonicCell.title = mnemonic;
            mnemonicCell.textContent = mnemonic;
            row.appendChild(mnemonicCell);
            
            // Address
            const addressCell = document.createElement('td');
            addressCell.className = 'text-truncate';
            addressCell.style.maxWidth = '120px';
            addressCell.title = wallet.address;
            
            const addressContainer = document.createElement('div');
            addressContainer.className = 'd-flex align-items-center';
            
            const addressText = document.createElement('span');
            addressText.className = 'me-2 text-truncate';
            addressText.textContent = wallet.address;
            addressContainer.appendChild(addressText);
            
            const copyAddressBtn = document.createElement('i');
            copyAddressBtn.className = 'bi bi-clipboard copy-btn';
            copyAddressBtn.title = 'Copy address';
            copyAddressBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(wallet.address)
                    .then(() => {
                        copyAddressBtn.className = 'bi bi-check-circle text-success';
                        setTimeout(() => {
                            copyAddressBtn.className = 'bi bi-clipboard copy-btn';
                        }, 2000);
                    });
            });
            addressContainer.appendChild(copyAddressBtn);
            
            addressCell.appendChild(addressContainer);
            row.appendChild(addressCell);
            
            // Balance
            const balanceCell = document.createElement('td');
            balanceCell.textContent = wallet.balance;
            row.appendChild(balanceCell);
            
            // Transaction Count
            const txCountCell = document.createElement('td');
            txCountCell.textContent = wallet.txCount;
            row.appendChild(txCountCell);
            
            // Private Key
            const privateKeyCell = document.createElement('td');
            privateKeyCell.className = 'text-truncate';
            privateKeyCell.style.maxWidth = '120px';
            
            const privateKeyContainer = document.createElement('div');
            privateKeyContainer.className = 'd-flex align-items-center';
            
            const privateKeyText = document.createElement('span');
            privateKeyText.className = 'me-2 text-truncate';
            privateKeyText.textContent = wallet.privateKey || 'Not available';
            privateKeyText.title = wallet.privateKey;
            privateKeyContainer.appendChild(privateKeyText);
            
            const copyPrivateKeyBtn = document.createElement('i');
            copyPrivateKeyBtn.className = 'bi bi-clipboard copy-btn';
            copyPrivateKeyBtn.title = 'Copy private key';
            copyPrivateKeyBtn.addEventListener('click', () => {
                if (wallet.privateKey) {
                    navigator.clipboard.writeText(wallet.privateKey)
                        .then(() => {
                            copyPrivateKeyBtn.className = 'bi bi-check-circle text-success';
                            setTimeout(() => {
                                copyPrivateKeyBtn.className = 'bi bi-clipboard copy-btn';
                            }, 2000);
                        });
                }
            });
            privateKeyContainer.appendChild(copyPrivateKeyBtn);
            
            privateKeyCell.appendChild(privateKeyContainer);
            row.appendChild(privateKeyCell);
            
            // Derivation Path
            const pathCell = document.createElement('td');
            pathCell.textContent = wallet.path || 'Not available';
            row.appendChild(pathCell);
            
            // Actions
            const actionsCell = document.createElement('td');
            
            const useBtn = document.createElement('button');
            useBtn.className = 'btn btn-sm btn-success me-1';
            useBtn.textContent = 'Use';
            useBtn.addEventListener('click', () => {
                // Switch to regular scan tab and fill in the mnemonic
                document.getElementById('regular-tab').click();
                mnemonicInput.value = mnemonic;
            });
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn btn-sm btn-secondary';
            copyBtn.textContent = 'Copy';
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(mnemonic)
                    .then(() => {
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => {
                            copyBtn.textContent = 'Copy';
                        }, 2000);
                    });
            });
            
            const scanBtn = document.createElement('button');
            scanBtn.className = 'btn btn-sm btn-primary ms-1';
            scanBtn.textContent = 'Full Scan';
            scanBtn.addEventListener('click', () => {
                // Switch to regular scan tab, fill in the mnemonic, and submit the form
                document.getElementById('regular-tab').click();
                mnemonicInput.value = mnemonic;
                scanForm.dispatchEvent(new Event('submit'));
            });
            
            actionsCell.appendChild(useBtn);
            actionsCell.appendChild(copyBtn);
            actionsCell.appendChild(scanBtn);
            row.appendChild(actionsCell);
            
            // Add row to table
            foundWallets.appendChild(row);
            
            // Update status text to show the found wallet details
            statusText.textContent = `Found wallet with balance! Mnemonic: ${mnemonic}`;
            
            // If there are token balances, show them in the status
            if (Object.keys(wallet.tokens).length > 0) {
                const tokenDetails = document.createElement('p');
                tokenDetails.className = 'mt-2 mb-0';
                tokenDetails.innerHTML = '<strong>Token Balances:</strong> ';
                
                Object.entries(wallet.tokens).forEach(([symbol, balance], index) => {
                    tokenDetails.innerHTML += `${symbol}: ${balance}`;
                    if (index < Object.keys(wallet.tokens).length - 1) {
                        tokenDetails.innerHTML += ', ';
                    }
                });
                
                // Add token details to the status area
                autoScanStatus.appendChild(tokenDetails);
            }
        });
    }

    // Stop auto scan
    function stopAutoScan(message = 'Scan stopped') {
        isScanning = false;
        shouldStopScanning = false;
        stopScanBtn.classList.add('d-none');
        
        // Enable the start button again
        document.querySelector('#autoScanForm button[type="submit"]').disabled = false;
        
        // Update status text but preserve wallet details
        const statusHeader = autoScanStatus.querySelector('.scan-status-header');
        if (statusHeader) {
            const statusTextElement = statusHeader.querySelector('#statusText');
            if (statusTextElement) {
                statusTextElement.textContent = message;
            }
        } else {
            statusText.textContent = message;
        }
        
        // Show summary if no wallets were found
        if (foundWalletsCount === 0 && !message.includes('Found wallet')) {
            statusText.textContent = 'Scan complete - No wallets with balance found.';
        }
    }

    // Start Auto Scan
    async function startAutoScan(template, rpcUrl, numAddresses, maxCombo, scanTokens) {
        try {
            // Reset state
            isScanning = true;
            shouldStopScanning = false;
            combinationsCount = 0;
            foundWalletsCount = 0;
            
            // Show UI elements
            scanProgressContainer.classList.remove('d-none');
            autoScanStatus.classList.remove('d-none');
            stopScanBtn.classList.remove('d-none');
            
            // Update status
            statusText.textContent = 'Starting scan...';
            combinationsChecked.textContent = '0';
            
            // Calculate total combinations if we have a max
            if (maxCombo && !isNaN(maxCombo)) {
                totalCombinationsCount = parseInt(maxCombo);
                totalCombinations.textContent = totalCombinationsCount.toLocaleString();
            } else {
                totalCombinationsCount = 0;
                totalCombinations.textContent = '∞';
            }
            
            // Call API to start auto scan
            const response = await fetch(`${apiBasePath}/auto-scan-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mnemonicTemplate: template,
                    numAddresses,
                    scanTokens,
                    rpcUrl,
                    maxCombinations: maxCombo ? parseInt(maxCombo) : undefined
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Store blank indices for display purposes
                currentBlankIndices = result.blankIndices;
                currentTemplate = template;
                
                // Update status
                statusText.textContent = 'Scanning...';
                
                // Start continuous scanning
                continueScan();
            } else {
                showError(result.error || 'Failed to start auto scan');
                stopAutoScan('Error: ' + (result.error || 'Failed to start auto scan'));
            }
        } catch (error) {
            console.error('Error in startAutoScan:', error);
            showError('Error: ' + error.message);
            stopAutoScan('Error: ' + error.message);
        }
    }

    // Helper functions
    function showLoading() {
        loadingSpinner.style.display = 'block';
    }
    
    function hideLoading() {
        loadingSpinner.style.display = 'none';
    }
    
    function showError(message) {
        errorAlert.style.display = 'block';
        errorMessage.textContent = message;
        
        // Also log to console
        console.error(message);
        
        // Hide error after 5 seconds
        setTimeout(function() {
            hideError();
        }, 5000);
    }
    
    function showWarning(message) {
        errorAlert.style.display = 'block';
        errorAlert.classList.remove('alert-danger');
        errorAlert.classList.add('alert-warning');
        errorMessage.textContent = message;
    }
    
    function hideError() {
        errorAlert.style.display = 'none';
        errorAlert.classList.remove('alert-warning');
        errorAlert.classList.add('alert-danger');
    }

    // Target Scan DOM Elements
    const targetScanForm = document.getElementById('targetScanForm');
    const targetAddress = document.getElementById('targetAddress');
    const wordCountTarget = document.getElementById('wordCountTarget');
    const derivationPathType = document.getElementById('derivationPathType');
    const customPathContainer = document.getElementById('customPathContainer');
    const customPath = document.getElementById('customPath');
    const derivationPathIndex = document.getElementById('derivationPathIndex');
    const checkAllIndexes = document.getElementById('checkAllIndexes');
    const maxAttemptsTarget = document.getElementById('maxAttemptsTarget');
    const stopTargetScanBtn = document.getElementById('stopTargetScanBtn');
    const targetScanProgressContainer = document.getElementById('targetScanProgressContainer');
    const targetScanProgress = document.getElementById('targetScanProgress');
    const targetScanStatus = document.getElementById('targetScanStatus');
    const targetStatusText = document.getElementById('targetStatusText');
    const currentAttempt = document.getElementById('currentAttempt');
    const maxAttempts = document.getElementById('maxAttempts');
    const currentTargetMnemonic = document.getElementById('currentTargetMnemonic');
    const targetFoundContainer = document.getElementById('targetFoundContainer');
    const foundMnemonic = document.getElementById('foundMnemonic');
    const foundAddress = document.getElementById('foundAddress');
    const foundDerivationPath = document.getElementById('foundDerivationPath');
    const foundPrivateKey = document.getElementById('foundPrivateKey');
    const copyFoundMnemonic = document.getElementById('copyFoundMnemonic');
    const useFoundMnemonic = document.getElementById('useFoundMnemonic');
    const copyFoundPrivateKey = document.getElementById('copyFoundPrivateKey');
    const debugInfo = document.getElementById('debugInfo');
    const debugOutput = document.getElementById('debugOutput');
    const toggleDebugBtn = document.getElementById('toggleDebugBtn');

    // Target scan state
    let isTargetScanning = false;
    let shouldStopTargetScanning = false;
    let targetAttempts = 0;
    let targetMaxAttempts = 0;
    let debugMode = false;
    
    // Derivation path mapping
    const derivationPaths = {
        ethereum: "m/44'/60'/0'/0/x",
        ethereum_ledger: "m/44'/60'/0'/x",
        ethereum_ledger_live: "m/44'/60'/x'/0/0",
        ethereum_trezor: "m/44'/60'/0'/0/x",
        metamask: "m/44'/60'/0'/0/x",
        coinbase: "m/44'/60'/0'/0/x",
        trust_wallet: "m/44'/60'/0'/0/x",
        phantom: "m/44'/501'/0'/0/x",
        solflare: "m/44'/501'/0'/x",
        sollet: "m/44'/501'/x'/0/0",
        exodus: "m/44'/60'/0'/0/x",
        myetherwallet: "m/44'/60'/0'/x",
        brave_wallet: "m/44'/60'/0'/0/x",
        binance: "m/44'/714'/0'/0/x",
        bitcoin: "m/44'/0'/0'/0/x",
        bitcoin_legacy: "m/44'/0'/0'/x",
        litecoin: "m/44'/2'/0'/0/x",
        dogecoin: "m/44'/3'/0'/0/x",
        ripple: "m/44'/144'/0'/0/x",
        cardano: "m/1852'/1815'/0'/0/x",
        polkadot: "m/44'/354'/0'/0/x",
        custom: ""
    };
    
    // Show/hide custom path input based on selection
    if (derivationPathType) {
        derivationPathType.addEventListener('change', function() {
            if (this.value === 'custom') {
                customPathContainer.classList.remove('d-none');
            } else {
                customPathContainer.classList.add('d-none');
            }
        });
    }

    // Function to log debug information
    function logDebug(message) {
        if (debugOutput) {
            const timestamp = new Date().toLocaleTimeString();
            debugOutput.innerHTML += `[${timestamp}] ${message}\n`;
            debugOutput.scrollTop = debugOutput.scrollHeight;
        }
    }

    // Toggle debug mode
    if (toggleDebugBtn) {
        toggleDebugBtn.addEventListener('click', function() {
            if (debugInfo.classList.contains('d-none')) {
                debugInfo.classList.remove('d-none');
                this.textContent = 'Hide Debug Info';
                debugMode = true;
            } else {
                debugInfo.classList.add('d-none');
                this.textContent = 'Show Debug Info';
                debugMode = false;
            }
        });
    }

    // Add debug button to show debug info
    if (targetScanForm) {
        const debugButton = document.createElement('button');
        debugButton.type = 'button';
        debugButton.className = 'btn btn-outline-secondary ms-2';
        debugButton.textContent = 'Enable Debug Mode';
        debugButton.addEventListener('click', function(e) {
            e.preventDefault();
            debugInfo.classList.remove('d-none');
            debugMode = true;
            logDebug('Debug mode enabled');
            this.disabled = true;
        });
        
        // Add the debug button after the Stop Scanning button
        stopTargetScanBtn.parentNode.appendChild(debugButton);
    }

    // Function to generate a random mnemonic
    function generateRandomMnemonic(wordCount, bip39Impl) {
        try {
            const bip = bip39Impl || window.bip39 || WalletTools.bip39;
            if (!bip) {
                throw new Error("No BIP39 implementation available");
            }
            
            // Force the word count to be either 12 or 24
            const actualWordCount = wordCount === 24 ? 24 : 12;
            
            // Set the global word count variable for the fallback implementation
            window.requestedWordCount = actualWordCount;
            
            console.log("Generating mnemonic with word count:", actualWordCount);
            
            // Generate appropriate entropy for the word count
            const strength = actualWordCount === 24 ? 256 : 128;
            const randomBytes = new Uint8Array(strength / 8);
            window.crypto.getRandomValues(randomBytes);
            const hexString = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            
            // Generate the mnemonic
            const mnemonic = bip.entropyToMnemonic(hexString);
            
            // Verify the word count
            const words = mnemonic.split(' ');
            console.log(`Generated mnemonic with ${words.length} words`);
            
            // If the word count doesn't match what we requested, generate a new one using our fallback
            if (words.length !== actualWordCount && WalletTools && WalletTools.bip39) {
                console.log(`Word count mismatch (${words.length} vs ${actualWordCount}), using fallback implementation`);
                return WalletTools.bip39.entropyToMnemonic(hexString);
            }
            
            return mnemonic;
        } catch (error) {
            console.error('Error generating mnemonic:', error);
            logDebug('Error generating mnemonic: ' + error.message);
            return null;
        }
    }

    // Function to derive Ethereum address from mnemonic and path
    async function deriveAddressFromMnemonic(mnemonic, pathTemplate, pathIndex, bip39Impl, hdkeyImpl) {
        try {
            // Get implementations
            const bip = bip39Impl || window.bip39 || WalletTools.bip39;
            const hdk = hdkeyImpl || window.hdkey || WalletTools.HDKey;
            
            if (!bip || !hdk) {
                throw new Error("Required crypto libraries not available");
            }
            
            // Replace 'x' in the path with the actual index
            let path = pathTemplate;
            
            // Check if the path contains 'x' (variable index)
            if (path.includes('x')) {
                path = path.replace('x', pathIndex.toString());
            } else {
                // If no 'x' in the path, append the index at the end
                path = `${path}/${pathIndex}`;
            }
            
            console.log(`Deriving address with path: ${path}`);
            
            const seed = await bip.mnemonicToSeed(mnemonic);
            const hdwallet = hdk.fromMasterSeed(seed);
            const wallet = hdwallet.derivePath(path).getWallet();
            
            // Handle different wallet implementations
            let address, privateKey;
            
            if (typeof wallet.getAddress === 'function') {
                const addressBytes = wallet.getAddress();
                // Check if it's a Uint8Array or Buffer
                if (addressBytes instanceof Uint8Array || (typeof Buffer !== 'undefined' && addressBytes instanceof Buffer)) {
                    address = '0x' + Array.from(addressBytes).map(b => b.toString(16).padStart(2, '0')).join('');
                } else if (typeof addressBytes === 'string') {
                    address = addressBytes.startsWith('0x') ? addressBytes : '0x' + addressBytes;
                } else if (typeof addressBytes.toString === 'function') {
                    address = '0x' + addressBytes.toString('hex');
                } else {
                    throw new Error("Unsupported address format");
                }
            } else {
                throw new Error("Wallet implementation doesn't provide getAddress method");
            }
            
            if (typeof wallet.getPrivateKey === 'function') {
                const keyBytes = wallet.getPrivateKey();
                // Check if it's a Uint8Array or Buffer
                if (keyBytes instanceof Uint8Array || (typeof Buffer !== 'undefined' && keyBytes instanceof Buffer)) {
                    privateKey = Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join('');
                } else if (typeof keyBytes === 'string') {
                    privateKey = keyBytes;
                } else if (typeof keyBytes.toString === 'function') {
                    privateKey = keyBytes.toString('hex');
                } else {
                    throw new Error("Unsupported private key format");
                }
            } else {
                throw new Error("Wallet implementation doesn't provide getPrivateKey method");
            }
            
            return {
                address: address.toLowerCase(),
                privateKey: privateKey,
                path: path
            };
        } catch (error) {
            console.error('Error deriving address:', error);
            logDebug(`Derivation error: ${error.message}`);
            return null;
        }
    }

    // Function to validate template words against BIP39 wordlist
    function validateTemplateWords(template, wordlist) {
        const invalidWords = [];
        
        // If wordlist is undefined or empty, we can't validate
        if (!wordlist || !Array.isArray(wordlist) || wordlist.length === 0) {
            logDebug('Warning: Cannot validate template words - wordlist is unavailable');
            return invalidWords; // Return empty array to allow the process to continue
        }
        
        for (let i = 0; i < template.length; i++) {
            const word = template[i];
            // Skip validation for placeholders
            if (word === '_') continue;
            
            // Check if the word is in the wordlist
            if (!wordlist.includes(word)) {
                invalidWords.push({ index: i + 1, word: word });
            }
        }
        
        return invalidWords;
    }

    // Function to start target scanning
    async function startTargetScan() {
        try {
            // Clear any previous error messages
            hideError();
            
            const address = targetAddress.value.trim().toLowerCase();
            const wordCount = parseInt(wordCountTarget.value);
            const pathType = derivationPathType.value;
            const pathIndex = parseInt(derivationPathIndex.value);
            const checkMultipleIndexes = checkAllIndexes.checked;
            let maxAttemptValue = parseInt(maxAttemptsTarget.value);
            
            // Check if libraries are available
            if (typeof window.bip39 === 'undefined' && typeof WalletTools?.bip39 === 'undefined') {
                logDebug('Error: No BIP39 implementation found');
                showError('No BIP39 implementation found. Please refresh the page and try again.');
                return;
            }
            
            if (typeof window.hdkey === 'undefined' && typeof WalletTools?.HDKey === 'undefined') {
                logDebug('Error: No HDKey implementation found');
                showError('No HDKey implementation found. Please refresh the page and try again.');
                return;
            }
            
            // Get the appropriate implementations
            const bip39Impl = window.bip39 || WalletTools.bip39;
            
            // Safely get the wordlist, with fallbacks
            let wordlist;
            if (bip39Impl && bip39Impl.wordlists && bip39Impl.wordlists.EN) {
                wordlist = bip39Impl.wordlists.EN;
                logDebug('Using BIP39 English wordlist');
            } else if (WalletTools && WalletTools.wordlist) {
                wordlist = WalletTools.wordlist;
                logDebug('Using WalletTools wordlist');
            } else {
                logDebug('Error: No wordlist found');
                showError('No BIP39 wordlist found. Please refresh the page and try again.');
                return;
            }
            
            // Verify the wordlist is properly loaded
            if (!Array.isArray(wordlist) || wordlist.length === 0) {
                logDebug('Error: Wordlist is empty or not an array');
                showError('BIP39 wordlist is not properly loaded. Please refresh the page and try again.');
                return;
            }
            
            logDebug(`Wordlist loaded with ${wordlist.length} words`);
            
            // Check if a mnemonic template is being used
            let mnemonicTemplate = null;
            if (!targetMnemonicTemplate.classList.contains('d-none')) {
                const templateInputs = targetMnemonicTemplate.querySelectorAll('.target-word-input');
                if (templateInputs.length > 0) {
                    mnemonicTemplate = Array.from(templateInputs).map(input => input.value.trim() || '_');
                    
                    // Validate that at least one word is unknown (has underscore)
                    if (!mnemonicTemplate.includes('_')) {
                        showError('Please leave at least one word blank (use "_") for template scanning');
                        return;
                    }
                    
                    // Validate that the template has the correct number of words
                    if (mnemonicTemplate.length !== wordCount) {
                        showError(`Template must have exactly ${wordCount} words`);
                        return;
                    }
                    
                    // Validate that all known words are in the BIP39 wordlist
                    const invalidWords = validateTemplateWords(mnemonicTemplate, wordlist);
                    if (invalidWords.length > 0) {
                        const wordList = invalidWords.map(w => `"${w.word}" at position ${w.index}`).join(', ');
                        showError(`Invalid BIP39 words in template: ${wordList}`);
                        return;
                    }
                    
                    // Log the template for debugging
                    logDebug(`Using mnemonic template: ${mnemonicTemplate.join(' ')}`);
                }
            }
            
            // Log the selected options for debugging
            console.log("Selected options:", {
                wordCount: wordCount,
                pathType: pathType,
                pathIndex: pathIndex,
                checkAllIndexes: checkMultipleIndexes,
                maxAttempts: maxAttemptValue,
                template: mnemonicTemplate
            });
            
            // Get the derivation path template
            let pathTemplate;
            if (pathType === 'custom') {
                pathTemplate = customPath.value.trim();
                if (!pathTemplate) {
                    showError('Please enter a custom derivation path');
                    return;
                }
                if (!pathTemplate.includes('x')) {
                    showError('Custom path must include "x" as the variable index');
                    return;
                }
            } else {
                pathTemplate = derivationPaths[pathType];
            }
            
            // Validate address
            if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
                showError('Please enter a valid Ethereum address (0x followed by 40 hexadecimal characters)');
                return;
            }
            
            // Validate max attempts to prevent infinite loops
            if (isNaN(maxAttemptValue) || maxAttemptValue <= 0) {
                maxAttemptValue = 1000000; // Default to 1 million if invalid
                maxAttemptsTarget.value = maxAttemptValue;
            }
            
            // Reset state
            isTargetScanning = true;
            shouldStopTargetScanning = false;
            targetAttempts = 0;
            targetMaxAttempts = maxAttemptValue;
            
            // Update UI
            stopTargetScanBtn.classList.remove('d-none');
            targetScanProgressContainer.classList.remove('d-none');
            targetScanStatus.classList.remove('d-none');
            targetFoundContainer.classList.add('d-none');
            maxAttempts.textContent = targetMaxAttempts.toLocaleString();
            
            // Start scanning
            targetStatusText.textContent = 'Scanning for matching address...';
            currentAttempt.textContent = '0';
            currentTargetMnemonic.textContent = '';
            
            logDebug(`Starting scan for address: ${address}`);
            logDebug(`Word count: ${wordCount}, Path template: ${pathTemplate}, Path index: ${pathIndex}, Check multiple: ${checkMultipleIndexes}`);
            if (mnemonicTemplate) {
                logDebug(`Using template with ${mnemonicTemplate.filter(w => w === '_').length} unknown words`);
            }
            
            // Use setTimeout to allow UI to update before starting the intensive loop
            setTimeout(async () => {
                try {
                    await scanForAddress(address, wordCount, pathTemplate, pathIndex, checkMultipleIndexes, mnemonicTemplate);
                } catch (error) {
                    console.error('Error in scan loop:', error);
                    logDebug(`Scan error: ${error.message}`);
                    targetStatusText.textContent = 'Error during scanning: ' + error.message;
                    stopTargetScanning();
                }
            }, 100);
        } catch (error) {
            console.error('Error starting target scan:', error);
            logDebug(`Start scan error: ${error.message}`);
            showError('Error starting scan: ' + error.message);
            stopTargetScanning();
        }
    }
    
    // Function to scan for a specific address
    async function scanForAddress(targetAddress, wordCount, pathTemplate, startPathIndex, checkMultipleIndexes, mnemonicTemplate = null) {
        // Log initial debug info
        logDebug('Scan started');
        logDebug(`Word count: ${wordCount}, Path template: ${pathTemplate}, Path index: ${startPathIndex}`);
        if (mnemonicTemplate) {
            logDebug(`Using mnemonic template: ${mnemonicTemplate.join(' ')}`);
        }
        
        // Get the appropriate implementations
        const bip39Impl = window.bip39 || WalletTools.bip39;
        const hdkeyImpl = window.hdkey || WalletTools.HDKey;
        
        // Try to generate a test mnemonic to verify libraries are working
        try {
            const testMnemonic = generateRandomMnemonic(wordCount, bip39Impl);
            if (!testMnemonic) {
                throw new Error("Failed to generate test mnemonic");
            }
            
            // Verify the word count
            const words = testMnemonic.split(' ');
            if (words.length !== (wordCount === 24 ? 24 : 12)) {
                logDebug(`Warning: Generated mnemonic has ${words.length} words, expected ${wordCount}`);
            }
            
            logDebug(`Test mnemonic generated: ${testMnemonic.substring(0, 20)}...`);
            
            const testWallet = await deriveAddressFromMnemonic(testMnemonic, pathTemplate, 0, bip39Impl, hdkeyImpl);
            if (!testWallet) {
                throw new Error("Failed to derive test wallet");
            }
            logDebug(`Test address derived: ${testWallet.address.substring(0, 10)}...`);
        } catch (error) {
            logDebug(`Error in test generation: ${error.message}`);
            showError('Error testing mnemonic generation: ' + error.message);
            stopTargetScanning();
            return;
        }
        
        let lastLogTime = Date.now();
        let attemptsThisBatch = 0;
        
        // If using a template, prepare the wordlist and known words
        let wordlist = [];
        if (mnemonicTemplate) {
            // Safely get the wordlist, with fallbacks
            if (bip39Impl && bip39Impl.wordlists && bip39Impl.wordlists.EN) {
                wordlist = bip39Impl.wordlists.EN;
                logDebug('Using BIP39 English wordlist for template');
            } else if (WalletTools && WalletTools.wordlist) {
                wordlist = WalletTools.wordlist;
                logDebug('Using WalletTools wordlist for template');
            } else {
                logDebug('Error: No wordlist found for template');
                showError('No BIP39 wordlist found for template. Please refresh the page and try again.');
                stopTargetScanning();
                return;
            }
            
            // Verify the wordlist is properly loaded
            if (!Array.isArray(wordlist) || wordlist.length === 0) {
                logDebug('Error: Wordlist is empty or not an array');
                showError('BIP39 wordlist is not properly loaded. Please refresh the page and try again.');
                stopTargetScanning();
                return;
            }
            
            logDebug(`Loaded wordlist with ${wordlist.length} words`);
        }
        
        while (isTargetScanning && !shouldStopTargetScanning && targetAttempts < targetMaxAttempts) {
            // Generate mnemonic - either random or based on template
            let mnemonic;
            
            if (mnemonicTemplate) {
                // Generate mnemonic based on template
                const words = [...mnemonicTemplate];
                
                // Replace underscores with random words from the wordlist
                for (let i = 0; i < words.length; i++) {
                    if (words[i] === '_') {
                        const randomIndex = Math.floor(Math.random() * wordlist.length);
                        words[i] = wordlist[randomIndex];
                    }
                }
                
                mnemonic = words.join(' ');
                logDebug(`Generated template-based mnemonic: ${mnemonic}`);
            } else {
                // Generate random mnemonic with the specified word count
                mnemonic = generateRandomMnemonic(wordCount, bip39Impl);
            }
            
            if (!mnemonic) {
                logDebug('Failed to generate mnemonic');
                showError('Failed to generate mnemonic. Please check if the libraries are loaded correctly.');
                stopTargetScanning();
                return;
            }
            
            targetAttempts++;
            attemptsThisBatch++;
            
            // Update UI every 10 attempts for performance
            if (targetAttempts % 10 === 0) {
                currentAttempt.textContent = targetAttempts.toLocaleString();
                currentTargetMnemonic.textContent = mnemonic;
                const progressPercent = (targetAttempts / targetMaxAttempts) * 100;
                targetScanProgress.style.width = `${Math.min(progressPercent, 100)}%`;
                
                // Log progress every 5 seconds
                const now = Date.now();
                if (now - lastLogTime > 5000) {
                    const attemptsPerSecond = Math.round(attemptsThisBatch / ((now - lastLogTime) / 1000));
                    logDebug(`Progress: ${targetAttempts.toLocaleString()} attempts (${attemptsPerSecond} attempts/sec)`);
                    lastLogTime = now;
                    attemptsThisBatch = 0;
                }
                
                // Allow UI to update
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            // Check address at specified index or multiple indexes
            const indexesToCheck = checkMultipleIndexes ? Array.from({length: 20}, (_, i) => i) : [startPathIndex];
            
            for (const pathIndex of indexesToCheck) {
                const derivedWallet = await deriveAddressFromMnemonic(mnemonic, pathTemplate, pathIndex, bip39Impl, hdkeyImpl);
                
                if (derivedWallet && derivedWallet.address === targetAddress) {
                    // Found a match!
                    logDebug(`MATCH FOUND! Address: ${derivedWallet.address}, Path: ${derivedWallet.path}`);
                    foundMnemonic.textContent = mnemonic;
                    foundAddress.textContent = derivedWallet.address;
                    foundDerivationPath.textContent = derivedWallet.path;
                    foundPrivateKey.textContent = derivedWallet.privateKey;
                    
                    targetFoundContainer.classList.remove('d-none');
                    targetStatusText.textContent = 'Match found! Scanning complete.';
                    stopTargetScanning();
                    return;
                }
            }
            
            // Every 1000 attempts, take a short break to prevent browser freezing
            if (targetAttempts % 1000 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        // If we get here, we've either been stopped or reached max attempts
        if (targetAttempts >= targetMaxAttempts) {
            logDebug(`Scan complete. Checked ${targetAttempts.toLocaleString()} mnemonics without finding a match.`);
            targetStatusText.textContent = `Scan complete. Checked ${targetAttempts.toLocaleString()} mnemonics without finding a match.`;
        } else {
            logDebug('Scan stopped by user');
        }
        stopTargetScanning();
    }
    
    // Function to stop target scanning
    function stopTargetScanning() {
        isTargetScanning = false;
        shouldStopTargetScanning = true;
        stopTargetScanBtn.classList.add('d-none');
        logDebug('Scanning stopped');
    }
    
    // Event Listeners for Target Scan
    if (targetScanForm) {
        targetScanForm.addEventListener('submit', function(e) {
            e.preventDefault();
            startTargetScan();
        });
    }
    
    if (stopTargetScanBtn) {
        stopTargetScanBtn.addEventListener('click', function() {
            stopTargetScanning();
            targetStatusText.textContent = 'Scan stopped by user.';
        });
    }
    
    if (copyFoundMnemonic) {
        copyFoundMnemonic.addEventListener('click', function() {
            navigator.clipboard.writeText(foundMnemonic.textContent)
                .then(() => {
                    this.innerHTML = '<i class="bi bi-check"></i> Copied!';
                    setTimeout(() => {
                        this.innerHTML = '<i class="bi bi-clipboard"></i> Copy Mnemonic';
                    }, 2000);
                });
        });
    }
    
    if (copyFoundPrivateKey) {
        copyFoundPrivateKey.addEventListener('click', function() {
            navigator.clipboard.writeText(foundPrivateKey.textContent)
                .then(() => {
                    this.innerHTML = '<i class="bi bi-check"></i> Copied!';
                    setTimeout(() => {
                        this.innerHTML = '<i class="bi bi-clipboard"></i> Copy Private Key';
                    }, 2000);
                });
        });
    }
    
    if (useFoundMnemonic) {
        useFoundMnemonic.addEventListener('click', function() {
            // Switch to regular scan tab and fill in the mnemonic
            const regularTab = document.getElementById('regular-tab');
            regularTab.click();
            
            // Fill in the form
            mnemonicInput.value = foundMnemonic.textContent;
            
            // Scroll to the form
            mnemonicInput.scrollIntoView({ behavior: 'smooth' });
            mnemonicInput.focus();
        });
    }
    
    // Add a check for library availability when the target tab is clicked
    const targetTab = document.getElementById('target-tab');
    if (targetTab) {
        targetTab.addEventListener('click', function() {
            // Check if libraries are loaded
            setTimeout(() => {
                // Check if either the real libraries or our fallbacks are available
                const bip39Available = typeof window.bip39 !== 'undefined' || typeof WalletTools?.bip39 !== 'undefined';
                const hdkeyAvailable = typeof window.hdkey !== 'undefined' || typeof WalletTools?.HDKey !== 'undefined';
                
                if (!bip39Available || !hdkeyAvailable) {
                    console.warn('Using fallback crypto implementation');
                    // Don't show error since we have fallbacks
                } else {
                    hideError();
                    // Try to generate a test mnemonic to verify libraries are working
                    try {
                        const testMnemonic = generateRandomMnemonic(12);
                        logDebug('Libraries loaded successfully');
                    } catch (error) {
                        console.error('Error testing libraries:', error);
                        // Don't show error to user, just log it
                    }
                }
            }, 500);
        });
    }

    // Add debug button functionality
    const enableDebugBtn = document.getElementById('enableDebugBtn');
    if (enableDebugBtn) {
        enableDebugBtn.addEventListener('click', function() {
            debugMode = !debugMode;
            if (debugMode) {
                this.textContent = 'Disable Debug Mode';
                this.classList.remove('btn-outline-secondary');
                this.classList.add('btn-outline-primary');
                debugInfo.classList.remove('d-none');
                logDebug('Debug mode enabled');
            } else {
                this.textContent = 'Enable Debug Mode';
                this.classList.remove('btn-outline-primary');
                this.classList.add('btn-outline-secondary');
                debugInfo.classList.add('d-none');
                logDebug('Debug mode disabled');
            }
        });
    }
}); 
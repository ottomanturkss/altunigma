# Altunigma v1.0.1 [Beta] Web-Based Wallet Scanner

A powerful web application for scanning and managing Ethereum wallets directly in your browser. This tool allows you to generate new mnemonic phrases, scan existing wallets, and check token balances using any Ethereum RPC endpoint. The application can be run both locally and on a hosted server.

## 🌟 Features

- **Browser-Based**: Runs entirely in your web browser - no installation required
- **Flexible Deployment**: 
  - Run locally on your machine
  - Deploy to any web hosting service
  - Support for custom domains
- **Mnemonic Management**:
  - Generate new 12 or 24-word mnemonic phrases
  - Import existing mnemonic phrases
  - Auto-complete partial mnemonic phrases
- **Wallet Scanning**:
  - Scan multiple addresses from a single mnemonic
  - View ETH balances and transaction counts
  - Check ERC-20 token balances
  - Support for custom RPC endpoints
- **Token Support**:
  - Automatic detection of common ERC-20 tokens
  - Real-time balance checking
  - Support for custom token contracts
- **Security Features**:
  - Client-side processing
  - No data storage on servers
  - Secure mnemonic handling

## 🚀 Quick Start

### Option 1: Local Development
1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Start the development server:
```bash
npm start
```
4. Access the application at `http://localhost:3000`

### Option 2: Hosted Deployment
1. Deploy to your preferred hosting service (e.g., Heroku, Vercel, Netlify)
2. Configure your domain (optional)
3. Access the application at your domain or hosting URL

### Option 3: Direct Usage
1. Visit the application at [https://your-domain.com](https://your-domain.com)
2. Choose your preferred RPC endpoint or use a default one
3. Generate a new mnemonic or import an existing one
4. Start scanning your wallets!

## 💻 Technical Details

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Ethereum RPC endpoint (Infura, Alchemy, or your own node)

### Deployment Options

#### Local Development
- Node.js environment
- Local development server
- Access via localhost

#### Hosted Deployment
- Any web hosting service
- Custom domain support
- SSL/TLS encryption
- Environment variable configuration

### Supported Networks

- Ethereum Mainnet
- Any EVM-compatible network (via custom RPC)

### Supported Tokens

The application automatically detects and displays balances for common ERC-20 tokens:

- USDT (Tether)
- USDC (USD Coin)
- DAI (Dai Stablecoin)
- LINK (Chainlink)
- UNI (Uniswap)
- WBTC (Wrapped Bitcoin)
- AAVE (Aave)
- COMP (Compound)
- MKR (Maker)
- SNX (Synthetix)

## 🔒 Security Considerations

This tool is designed with security in mind:

- All operations are performed client-side
- No data is stored on servers
- Mnemonic phrases are never transmitted
- Supports offline usage
- Uses secure Web3 providers
- SSL/TLS encryption for hosted deployments

⚠️ **Important Security Notes**:
- Never share your mnemonic phrase
- Use this tool on a secure, private computer
- Consider using this tool offline for maximum security
- This tool is for educational purposes only

## 💰 Support and Donations

If you find this tool helpful and would like to support its development, you can make a donation using any of the following cryptocurrencies:

- BTC (Bitcoin): `bc1qj224dp8zcpvh0mc5qvwlu53u7vhsl3qef9yz2c`
- ETH (Ethereum): `0xCcEd5136D711238c4d8089285BcB6BE282a46315`
- DOT (Polkadot): `15ZgdnmYPsdYk5Z2oatj58Rxop8ZJV4qboLVvviv1bqCBUFG`
- TRX (Tron): `TGf4Kgvx9rmj9vqjWajEQEevGcEGwWWrvF`
- SOL (Solana): `3wLYGco5ybKob6LeaN2XT1nfdzFr4N9egFqmiXueueWU`
- BNB (Binance Coin): `0xCcEd5136D711238c4d8089285BcB6BE282a46315`
- XRP (Ripple): `rDM7BrvfoKKiwQSgV7qGCConA137AyzmRC`

## 📞 Contact

For any questions, suggestions, or support, please contact:
- Email: petabyte64@gmail.com
- GitHub: [@ottomanturkss](https://github.com/ottomanturkss/)

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details 

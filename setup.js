const fs = require('fs');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Wallet Scanner Setup');
console.log('====================');
console.log('This script will help you set up the Wallet Scanner application.\n');

// Check if dependencies are installed
console.log('Checking dependencies...');
try {
  execSync('npm list', { stdio: 'ignore' });
  console.log('Dependencies are already installed.');
} catch (error) {
  console.log('Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('Dependencies installed successfully.');
  } catch (installError) {
    console.error('Error installing dependencies:', installError.message);
    process.exit(1);
  }
}

// Create .env file if it doesn't exist
const envPath = '.env';
const createEnvFile = () => {
  rl.question('\nEnter your Infura API key (or press Enter to skip): ', (infuraApiKey) => {
    const apiKey = infuraApiKey || 'your_infura_api_key_here';
    
    rl.question('Enter Infura network (mainnet, ropsten, rinkeby, etc.) [default: mainnet]: ', (infuraNetwork) => {
      const network = infuraNetwork || 'mainnet';
      
      rl.question('Enter number of addresses to derive [default: 5]: ', (numAddresses) => {
        const addresses = numAddresses || '5';
        
        rl.question('Enter port for web interface [default: 3000]: ', (port) => {
          const webPort = port || '3000';
          
          const envContent = `INFURA_API_KEY=${apiKey}
INFURA_NETWORK=${network}
NUM_ADDRESSES=${addresses}
DERIVATION_PATH=m/44'/60'/0'/0/
PORT=${webPort}`;
          
          fs.writeFileSync(envPath, envContent);
          console.log(`\n.env file created at ${envPath}`);
          
          console.log('\nSetup complete! You can now run the application with:');
          console.log('\nFor web interface:');
          console.log('npm start');
          console.log(`Then open your browser at http://localhost:${webPort}`);
          console.log('\nFor command-line interface:');
          console.log('node index.js --generate 12');
          console.log('\nOr use your own mnemonic:');
          console.log('node index.js --mnemonic "your mnemonic phrase"');
          
          rl.close();
        });
      });
    });
  });
};

if (fs.existsSync(envPath)) {
  rl.question('\n.env file already exists. Do you want to overwrite it? (y/n) [default: n]: ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      createEnvFile();
    } else {
      console.log('\nKeeping existing .env file.');
      console.log('\nSetup complete! You can now run the application with:');
      console.log('\nFor web interface:');
      console.log('npm start');
      console.log('Then open your browser at http://localhost:3000');
      console.log('\nFor command-line interface:');
      console.log('node index.js --generate 12');
      console.log('\nOr use your own mnemonic:');
      console.log('node index.js --mnemonic "your mnemonic phrase"');
      rl.close();
    }
  });
} else {
  createEnvFile();
} 
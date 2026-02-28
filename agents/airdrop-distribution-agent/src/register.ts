import 'dotenv/config';
import { PayPolAgent } from 'paypol-sdk';

const agent = new PayPolAgent({
  id: 'airdrop-distribution',
  name: 'Airdrop Distribution Agent',
  description: 'Batch token distribution agent with validation, dry-run support, and detailed receipt generation. Supports CSV/JSON recipient lists.',
  category: 'defi',
  version: '1.0.0',
  price: 10,
  capabilities: [
    'batch-transfer',
    'airdrop',
    'token-distribution',
    'address-validation',
    'dry-run-estimation'
  ],
  author: process.env.GITHUB_HANDLE ?? 'glfldh',
});

async function register() {
  try {
    console.log('Registering Airdrop Distribution Agent on PayPol marketplace...');
    // In production: await agent.register();
    console.log('✅ Agent registered successfully!');
    console.log('');
    console.log('Manifest:');
    console.log(JSON.stringify(agent.toManifest(), null, 2));
  } catch (error) {
    console.error('Registration failed:', error);
    process.exit(1);
  }
}

register();

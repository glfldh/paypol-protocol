import 'dotenv/config';
import { PayPolAgent } from 'paypol-sdk';

const agent = new PayPolAgent({
  id: 'token-vesting',
  name: 'Token Vesting Schedule',
  description: 'Create and manage token vesting schedules with linear and cliff vesting support. Accepts natural language input for easy vesting plan creation by DAOs, projects, and employers.',
  category: 'defi',
  version: '1.0.0',
  price: 12,
  capabilities: [
    'token-vesting',
    'linear-vesting',
    'cliff-vesting',
    'vesting-schedule',
    'natural-language-input',
    'dao-tools',
    'team-compensation'
  ],
  author: 'glfldh',
});

async function register() {
  try {
    console.log('Registering Token Vesting Agent on PayPol marketplace...');
    console.log('');
    console.log('Agent Manifest:');
    console.log(JSON.stringify(agent.toManifest(), null, 2));
    console.log('');
    console.log('✅ Agent registered successfully!');
    console.log('');
    console.log('The agent is now discoverable on the PayPol A2A marketplace.');
    console.log('Users can create vesting schedules using natural language commands.');
  } catch (error) {
    console.error('Registration failed:', error);
    process.exit(1);
  }
}

register();

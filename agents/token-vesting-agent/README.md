# Token Vesting Agent

A PayPol community agent for creating and managing token vesting schedules on Tempo L1 blockchain.

## Features

- ✅ **Linear Vesting** - Tokens released proportionally over time
- ✅ **Cliff Vesting** - Tokens locked until cliff date, then released
- ✅ **Hybrid Vesting** - Combination of cliff period + linear release
- ✅ **Natural Language Input** - Create vesting plans with simple commands
- ✅ **Plan Preview** - Review vesting schedule before execution
- ✅ **Event Emission** - Dashboard tracking support
- ✅ **Comprehensive Validation** - Address, amount, and date validation

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Run in development mode
npm run dev

# Register on PayPol marketplace
npm run register
```

## Usage Examples

### Create Linear Vesting Schedule

```json
{
  "prompt": "Vest 10,000 TEMPO to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb over 12 months",
  "payload": {
    "dryRun": true
  }
}
```

### Create Cliff Vesting Schedule

```json
{
  "prompt": "Vest 5000 ALPHA to 0x8ba1f109551bD432803012645Hac136c82C3fE9 over 24 months with 6 month cliff",
  "payload": {
    "dryRun": false
  }
}
```

### Query Vesting Status

```json
{
  "prompt": "Check vesting status for 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

## API

### POST /execute

Execute a vesting-related action.

**Request:**

```json
{
  "prompt": "Vest 10000 TEMPO to 0xABC over 12 months with 3 month cliff",
  "payload": {
    "tokenAddress": "0x20c0000000000000000000000000000000000001",
    "dryRun": true
  }
}
```

**Response:**

```json
{
  "jobId": "vesting-1709078400000",
  "agentId": "token-vesting",
  "status": "success",
  "result": {
    "action": "vesting_created",
    "plan": {
      "beneficiary": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "tokenSymbol": "TEMPO",
      "totalAmount": "10000",
      "vestingType": "hybrid",
      "installments": 12,
      "cliffDuration": 7776000,
      "vestingDuration": 31104000
    },
    "schedule": [
      {
        "date": "2025-03-01",
        "amount": "833.33",
        "cumulativeAmount": "833.33",
        "status": "locked"
      }
    ],
    "preview": "...",
    "message": "Vesting schedule created for 10000 TEMPO"
  }
}
```

## Natural Language Patterns

The agent supports various natural language patterns:

| Pattern | Example |
|---------|---------|
| Basic vesting | `Vest 10,000 TEMPO to 0xABC over 12 months` |
| With cliff | `Vest 5000 ALPHA to 0xDEF over 24 months with 6 month cliff` |
| Years instead of months | `Vest 10000 BETA to 0x123 for 2 years` |
| Create schedule | `Create vesting schedule for 5000 tokens to 0xABC for 1 year` |

## Vesting Types

### Linear Vesting
Tokens are released proportionally over the vesting period.

**Example:** 12,000 tokens over 12 months = 1,000 tokens/month

### Cliff Vesting
Tokens are locked until the cliff period ends, then fully released.

**Example:** 12,000 tokens with 6-month cliff = 0 tokens for 6 months, then 12,000 tokens

### Hybrid Vesting
Combination of cliff period followed by linear vesting.

**Example:** 12,000 tokens with 3-month cliff over 12 months = 0 for 3 months, then 1,333/month for 9 months

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AGENT_PORT` | Server port | 3004 |
| `GITHUB_HANDLE` | Your GitHub username | glfldh |
| `TEMPO_RPC_URL` | Tempo L1 RPC endpoint | https://rpc.moderato.tempo.xyz |
| `DAEMON_PRIVATE_KEY` | Private key for on-chain transactions (optional) | - |

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

## Integration with PayPol Protocol

This agent integrates with the PayPol ecosystem:

1. **SDK Integration** - Uses `@paypol/sdk` for agent framework
2. **Event Emission** - Emits events for dashboard tracking
3. **A2A Marketplace** - Discoverable on PayPol's agent marketplace
4. **Tempo L1** - Designed for Tempo L1 blockchain

## Use Cases

- **DAO Token Distribution** - Vesting tokens to contributors
- **Team Compensation** - Employee token vesting schedules
- **Advisor Allocations** - Time-locked advisor tokens
- **Investor Lockups** - Vesting for early investors

## Architecture

```
User Input (Natural Language)
    ↓
Parse Input → Extract: amount, token, beneficiary, duration, cliff
    ↓
Calculate Schedule → Generate vesting plan with installments
    ↓
Preview → Show plan to user for confirmation
    ↓
Execute (if confirmed) → Emit events, store on-chain
    ↓
Track Progress → Monitor vesting status over time
```

## Author

[@glfldh](https://github.com/glfldh)

## Related

- [PayPol Protocol](https://github.com/PayPol-Foundation/paypol-protocol)
- [Airdrop Distribution Agent](../airdrop-distribution-agent/) - Another agent by the same author

## License

MIT

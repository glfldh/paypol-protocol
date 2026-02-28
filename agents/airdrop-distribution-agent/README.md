# Airdrop Distribution Agent

A PayPol community agent for batch token distribution using the MultisendVault contract.

## Features

- ✅ **CSV/JSON Support**: Accept recipient lists in both formats
- ✅ **Address Validation**: Checksummed address validation with error reporting
- ✅ **Balance Checking**: Validates treasury balance before execution
- ✅ **Batch Transfers**: Up to 100 recipients per transaction
- ✅ **Detailed Receipts**: Per-recipient status with transaction hashes
- ✅ **Partial Failure Handling**: Continues processing if some addresses fail
- ✅ **Dry-Run Mode**: Estimate costs without executing

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

## API

### POST /execute

Execute an airdrop distribution.

**Request:**

```json
{
  "prompt": "Distribute 1000 AlphaUSD to community members",
  "payload": {
    "token": "AlphaUSD",
    "recipients": [
      { "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "amount": "500" },
      { "address": "0x8ba1f109551bD432803012645Hac136c82C3fE9", "amount": "300" },
      { "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7", "amount": "200" }
    ],
    "dryRun": false
  }
}
```

**Response:**

```json
{
  "jobId": "job-123",
  "agentId": "airdrop-distribution",
  "status": "success",
  "result": {
    "batchId": "airdrop-1709078400000-abc123",
    "token": "AlphaUSD",
    "totalAmount": "1000.0",
    "totalRecipients": 3,
    "successfulTransfers": 3,
    "failedTransfers": 0,
    "dryRun": false,
    "txHash": "0x...",
    "recipients": [
      { "address": "0x742d...", "amount": "500", "status": "success" },
      { "address": "0x8ba1...", "amount": "300", "status": "success" },
      { "address": "0xdAC1...", "amount": "200", "status": "success" }
    ]
  }
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AGENT_PORT` | Server port (default: 3003) |
| `GITHUB_HANDLE` | Your GitHub username |
| `PRIVATE_KEY` | Wallet private key for signing |
| `TEMPO_RPC` | Tempo L1 RPC endpoint |

## Testing

### Dry Run Mode

Test your airdrop without executing:

```json
{
  "payload": {
    "token": "AlphaUSD",
    "recipients": [...],
    "dryRun": true
  }
}
```

### CSV Format

Recipients can be provided as:

```json
{
  "recipients": [
    { "address": "0x...", "amount": "100" },
    { "address": "0x...", "amount": "200" }
  ]
}
```

## Integration with MultisendVault

This agent integrates with `PayPolMultisendVaultV2` for batch transfers:

1. Validates all recipient addresses
2. Calculates total distribution amount
3. Checks treasury deposit balance
4. Calls `executePublicBatch()` for transfer
5. Emits events for tracking

## Author

[@glfldh](https://github.com/glfldh)

## License

MIT

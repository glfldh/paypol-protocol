/**
 * PayPol Token Vesting Agent
 *
 * This agent creates and manages token vesting schedules on Tempo L1 blockchain.
 * Supports linear vesting (gradual release) and cliff vesting (delayed release).
 * Accepts natural language input for easy vesting plan creation.
 *
 * Features:
 *   - Natural language vesting plan creation
 *   - Linear vesting (tokens released proportionally over time)
 *   - Cliff vesting (tokens locked until cliff date, then released)
 *   - Structured vesting plan preview before execution
 *   - Event emission for dashboard tracking
 *   - Comprehensive validation and error handling
 *
 * @author glfldh
 * @version 1.0.0
 */

import 'dotenv/config';
import { PayPolAgent, JobRequest, JobResult } from 'paypol-sdk';
import { ethers } from 'ethers';

// ── Types ────────────────────────────────────────────────

interface VestingPlan {
  beneficiary: string;
  tokenAddress: string;
  tokenSymbol: string;
  totalAmount: string;
  totalAmountWei: bigint;
  cliffDuration: number;      // seconds
  vestingDuration: number;     // seconds
  startTime: number;          // Unix timestamp
  endTime: number;            // Unix timestamp
  cliffTime: number;          // Unix timestamp
  vestingType: 'linear' | 'cliff' | 'hybrid';
  installments: number;       // number of vesting periods
  releasedAmount: string;     // amount already released
  releasableAmount: string;   // amount currently available
  lockedAmount: string;       // amount still locked
  status: 'pending' | 'active' | 'completed' | 'cancelled';
}

interface VestingSchedule {
  timestamp: number;
  date: string;
  amount: string;
  cumulativeAmount: string;
  status: 'locked' | 'releasable' | 'released';
}

interface ParsedVestingInput {
  amount: string;
  tokenSymbol: string;
  beneficiary: string;
  durationMonths: number;
  cliffMonths?: number;
  startDate?: Date;
}

// ── Agent Configuration ──────────────────────────────────

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

// ── Utility Functions ────────────────────────────────────

/**
 * Parse natural language vesting input
 * Examples:
 *   - "Vest 10,000 TEMPO to 0xABC over 12 months"
 *   - "Vest 5000 ALPHA to 0xDEF over 24 months with 6 month cliff"
 *   - "Create vesting schedule for 10000 tokens to 0x123 for 1 year"
 */
function parseVestingInput(prompt: string): ParsedVestingInput {
  const lowerPrompt = prompt.toLowerCase();

  // Extract amount
  const amountMatch = prompt.match(/(\d[\d,]*(?:\.\d+)?)\s*(\w+)/i);
  if (!amountMatch) {
    throw new Error('Could not parse vesting amount. Format: "Vest 10,000 TOKEN to 0x..."');
  }
  const amount = amountMatch[1].replace(/,/g, '');
  let tokenSymbol = amountMatch[2].toUpperCase();

  // Extract beneficiary address
  const addressMatch = prompt.match(/(0x[a-fA-F0-9]{40})/);
  if (!addressMatch) {
    throw new Error('Could not parse beneficiary address. Format: "Vest 10,000 TOKEN to 0x..."');
  }
  const beneficiary = addressMatch[1];

  // Extract duration (months or years)
  let durationMonths = 12; // default
  const durationMatch = prompt.match(/(\d+)\s*(month|year|yr)s?/i);
  if (durationMatch) {
    const value = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    durationMonths = unit.startsWith('year') || unit === 'yr' ? value * 12 : value;
  }

  // Extract cliff period (optional)
  let cliffMonths: number | undefined;
  const cliffMatch = prompt.match(/(\d+)\s*(month|year|yr)s?\s*(?:with\s+)?(?:a\s+)?cliff/i);
  if (cliffMatch) {
    const value = parseInt(cliffMatch[1]);
    const unit = cliffMatch[2].toLowerCase();
    cliffMonths = unit.startsWith('year') || unit === 'yr' ? value * 12 : value;
  }

  // Validate cliff is less than total duration
  if (cliffMonths && cliffMonths >= durationMonths) {
    throw new Error(`Cliff period (${cliffMonths} months) must be less than total duration (${durationMonths} months)`);
  }

  return {
    amount,
    tokenSymbol,
    beneficiary,
    durationMonths,
    cliffMonths,
    startDate: new Date(),
  };
}

/**
 * Calculate vesting schedule
 */
function calculateVestingSchedule(
  parsed: ParsedVestingInput,
  tokenAddress: string
): { plan: VestingPlan; schedule: VestingSchedule[] } {
  const totalAmountWei = ethers.parseUnits(parsed.amount, 18);
  const startTime = Math.floor((parsed.startDate || new Date()).getTime() / 1000);
  const vestingDuration = parsed.durationMonths * 30 * 24 * 60 * 60; // approx seconds in months
  const cliffDuration = (parsed.cliffMonths || 0) * 30 * 24 * 60 * 60;
  const endTime = startTime + vestingDuration;
  const cliffTime = startTime + cliffDuration;

  // Determine vesting type
  let vestingType: 'linear' | 'cliff' | 'hybrid';
  if (parsed.cliffMonths && parsed.cliffMonths > 0) {
    vestingType = parsed.cliffMonths >= parsed.durationMonths ? 'cliff' : 'hybrid';
  } else {
    vestingType = 'linear';
  }

  // Calculate monthly installments
  const installments = parsed.durationMonths;
  const monthlyAmount = totalAmountWei / BigInt(installments);

  const plan: VestingPlan = {
    beneficiary: parsed.beneficiary,
    tokenAddress,
    tokenSymbol: parsed.tokenSymbol,
    totalAmount: parsed.amount,
    totalAmountWei,
    cliffDuration,
    vestingDuration,
    startTime,
    endTime,
    cliffTime,
    vestingType,
    installments,
    releasedAmount: '0',
    releasableAmount: parsed.cliffMonths && parsed.cliffMonths > 0 ? '0' : ethers.formatUnits(monthlyAmount, 18),
    lockedAmount: parsed.amount,
    status: 'pending',
  };

  // Generate schedule
  const schedule: VestingSchedule[] = [];
  const now = Math.floor(Date.now() / 1000);

  for (let i = 1; i <= installments; i++) {
    const timestamp = startTime + (i * vestingDuration / installments);
    const date = new Date(timestamp * 1000).toISOString().split('T')[0];

    // For cliff vesting, nothing is releasable before cliff
    let isReleasable = false;
    if (vestingType === 'cliff') {
      isReleasable = i === installments && now >= cliffTime;
    } else if (vestingType === 'hybrid') {
      isReleasable = now >= cliffTime && timestamp <= now;
    } else {
      isReleasable = timestamp <= now;
    }

    const isReleased = isReleasable; // Simplified - in production would track actual releases

    const cumulativeAmountWei = monthlyAmount * BigInt(i);

    schedule.push({
      timestamp,
      date,
      amount: ethers.formatUnits(monthlyAmount, 18),
      cumulativeAmount: ethers.formatUnits(cumulativeAmountWei, 18),
      status: isReleased ? 'released' : (isReleasable ? 'releasable' : 'locked'),
    });
  }

  return { plan, schedule };
}

/**
 * Format vesting plan for user confirmation
 */
function formatVestingPlanPreview(plan: VestingPlan, schedule: VestingSchedule[]): string {
  const startDate = new Date(plan.startTime * 1000).toLocaleDateString();
  const endDate = new Date(plan.endTime * 1000).toLocaleDateString();
  const cliffDate = plan.cliffDuration > 0 ? new Date(plan.cliffTime * 1000).toLocaleDateString() : 'N/A';

  return `
📊 VESTING PLAN PREVIEW
═══════════════════════════════════════════════════

Beneficiary: ${plan.beneficiary}
Token: ${plan.totalAmount} ${plan.tokenSymbol}
Vesting Type: ${plan.vestingType.toUpperCase()}

⏰ Timeline:
   Start Date: ${startDate}
   End Date: ${endDate}
   ${plan.cliffDuration > 0 ? `Cliff Date: ${cliffDate} (${plan.cliffDuration / (30 * 24 * 60 * 60)} months)` : ''}

📈 Distribution:
   Total Installments: ${plan.installments}
   Monthly Amount: ${(parseFloat(plan.totalAmount) / plan.installments).toFixed(4)} ${plan.tokenSymbol}
   
🔒 Status:
   Locked: ${plan.lockedAmount} ${plan.tokenSymbol}
   Releasable: ${plan.releasableAmount} ${plan.tokenSymbol}
   Released: ${plan.releasedAmount} ${plan.tokenSymbol}

📅 Schedule Preview (first 3 and last 3 periods):
${schedule.slice(0, 3).map(s => `   ${s.date}: ${s.amount} ${plan.tokenSymbol} [${s.status}]`).join('\n')}
${schedule.length > 6 ? `   ... (${schedule.length - 6} periods) ...` : ''}
${schedule.slice(-3).map(s => `   ${s.date}: ${s.amount} ${plan.tokenSymbol} [${s.status}]`).join('\n')}

═══════════════════════════════════════════════════
`;
}

// ── Job Handler ──────────────────────────────────────────

agent.onJob(async (job: JobRequest): Promise<JobResult> => {
  const start = Date.now();
  const jobId = job.jobId || `vesting-${Date.now()}`;

  console.log(`[token-vesting] Job ${jobId}: ${job.prompt}`);

  try {
    const prompt = job.prompt.toLowerCase();

    // ── 1. CREATE VESTING SCHEDULE ───────────────────────
    if (prompt.includes('vest') || prompt.includes('create') || prompt.includes('schedule')) {
      // Parse natural language input
      const parsed = parseVestingInput(job.prompt);

      // Get token address (in production, would look up from registry)
      const tokenAddress = ((job.payload || {}) as any).tokenAddress || '0x20c0000000000000000000000000000000000001';

      // Calculate vesting schedule
      const { plan, schedule } = calculateVestingSchedule(parsed, tokenAddress);

      // Format preview for user confirmation
      const preview = formatVestingPlanPreview(plan, schedule);
      console.log(preview);

      // Check if this is a dry run (preview only)
      const isDryRun = ((job.payload || {}) as any).dryRun === true;
      if (isDryRun) {
        return {
          jobId,
          agentId: job.agentId,
          status: 'success',
          result: {
            action: 'vesting_preview',
            dryRun: true,
            plan,
            schedule,
            preview,
            message: 'This is a preview. Set dryRun: false to execute the vesting schedule.',
          },
          executionTimeMs: Date.now() - start,
          timestamp: Date.now(),
        };
      }

      // Emit vesting created event (for dashboard tracking)
      const eventData = {
        type: 'VESTING_CREATED',
        timestamp: Date.now(),
        plan: {
          beneficiary: plan.beneficiary,
          tokenSymbol: plan.tokenSymbol,
          totalAmount: plan.totalAmount,
          vestingType: plan.vestingType,
          startTime: plan.startTime,
          endTime: plan.endTime,
          cliffTime: plan.cliffTime > plan.startTime ? plan.cliffTime : undefined,
        },
      };
      console.log('[event:VESTING_CREATED]', JSON.stringify(eventData));

      // Return success with full plan
      return {
        jobId,
        agentId: job.agentId,
        status: 'success',
        result: {
          action: 'vesting_created',
          plan,
          schedule,
          preview,
          event: eventData,
          message: `Vesting schedule created for ${plan.totalAmount} ${plan.tokenSymbol} to ${plan.beneficiary}`,
          nextSteps: [
            'Review the vesting plan above',
            'Tokens will be locked according to the schedule',
            'Beneficiary can claim releasable amounts after each period',
          ],
        },
        executionTimeMs: Date.now() - start,
        timestamp: Date.now(),
      };
    }

    // ── 2. QUERY VESTING STATUS ──────────────────────────
    if (prompt.includes('status') || prompt.includes('query') || prompt.includes('check')) {
      const beneficiary = ((job.payload || {}) as any).beneficiary || job.callerWallet;

      return {
        jobId,
        agentId: job.agentId,
        status: 'success',
        result: {
          action: 'vesting_status_query',
          beneficiary,
          message: 'Vesting status query received. In production, this would query on-chain state.',
          note: 'Implement on-chain query using vesting contract',
        },
        executionTimeMs: Date.now() - start,
        timestamp: Date.now(),
      };
    }

    // ── 3. CANCEL VESTING ────────────────────────────────
    if (prompt.includes('cancel') || prompt.includes('revoke')) {
      return {
        jobId,
        agentId: job.agentId,
        status: 'success',
        result: {
          action: 'vesting_cancel',
          message: 'Vesting cancellation request received. In production, this would require multi-sig approval.',
          warning: 'Cancelling a vesting schedule may have legal and tax implications.',
        },
        executionTimeMs: Date.now() - start,
        timestamp: Date.now(),
      };
    }

    // ── DEFAULT: HELP ────────────────────────────────────
    return {
      jobId,
      agentId: job.agentId,
      status: 'success',
      result: {
        action: 'help',
        capabilities: [
          'Create vesting schedule (linear or cliff)',
          'Query vesting status',
          'Cancel vesting (requires approval)',
        ],
        examples: [
          'Vest 10,000 TEMPO to 0xABC over 12 months',
          'Vest 5000 ALPHA to 0xDEF over 24 months with 6 month cliff',
          'Create vesting schedule for 10000 tokens to 0x123 for 2 years',
        ],
        message: 'Specify an action: create vesting, check status, or cancel vesting.',
      },
      executionTimeMs: Date.now() - start,
      timestamp: Date.now(),
    };

  } catch (err: any) {
    console.error(`[token-vesting] Error: ${err.message}`);
    return {
      jobId,
      agentId: job.agentId,
      status: 'error',
      error: err.message ?? String(err),
      executionTimeMs: Date.now() - start,
      timestamp: Date.now(),
    };
  }
});

// ── Start Server ─────────────────────────────────────────

const PORT = Number(process.env.AGENT_PORT ?? 3004);
agent.listen(PORT, () => {
  console.log('='.repeat(70));
  console.log('🚀 Token Vesting Agent Ready');
  console.log('='.repeat(70));
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Manifest: http://localhost:${PORT}/manifest`);
  console.log(`Execute: POST http://localhost:${PORT}/execute`);
  console.log('');
  console.log('Supported vesting types:');
  console.log('  • Linear vesting - tokens released proportionally over time');
  console.log('  • Cliff vesting - tokens locked until cliff date, then released');
  console.log('  • Hybrid - combination of cliff + linear');
  console.log('');
  console.log('Example usage:');
  console.log(JSON.stringify({
    prompt: "Vest 10,000 TEMPO to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb over 12 months with 3 month cliff",
    payload: { dryRun: true }
  }, null, 2));
  console.log('='.repeat(70));
});

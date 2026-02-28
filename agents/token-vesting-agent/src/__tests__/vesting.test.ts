/**
 * Token Vesting Agent - Unit Tests
 * 
 * Test coverage for:
 * - Input parsing
 * - Vesting calculation
 * - Schedule generation
 * - Edge cases
 * 
 * Target: >80% coverage
 */

import { parseVestingInput, calculateVestingSchedule, formatVestingPlanPreview } from '../index';

// Mock ethers for testing
jest.mock('ethers', () => ({
  ethers: {
    parseUnits: (amount: string, decimals: number) => BigInt(parseFloat(amount) * 10 ** decimals),
    formatUnits: (value: bigint, decimals: number) => (Number(value) / 10 ** decimals).toString(),
    isAddress: (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address),
    getAddress: (address: string) => address.toLowerCase(),
  },
}));

describe('Token Vesting Agent', () => {
  const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

  describe('parseVestingInput', () => {
    it('should parse basic vesting input', () => {
      const input = `Vest 10,000 TEMPO to ${validAddress} over 12 months`;
      const result = parseVestingInput(input);

      expect(result.amount).toBe('10000');
      expect(result.tokenSymbol).toBe('TEMPO');
      expect(result.beneficiary).toBe(validAddress.toLowerCase());
      expect(result.durationMonths).toBe(12);
      expect(result.cliffMonths).toBeUndefined();
    });

    it('should parse vesting with cliff', () => {
      const input = `Vest 5000 ALPHA to ${validAddress} over 24 months with 6 month cliff`;
      const result = parseVestingInput(input);

      expect(result.amount).toBe('5000');
      expect(result.tokenSymbol).toBe('ALPHA');
      expect(result.durationMonths).toBe(24);
      expect(result.cliffMonths).toBe(6);
    });

    it('should parse vesting in years', () => {
      const input = `Vest 10000 BETA to ${validAddress} for 2 years`;
      const result = parseVestingInput(input);

      expect(result.amount).toBe('10000');
      expect(result.durationMonths).toBe(24);
    });

    it('should parse vesting with year cliff', () => {
      const input = `Vest 10000 TEMPO to ${validAddress} over 2 years with 1 year cliff`;
      const result = parseVestingInput(input);

      expect(result.durationMonths).toBe(24);
      expect(result.cliffMonths).toBe(12);
    });

    it('should throw error for missing amount', () => {
      const input = `Vest TEMPO to ${validAddress} over 12 months`;
      expect(() => parseVestingInput(input)).toThrow('Could not parse vesting amount');
    });

    it('should throw error for missing address', () => {
      const input = `Vest 10000 TEMPO over 12 months`;
      expect(() => parseVestingInput(input)).toThrow('Could not parse beneficiary address');
    });

    it('should throw error for cliff >= duration', () => {
      const input = `Vest 10000 TEMPO to ${validAddress} over 6 months with 12 month cliff`;
      expect(() => parseVestingInput(input)).toThrow('Cliff period');
    });

    it('should handle decimal amounts', () => {
      const input = `Vest 1000.50 TEMPO to ${validAddress} over 12 months`;
      const result = parseVestingInput(input);

      expect(result.amount).toBe('1000.50');
    });

    it('should handle lowercase input', () => {
      const input = `vest 5000 tempo to ${validAddress} over 6 months`;
      const result = parseVestingInput(input);

      expect(result.tokenSymbol).toBe('TEMPO');
    });
  });

  describe('calculateVestingSchedule', () => {
    const mockParsed = {
      amount: '12000',
      tokenSymbol: 'TEMPO',
      beneficiary: validAddress,
      durationMonths: 12,
      startDate: new Date('2025-01-01'),
    };

    const tokenAddress = '0x20c0000000000000000000000000000000000001';

    it('should calculate linear vesting schedule', () => {
      const { plan, schedule } = calculateVestingSchedule(mockParsed, tokenAddress);

      expect(plan.vestingType).toBe('linear');
      expect(plan.totalAmount).toBe('12000');
      expect(plan.installments).toBe(12);
      expect(plan.cliffDuration).toBe(0);
      expect(schedule).toHaveLength(12);

      // Check monthly amount
      const monthlyAmount = parseFloat(schedule[0].amount);
      expect(monthlyAmount).toBeCloseTo(1000, 0);
    });

    it('should calculate cliff vesting schedule', () => {
      const cliffParsed = { ...mockParsed, cliffMonths: 12 };
      const { plan, schedule } = calculateVestingSchedule(cliffParsed, tokenAddress);

      expect(plan.vestingType).toBe('cliff');
      expect(plan.cliffDuration).toBeGreaterThan(0);
      expect(schedule[schedule.length - 1].cumulativeAmount).toBe('12000');
    });

    it('should calculate hybrid vesting schedule', () => {
      const hybridParsed = { ...mockParsed, cliffMonths: 3 };
      const { plan, schedule } = calculateVestingSchedule(hybridParsed, tokenAddress);

      expect(plan.vestingType).toBe('hybrid');
      expect(plan.cliffDuration).toBeGreaterThan(0);
      expect(plan.installments).toBe(12);
    });

    it('should generate correct timestamps', () => {
      const { plan, schedule } = calculateVestingSchedule(mockParsed, tokenAddress);

      expect(plan.startTime).toBeGreaterThan(0);
      expect(plan.endTime).toBeGreaterThan(plan.startTime);
      expect(schedule[0].timestamp).toBeGreaterThan(plan.startTime);
      expect(schedule[schedule.length - 1].timestamp).toBeLessThanOrEqual(plan.endTime);
    });

    it('should set correct status for each installment', () => {
      const { schedule } = calculateVestingSchedule(mockParsed, tokenAddress);

      // Past dates should be releasable or released
      const pastInstallments = schedule.filter(s => s.timestamp < Date.now() / 1000);
      pastInstallments.forEach(s => {
        expect(['releasable', 'released']).toContain(s.status);
      });

      // Future dates should be locked
      const futureInstallments = schedule.filter(s => s.timestamp > Date.now() / 1000);
      futureInstallments.forEach(s => {
        expect(s.status).toBe('locked');
      });
    });

    it('should calculate cumulative amounts correctly', () => {
      const { schedule } = calculateVestingSchedule(mockParsed, tokenAddress);

      for (let i = 1; i < schedule.length; i++) {
        const prevCumulative = parseFloat(schedule[i - 1].cumulativeAmount);
        const currentAmount = parseFloat(schedule[i].amount);
        const currentCumulative = parseFloat(schedule[i].cumulativeAmount);

        expect(currentCumulative).toBeCloseTo(prevCumulative + currentAmount, 0);
      }
    });
  });

  describe('formatVestingPlanPreview', () => {
    const mockPlan = {
      beneficiary: validAddress,
      tokenAddress: '0x20c0000000000000000000000000000000000001',
      tokenSymbol: 'TEMPO',
      totalAmount: '12000',
      totalAmountWei: BigInt(12000 * 10 ** 18),
      cliffDuration: 0,
      vestingDuration: 365 * 24 * 60 * 60,
      startTime: Math.floor(new Date('2025-01-01').getTime() / 1000),
      endTime: Math.floor(new Date('2025-12-31').getTime() / 1000),
      cliffTime: Math.floor(new Date('2025-01-01').getTime() / 1000),
      vestingType: 'linear' as const,
      installments: 12,
      releasedAmount: '0',
      releasableAmount: '1000',
      lockedAmount: '11000',
      status: 'pending' as const,
    };

    const mockSchedule = Array.from({ length: 12 }, (_, i) => ({
      timestamp: Math.floor(new Date(`2025-${String(i + 1).padStart(2, '0')}-01`).getTime() / 1000),
      date: `2025-${String(i + 1).padStart(2, '0')}-01`,
      amount: '1000',
      cumulativeAmount: String((i + 1) * 1000),
      status: i < 2 ? 'released' : 'locked' as const,
    }));

    it('should format plan preview correctly', () => {
      const preview = formatVestingPlanPreview(mockPlan, mockSchedule);

      expect(preview).toContain('VESTING PLAN PREVIEW');
      expect(preview).toContain(validAddress);
      expect(preview).toContain('12000 TEMPO');
      expect(preview).toContain('LINEAR');
      expect(preview).toContain('12'); // installments
    });

    it('should include timeline information', () => {
      const preview = formatVestingPlanPreview(mockPlan, mockSchedule);

      expect(preview).toContain('Start Date');
      expect(preview).toContain('End Date');
    });

    it('should include status breakdown', () => {
      const preview = formatVestingPlanPreview(mockPlan, mockSchedule);

      expect(preview).toContain('Locked');
      expect(preview).toContain('Releasable');
      expect(preview).toContain('Released');
    });

    it('should handle cliff vesting preview', () => {
      const cliffPlan = { ...mockPlan, cliffDuration: 90 * 24 * 60 * 60, vestingType: 'cliff' as const };
      const preview = formatVestingPlanPreview(cliffPlan, mockSchedule);

      expect(preview).toContain('Cliff Date');
      expect(preview).toContain('CLIFF');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', () => {
      const input = `Vest 1000000 TEMPO to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb over 12 months`;
      const result = parseVestingInput(input);

      expect(result.amount).toBe('1000000');
    });

    it('should handle 1 month vesting', () => {
      const input = `Vest 1000 TEMPO to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb over 1 month`;
      const result = parseVestingInput(input);

      expect(result.durationMonths).toBe(1);
    });

    it('should handle complex natural language', () => {
      const input = `Please create a vesting schedule for 5000 ALPHA tokens to be distributed to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb over a period of 2 years with a cliff of 6 months`;
      const result = parseVestingInput(input);

      expect(result.amount).toBe('5000');
      expect(result.tokenSymbol).toBe('ALPHA');
      expect(result.durationMonths).toBe(24);
      expect(result.cliffMonths).toBe(6);
    });
  });
});

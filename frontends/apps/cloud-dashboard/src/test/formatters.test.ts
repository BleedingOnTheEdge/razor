import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPercentage,
  formatTimestamp,
  formatHash,
  getInstanceStatusBadge,
  getRunStatusBadge,
  getRunRelationBadge,
  getCommandStatusBadge,
  getExtensionKindBadge,
} from '@razor/ui-kit';

describe('UI-Kit Formatters & Badges', () => {
  it('formats currency according to ICU locale standards', () => {
    expect(formatCurrency(1250.5)).toBe('$1,250.50');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
  });

  it('formats percentages with optional sign', () => {
    expect(formatPercentage(0.125)).toBe('+12.50%');
    expect(formatPercentage(-0.045)).toBe('-4.50%');
    expect(formatPercentage(0.125, false)).toBe('12.50%');
    expect(formatPercentage(null)).toBe('—');
  });

  it('formats hashes cleanly', () => {
    expect(formatHash('1234567890abcdef', 4)).toBe('1234…cdef');
    expect(formatHash('abc', 6)).toBe('abc');
    expect(formatHash(null)).toBe('—');
  });

  it('returns valid status badges for instances, runs, relations, and commands', () => {
    expect(getInstanceStatusBadge('Active').label).toBe('Active');
    expect(getInstanceStatusBadge('Pending').label).toBe('Pending');

    expect(getRunStatusBadge('Running').className).toContain('animate-pulse');
    expect(getRunStatusBadge('Completed').label).toBe('Completed');

    expect(getRunRelationBadge('Branched').label).toBe('Branched');
    expect(getRunRelationBadge('Spliced').label).toBe('Spliced');

    expect(getCommandStatusBadge('Completed').label).toBe('Completed');
    expect(getExtensionKindBadge('Strategy').label).toBe('Strategy');
  });
});

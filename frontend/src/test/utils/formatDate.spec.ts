// src/test/utils/formatDate.spec.ts

import { describe, expect, test } from 'vitest';
import { formatDate } from '@/shared/utils/formatDate';

describe('formatDate()', () => {
  test('formata uma data Date corretamente', () => {
    const input = new Date('2025-10-11');
    const output = formatDate(input);
    expect(output).toBe('11/10/2025');
  });

  test('formata uma data string corretamente', () => {
    const input = '2025-12-25';
    const output = formatDate(input);
    expect(output).toBe('25/12/2025');
  });

  test('retorna "Invalid Date" se entrada for inválida', () => {
    const input = 'banana';
    const output = formatDate(input);
    expect(output).toBe('Invalid Date');
  });
});

const FALSE_VALUES = new Set(['false', '0', 'no']);
const TRUE_VALUES = new Set(['true', '1', 'yes']);

/**
 * Determines whether in-memory stores should be used instead of database-backed services.
 * Defaults to true when NODE_ENV === 'test', unless an explicit override is provided.
 */
export function shouldUseInMemoryStore() {
  const override = process.env.USE_IN_MEMORY_STORE?.toLowerCase();

  if (override && TRUE_VALUES.has(override)) {
    return true;
  }

  if (override && FALSE_VALUES.has(override)) {
    return false;
  }

  return process.env.NODE_ENV === 'test';
}

export default shouldUseInMemoryStore;

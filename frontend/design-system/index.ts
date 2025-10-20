import layoutSchema from './schemas/layout.json';
import tokensDefault, { designTokens } from './tokens';

export const tokens = tokensDefault;
export { layoutSchema, designTokens };
export * from './types';
export type { LayoutSchema } from './types';

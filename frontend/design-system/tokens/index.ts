import colors from './colors.json';
import typography from './typography.json';
import spacing from './spacing.json';
import shadows from './shadows.json';

export const designTokens = {
  colors,
  typography,
  spacing,
  shadows,
} as const;

export default designTokens;

export interface ColorPalette {
  [key: string]: string | Record<string, string>;
}

export interface TypographySet {
  font_family: string;
  h1: Record<string, string>;
  h2: Record<string, string>;
  h3: Record<string, string>;
  body: Record<string, string>;
  cta: Record<string, string>;
}

export interface SpacingScale {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ShadowSet {
  card: string;
  hover: string;
  focus: string;
  modal: string;
}

export interface DesignTokens {
  colors: ColorPalette;
  typography: TypographySet;
  spacing: SpacingScale;
  shadows: ShadowSet;
}

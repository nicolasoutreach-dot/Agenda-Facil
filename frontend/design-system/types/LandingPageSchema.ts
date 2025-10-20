import type { DesignTokens } from './ThemeTokens';

export interface HeaderLink {
  label: string;
  href: string;
}

export interface HeaderCTA {
  label: string;
  href: string;
  variant: 'primary' | 'secondary' | 'outline';
}

export interface HeaderSchema {
  logo: string;
  nav_links: HeaderLink[];
  cta_button: HeaderCTA;
}

export interface SectionSchema {
  id: string;
  component: string;
  props?: Record<string, unknown>;
}

export interface LayoutSchema {
  header: HeaderSchema;
  sections: SectionSchema[];
}

export interface DesignSystemContextValue {
  tokens: DesignTokens;
}

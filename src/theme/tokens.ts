/**
 * Design tokens from docs/design.md (Framer-inspired dark canvas).
 * Use CSS variables in styles; import these for antd ConfigProvider / inline styles.
 */

export const colors = {
  primary: "#ffffff",
  onPrimary: "#000000",
  accentBlue: "#0099ff",
  ink: "#ffffff",
  inkMuted: "#999999",
  canvas: "#090909",
  surface1: "#141414",
  surface2: "#1c1c1c",
  hairline: "#262626",
  hairlineSoft: "#1a1a1a",
  inverseCanvas: "#ffffff",
  inverseInk: "#000000",
  gradientMagenta: "#d44df0",
  gradientViolet: "#6a4cf5",
  gradientOrange: "#ff7a3d",
  gradientCoral: "#ff5577",
  semanticSuccess: "#22c55e",
  semanticWarning: "#f5a623",
  semanticDanger: "#ef4444",
} as const;

export const rounded = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 15,
  xl: 20,
  xxl: 30,
  pill: 100,
  full: 9999,
} as const;

export const spacing = {
  hair: 1,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 15,
  lg: 20,
  xl: 30,
  xxl: 40,
  section: 96,
} as const;

export const typography = {
  displayXxl: {
    fontSize: 110,
    fontWeight: 500,
    lineHeight: 0.85,
    letterSpacing: "-5.5px",
  },
  displayXl: {
    fontSize: 85,
    fontWeight: 500,
    lineHeight: 0.95,
    letterSpacing: "-4.25px",
  },
  displayLg: {
    fontSize: 62,
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: "-3.1px",
  },
  displayMd: {
    fontSize: 32,
    fontWeight: 500,
    lineHeight: 1.13,
    letterSpacing: "-1px",
  },
  headline: {
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "-0.8px",
  },
  subhead: {
    fontSize: 24,
    fontWeight: 400,
    lineHeight: 1.3,
    letterSpacing: "-0.01px",
  },
  bodyLg: {
    fontSize: 18,
    fontWeight: 400,
    lineHeight: 1.3,
    letterSpacing: "-0.18px",
  },
  body: {
    fontSize: 15,
    fontWeight: 400,
    lineHeight: 1.3,
    letterSpacing: "-0.15px",
  },
  bodySm: {
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: "-0.14px",
  },
  caption: {
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.2,
    letterSpacing: "-0.13px",
  },
  micro: {
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.2,
    letterSpacing: "-0.12px",
  },
  button: {
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: "-0.14px",
  },
} as const;

/** Spotlight card gradient anchors (base fills; production uses richer linear-gradients). */
export const gradients = {
  violet: `linear-gradient(135deg, ${colors.gradientViolet} 0%, #3b1f9e 100%)`,
  magenta: `linear-gradient(135deg, ${colors.gradientMagenta} 0%, #7a1f9e 100%)`,
  orange: `linear-gradient(135deg, ${colors.gradientOrange} 0%, #c2410c 100%)`,
  coral: `linear-gradient(135deg, ${colors.gradientCoral} 0%, #be123c 100%)`,
} as const;

export const elevation = {
  selected: "0 0 0 1px rgba(0, 153, 255, 0.15)",
  lightEdge: "0 0.5px 0 rgba(255, 255, 255, 0.10), 0 10px 30px rgba(0, 0, 0, 0.25)",
} as const;

export const palette = {
  blue: "#1B4B8F",
  blueDark: "#0F3266",
  yellow: "#FFC93C",
  yellowDark: "#E0A800",
  green: "#2E9E5B",
  greenLight: "#E6F5EC",
  red: "#E1543A",
  redLight: "#FBEAE6",
  orange: "#F2994A",
  white: "#FFFFFF",
  black: "#161616",
};

export const lightTheme = {
  mode: "light" as const,
  bg: "#F6F7FB",
  surface: "#FFFFFF",
  surfaceMuted: "#F0F2F7",
  border: "#E5E7EE",
  textPrimary: "#161616",
  textSecondary: "#5B5F6B",
  textMuted: "#9AA0AC",
  primary: palette.blue,
  primaryText: palette.white,
  accent: palette.yellow,
  accentText: palette.blueDark,
  success: palette.green,
  successBg: palette.greenLight,
  danger: palette.red,
  dangerBg: palette.redLight,
  warning: palette.orange,
};

export const darkTheme = {
  mode: "dark" as const,
  bg: "#0E1116",
  surface: "#171B22",
  surfaceMuted: "#1E232C",
  border: "#2A2F3A",
  textPrimary: "#F2F3F6",
  textSecondary: "#A7ACB8",
  textMuted: "#6C7280",
  primary: "#5B8FD6",
  primaryText: "#0E1116",
  accent: palette.yellow,
  accentText: "#1E1A05",
  success: "#4FC17E",
  successBg: "#123322",
  danger: "#F0705A",
  dangerBg: "#3A1B16",
  warning: palette.orange,
};

export type Theme = typeof lightTheme;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };
export const fontSize = { xs: 12, sm: 13, md: 15, lg: 17, xl: 22, xxl: 28 };

export const peso = (n: number) =>
  `\u20B1${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

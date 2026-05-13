import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta EYAN - Tema oscuro profesional
        background: "#0F1117",
        surface: "#1A1D27",
        border: "#2A2D3A",
        primary: {
          DEFAULT: "#3B82F6",
          foreground: "#FFFFFF",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        secondary: {
          DEFAULT: "#1A1D27",
          foreground: "#F1F5F9",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#22C55E",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#1A1D27",
          foreground: "#94A3B8",
        },
        accent: {
          DEFAULT: "#2A2D3A",
          foreground: "#F1F5F9",
        },
        popover: {
          DEFAULT: "#1A1D27",
          foreground: "#F1F5F9",
        },
        card: {
          DEFAULT: "#1A1D27",
          foreground: "#F1F5F9",
        },
        // Estados de asignación
        status: {
          scheduled: "#3B82F6",
          "in-progress": "#F59E0B",
          completed: "#22C55E",
          cancelled: "#EF4444",
        },
        // Estados de chofer
        driver: {
          available: "#22C55E",
          "on-route": "#F59E0B",
          "off-duty": "#94A3B8",
          inactive: "#EF4444",
        },
        // Estados de camión
        truck: {
          available: "#22C55E",
          "in-use": "#3B82F6",
          maintenance: "#F59E0B",
          inactive: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        heading: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-right": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

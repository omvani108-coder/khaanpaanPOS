/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Indian palette
        gold: {
          DEFAULT: "hsl(var(--gold))",
          light: "hsl(43 74% 88%)",
          dark: "hsl(43 74% 28%)",
        },
        maroon: {
          DEFAULT: "hsl(var(--maroon))",
          light: "hsl(0 60% 42%)",
          dark: "hsl(0 65% 20%)",
        },
        peacock: {
          DEFAULT: "hsl(var(--peacock))",
          light: "hsl(174 55% 88%)",
        },
        // Status colors for order states
        status: {
          pending: "hsl(38 92% 50%)",
          preparing: "hsl(217 91% 60%)",
          ready: "hsl(142 71% 45%)",
          served: "hsl(160 60% 45%)",
          completed: "hsl(220 9% 46%)",
          cancelled: "hsl(0 84% 60%)",
          delayed: "hsl(0 72% 51%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        // Devanagari-friendly serif for display text
        display: ["Georgia", "Times New Roman", "serif"],
      },
      backgroundImage: {
        // Diamond chain — classic Indian embroidery border motif
        "embroidery-chain":
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='10'%3E%3Cpath d='M5 5L10 2L15 5L10 8Z' fill='%23C9920A'/%3E%3Cline x1='15' y1='5' x2='25' y2='5' stroke='%23C9920A' stroke-width='0.8' stroke-dasharray='2%2C1'/%3E%3Cpath d='M25 5L30 2L35 5L30 8Z' fill='%23C9920A'/%3E%3Ccircle cx='0' cy='5' r='1.5' fill='%23C9920A'/%3E%3Ccircle cx='40' cy='5' r='1.5' fill='%23C9920A'/%3E%3C/svg%3E\")",
        // Smaller chain for tight spaces
        "embroidery-chain-sm":
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='7'%3E%3Cpath d='M3 3.5L7 1L11 3.5L7 6Z' fill='%23C9920A'/%3E%3Cline x1='11' y1='3.5' x2='13' y2='3.5' stroke='%23C9920A' stroke-width='0.6'/%3E%3Cpath d='M13 3.5L17 1L21 3.5L17 6Z' fill='%23C9920A'/%3E%3Ccircle cx='0' cy='3.5' r='1' fill='%23C9920A'/%3E%3Ccircle cx='24' cy='3.5' r='1' fill='%23C9920A'/%3E%3C/svg%3E\")",
        // Maroon diamond border for sidebar header
        "embroidery-chain-ivory":
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='10'%3E%3Cpath d='M5 5L10 2L15 5L10 8Z' fill='%23F5E6C8'/%3E%3Cline x1='15' y1='5' x2='25' y2='5' stroke='%23F5E6C8' stroke-width='0.8' stroke-dasharray='2%2C1'/%3E%3Cpath d='M25 5L30 2L35 5L30 8Z' fill='%23F5E6C8'/%3E%3Ccircle cx='0' cy='5' r='1.5' fill='%23F5E6C8'/%3E%3Ccircle cx='40' cy='5' r='1.5' fill='%23F5E6C8'/%3E%3C/svg%3E\")",
        // Subtle woven fabric texture for card backgrounds
        "fabric-weave":
          "repeating-linear-gradient(45deg, transparent, transparent 3px, hsl(38 30% 88% / 0.4) 3px, hsl(38 30% 88% / 0.4) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, hsl(38 30% 88% / 0.4) 3px, hsl(38 30% 88% / 0.4) 4px)",
      },
    },
  },
  plugins: [],
};

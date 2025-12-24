/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
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
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "neon-cyan": "#00f6ff",
        "neon-magenta": "#ff00d4",
        "neon-purple": "#9a4dff",
        "neon-orange": "#ff7a00",
        "void-black": "#050509",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        pill: "999px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "bg-shift": "bgShift 25s linear infinite alternate",
        "title-glow": "titleGlow 16s linear infinite alternate",
        "button-hue": "buttonHue 8s linear infinite",
        "card-hue": "cardHue 8s linear infinite",
        "console-aura": "consoleAura 18s linear infinite alternate",
        scanlines: "scanlines 4s linear infinite",
        "online-pulse": "onlinePulse 2.2s ease-in-out infinite",
        "danger-wiggle": "dangerWiggle 0.2s ease",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      keyframes: {
        bgShift: {
          "0%": { backgroundPosition: "0 0, 100% 100%, 100% 0, 0 100%" },
          "50%": { backgroundPosition: "10% -5%, 95% 110%, 110% 10%, -10% 95%" },
          "100%": { backgroundPosition: "-5% 10%, 105% 90%, 90% -10%, 5% 105%" },
        },
        titleGlow: {
          "0%": { textShadow: "0 0 8px rgba(0, 246, 255, 0.5)" },
          "50%": { textShadow: "0 0 14px rgba(255, 0, 212, 0.7)" },
          "100%": { textShadow: "0 0 10px rgba(154, 77, 255, 0.6)" },
        },
        buttonHue: {
          "0%": { borderColor: "rgba(0, 246, 255, 0.5)", boxShadow: "0 0 8px rgba(0, 246, 255, 0.25)" },
          "25%": { borderColor: "rgba(255, 0, 212, 0.5)", boxShadow: "0 0 9px rgba(255, 0, 212, 0.25)" },
          "50%": { borderColor: "rgba(154, 77, 255, 0.5)", boxShadow: "0 0 10px rgba(154, 77, 255, 0.25)" },
          "75%": { borderColor: "rgba(255, 122, 0, 0.5)", boxShadow: "0 0 8px rgba(255, 122, 0, 0.23)" },
          "100%": { borderColor: "rgba(0, 246, 255, 0.5)", boxShadow: "0 0 8px rgba(0, 246, 255, 0.25)" },
        },
        cardHue: {
          "0%": { borderColor: "rgba(0, 246, 255, 0.5)", boxShadow: "0 0 10px rgba(0, 246, 255, 0.25)" },
          "25%": { borderColor: "rgba(255, 0, 212, 0.5)", boxShadow: "0 0 12px rgba(255, 0, 212, 0.25)" },
          "50%": { borderColor: "rgba(154, 77, 255, 0.5)", boxShadow: "0 0 14px rgba(154, 77, 255, 0.25)" },
          "75%": { borderColor: "rgba(255, 122, 0, 0.5)", boxShadow: "0 0 12px rgba(255, 122, 0, 0.23)" },
          "100%": { borderColor: "rgba(0, 246, 255, 0.5)", boxShadow: "0 0 10px rgba(0, 246, 255, 0.25)" },
        },
        consoleAura: {
          "0%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(-6%, 4%, 0)" },
          "100%": { transform: "translate3d(4%, -4%, 0)" },
        },
        scanlines: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(4px)" },
        },
        onlinePulse: {
          "0%": { transform: "scale(1)", boxShadow: "0 0 6px rgba(0, 246, 255, 0.65)" },
          "50%": { transform: "scale(1.2)", boxShadow: "0 0 12px rgba(255, 0, 212, 0.8)" },
          "100%": { transform: "scale(1)", boxShadow: "0 0 6px rgba(0, 246, 255, 0.65)" },
        },
        dangerWiggle: {
          "0%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-1px)" },
          "50%": { transform: "translateX(1px)" },
          "75%": { transform: "translateX(-1px)" },
          "100%": { transform: "translateX(0)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

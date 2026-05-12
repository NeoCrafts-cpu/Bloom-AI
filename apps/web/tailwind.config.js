/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bloom: {
          bg: "#0E0804",
          "bg-2": "#1A0C05",
          "bg-card": "rgba(255,255,255,0.04)",
          orange: "#E8610A",
          "orange-light": "#F5A020",
          "orange-dim": "rgba(232,97,10,0.15)",
          text: "#F5F0E8",
          "text-muted": "#A8A09A",
          border: "rgba(255,255,255,0.08)",
          "border-hover": "rgba(232,97,10,0.3)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Cal Sans", "Inter", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-orange":
          "linear-gradient(135deg, #E8610A 0%, #F5A020 100%)",
        "gradient-bloom":
          "linear-gradient(180deg, #0E0804 0%, #1E0B04 50%, #0E0804 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        pulse: "pulse 3s ease-in-out infinite",
        "counter-spin": "counterSpin 20s linear infinite",
        glow: "glow 2s ease-in-out infinite",
        "border-flow": "borderFlow 3s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(232,97,10,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(232,97,10,0.6)" },
        },
        borderFlow: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        counterSpin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(-360deg)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "orange-glow": "0 0 30px rgba(232,97,10,0.25)",
        "orange-glow-lg": "0 0 60px rgba(232,97,10,0.35)",
        card: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        ".scrollbar-thin": {
          "scrollbar-width": "thin",
          "scrollbar-color": "rgba(232,97,10,0.3) transparent",
        },
        ".scrollbar-thin::-webkit-scrollbar": { width: "3px" },
        ".scrollbar-thin::-webkit-scrollbar-track": { background: "transparent" },
        ".scrollbar-thin::-webkit-scrollbar-thumb": { background: "rgba(232,97,10,0.3)", "border-radius": "2px" },
        ".hover\\:bg-white\\/2:hover": { "background-color": "rgba(255,255,255,0.02)" },
        ".hover\\:bg-white\\/3:hover": { "background-color": "rgba(255,255,255,0.03)" },
      });
    },
  ],
};

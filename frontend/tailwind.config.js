export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18211d",
        field: "#2f6f53",
        "field-dark": "#1f4f3b",
        finance: "#173b63",
        "finance-light": "#e8f0f7",
        harvest: "#c47b27",
        mist: "#f5f7f4",
        surface: "#ffffff",
        line: "#dfe5de",
        success: "#247a4d",
        warning: "#b87514",
        danger: "#b42318",
        info: "#2563a6"
      },
      boxShadow: {
        soft: "0 12px 32px rgba(18, 38, 31, 0.08)",
        card: "0 1px 2px rgba(18, 38, 31, 0.05), 0 10px 24px rgba(18, 38, 31, 0.06)"
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem"
      }
    }
  },
  plugins: []
};

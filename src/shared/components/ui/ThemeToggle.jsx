import { useTheme } from "../../../context/ThemeContext";

// للـ sidebar (dark background)
export default function ThemeToggle({ collapsed = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.06)",
        color: "#94a3b8",
        cursor: "pointer",
        width: "100%",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.12)";
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        e.currentTarget.style.color = "#94a3b8";
      }}
    >
      <span style={{ fontSize: "20px" }}>{isDark ? "☀️" : "🌙"}</span>
    </button>
  );
}

// للصفحات (light/dark page background)
export function PageThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "38px",
        height: "38px",
        borderRadius: "10px",
        border: "1.5px solid var(--border)",
        background: "var(--bg-card)",
        cursor: "pointer",
        flexShrink: 0,
        transition: "all 0.15s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-hover)";
        e.currentTarget.style.borderColor = "var(--color-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-card)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <span style={{ fontSize: "18px", lineHeight: 1 }}>{isDark ? "☀️" : "🌙"}</span>
    </button>
  );
}
import { useTheme } from "../../../context/ThemeContext";

export default function ThemeToggle({ collapsed = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: collapsed ? 0 : "8px",
        padding: collapsed ? "8px" : "8px 12px",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.06)",
        color: "#94a3b8",
        fontSize: "13px",
        fontWeight: 500,
        cursor: "pointer",
        width: "100%",
        justifyContent: "center",
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
      <span style={{ fontSize: "16px" }}>{isDark ? "☀️" : "🌙"}</span>
      {!collapsed && (
        <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
      )}
    </button>
  );
}
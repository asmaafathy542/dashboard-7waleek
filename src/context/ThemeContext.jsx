import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  // ── نفس قيم الـ CSS variables بالظبط ──────────────────────────
  const colors = isDark
    ? {
        // Backgrounds
        mainBg:    "#111A27",
        sidebarBg: "#0E1729",
        cardBg:    "#1A2639",
        surface:   "#223047",
        hoverBg:   "#1E3050",
        // Text
        text:      "#E4EBF8",
        subText:   "#8EADD0",
        textOnDark:"#FFFFFF",
        // Brand
        primary:   "#4A72D4",
        primaryHover: "#3A60C0",
        secondary: "#5BA3E0",
        accent:    "#D4A840",
        navy:      "#0D1D6B",
        // Borders & Icons
        border:    "#2C4268",
        icon:      "#6CB4FF",
        iconMuted: "#4A6A98",
        // Status
        success:   "#3DAA72",  successBg: "#1A3328",
        warning:   "#D4A030",  warningBg: "#2E2412",
        danger:    "#E05545",  dangerBg:  "#2E1A18",
        info:      "#5BA3E0",  infoBg:    "#152035",
      }
    : {
        // Backgrounds
        mainBg:    "#F4F6FB",
        sidebarBg: "#162040",
        cardBg:    "#FFFFFF",
        surface:   "#EBF0FA",
        hoverBg:   "#E4EAFB",
        // Text
        text:      "#1A2340",
        subText:   "#4A5A7A",
        textOnDark:"#FFFFFF",
        // Brand
        primary:   "#2148B0",
        primaryHover: "#1A3DA8",
        secondary: "#3A8FD4",
        accent:    "#E8B84B",
        navy:      "#0D1D6B",
        // Borders & Icons
        border:    "#D5DEF0",
        icon:      "#2148B0",
        iconMuted: "#7A90B8",
        // Status
        success:   "#2D8A5E",  successBg: "#E8F5EE",
        warning:   "#B07D20",  warningBg: "#FBF3DC",
        danger:    "#C0392B",  dangerBg:  "#FAEAE8",
        info:      "#2470A8",  infoBg:    "#E1EEF8",
      };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

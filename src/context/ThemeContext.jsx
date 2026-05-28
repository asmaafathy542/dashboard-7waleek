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

  // ── الألوان بتاعة الـ app الأصلية ──
 const colors = isDark
  ? {
      mainBg:    "#111A27",
      sidebarBg: "#0D1D6B",
      cardBg:    "#1A2639",
      surface:   "#223047",
      text:      "#ECF2FF",
      subText:   "#8EADD0",
      border:    "#2C4268",
      icon:      "#6CB4FF",
    }
  : {
      mainBg:    "#F5F7FA",  // ← أبيض هادي مش أزرق
      sidebarBg: "#0D1D6B",  // ← navy داكن أنيق
      cardBg:    "#FFFFFF",
      surface:   "#F0F4FF",
      text:      "#080D30",
      subText:   "#3D4F6E",
      border:    "#E2E8F0",
      icon:      "#1A3DA8",
    };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
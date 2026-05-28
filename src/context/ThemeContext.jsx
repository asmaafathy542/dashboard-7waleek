import { createContext, useContext, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme") === "dark";
    document.documentElement.setAttribute("data-theme", saved ? "dark" : "light");
    return saved;
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      return next;
    });
  };

  const colors = isDark
    ? { mainBg: "#0f172a", sidebarBg: "#1e293b", text: "#f1f5f9" }
    : { mainBg: "#f8fafc", sidebarBg: "#0f172a", text: "#0f172a" };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
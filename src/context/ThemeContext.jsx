import { createContext, useContext, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(
    localStorage.getItem("theme") === "dark"
  );

  const toggleTheme = () => {
    setIsDark((prev) => {
      localStorage.setItem("theme", !prev ? "dark" : "light");
      return !prev;
    });
  };

  const colors = isDark
    ? {
        mainBg: "#0f172a",
        sidebarBg: "#1e293b",
        text: "#f1f5f9",
      }
    : {
        mainBg: "#f8fafc",
        sidebarBg: "#0f172a",
        text: "#0f172a",
      };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
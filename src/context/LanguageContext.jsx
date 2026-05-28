import { createContext, useContext, useState } from "react";
import en from "../locales/en.json";
import ar from "../locales/ar.json";

const translations = { en, ar };
const LanguageContext = createContext();

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
};

const setCookie = (name, value) => {
  document.cookie = `${name}=${value};path=/;max-age=31536000;SameSite=Lax`;
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return getCookie("lang") || localStorage.getItem("lang") || "en";
    } catch {
      return "en";
    }
  });

  const t = (key) => translations[lang][key] ?? key;

  const toggleLang = () => {
    setLang((prev) => {
      const next = prev === "en" ? "ar" : "en";
      try {
        setCookie("lang", next);
        localStorage.setItem("lang", next);
      } catch {}
      return next;
    });
  };

  const isRTL = lang === "ar";

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLang, isRTL }}>
      <div dir={isRTL ? "rtl" : "ltr"}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
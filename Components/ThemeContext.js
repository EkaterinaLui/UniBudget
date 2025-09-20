import React, { createContext, useContext, useState, useEffect } from "react";
import { loadSettings, saveSettings } from "../Utilities/ServiceSettings";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      if (s?.theme) setTheme(s.theme);
    })();
  }, []);

  const toggleTheme = async (val) => {
    const newTheme = val ? "dark" : "light";
    setTheme(newTheme);
    await saveSettings({ theme: newTheme });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

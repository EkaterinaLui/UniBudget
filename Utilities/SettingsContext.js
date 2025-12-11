import { createContext, useEffect, useState } from "react";
import { loadSettings, saveSettings } from "./ServiceSettings";

export const SettingsContext = createContext();

const defaultSettings = {
  theme: "light",
  currency: "₪",
};

export function SettingsProvider({ children, userId }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  //טעינת הגדרות

  useEffect(() => {
      if (!userId) {
      setSettings(defaultSettings);
      setLoading(false);
      return;
    }

    setLoading(true);

    (async () => {
      try {
        const s = await loadSettings(userId);
        if (s) {
          setSettings((prev) => ({ ...prev, ...s }));
        }
      } catch (e) {
        console.log("Error loading settings:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  //עדכון הגדרות
  const updateSettings = async (newSettings) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      saveSettings(merged, userId).catch((e) =>
        console.log("Error saving settings:", e)
      );
      return merged;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

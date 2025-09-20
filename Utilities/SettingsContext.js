import React, { createContext, useEffect, useState} from "react";
import { loadSettings, saveSettings } from "./ServiceSettings";

export const SettingsContext = createContext();

export function SettingsProvider({ children }){
    const [settings, setSettings] = useState({
        theme: "light",
        currency: "₪",
        dataFormat: "DD/MM/YYYY",
    });
    const [loading, setLoading] = useState(true);

    //טעינת הגדרות

    useEffect(() => {
        (async() =>{
            const s = await loadSettings();
            if(s){
                setSettings((prev) => ({ ...prev, ...s}));
            }
            setLoading(false);
        })();
    },[]);

    //עדכון הגדרות
    const updateSettings = async (newSettings) =>{
        setSettings((prev) => ({ ...prev, ...newSettings}));
        await saveSettings({ ...settings, ...newSettings});
    }

    return (
        <SettingsContext.Provider value={{settings, updateSettings, loading}}>
            {children}
        </SettingsContext.Provider>
    );
}
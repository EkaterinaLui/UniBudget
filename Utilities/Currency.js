import { useContext } from "react";
import { SettingsContext } from "./SettingsContext";

export function currency() {
  const { settings } = useContext(SettingsContext);
   return (amount) => {
    const safeAmount = Number(amount);
    if (isNaN(safeAmount)) {
      return `0.00 ${settings.currency}`; 
    }
    return `${safeAmount.toFixed(2)} ${settings.currency}`;
  };
}

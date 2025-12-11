import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const defaultSettings = {
  theme: "light",
  currency: "₪",
  notifications: {
    budgetLimit: true,
  },
};

//שמירה
export async function saveSettings(settings, userId){
    if(!userId) return;
    const ref = doc(db, "settings", userId);
    await setDoc(ref, settings, {merge: true}); // לא דורס שמירות הקודמות
}

//התראה
export async function loadSettings(userId) {
  if (!userId) return defaultSettings;

  const ref = doc(db, "settings", userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // אם אין הגדרות – נשמור את הדיפולט פעם ראשונה
    await setDoc(ref, defaultSettings);
    return defaultSettings;
  }

  const data = snap.data() || {};

  return {
    theme: data.theme ?? defaultSettings.theme,
    currency: data.currency ?? defaultSettings.currency,
    notifications: {
      budgetLimit:
        data.notifications?.budgetLimit ??
        defaultSettings.notifications.budgetLimit,
    },
  };
}

  
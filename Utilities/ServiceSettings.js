import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

//שמירה
export async function saveSettings(settings){
    if(!auth.currentUser) return;
    const ref = doc(db, "settings", auth.currentUser.uid);
    await setDoc(ref, settings, {merge: true}); // לא דורס שמירות הקודמות
}

//התראה
export async function loadSettings() {
  if (!auth.currentUser) return null;
  const ref = doc(db, "settings", auth.currentUser.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return {
      notifications: {
        budgetLimit: true, 
      },
    };
  }

  const data = snap.data();
  return {
    notifications: {
      budgetLimit: data.notifications?.budgetLimit ?? true,
    },
  };
}

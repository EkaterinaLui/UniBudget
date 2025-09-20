import { doc, setDoc, getDoc} from "firebase/firestore";
import { db, auth } from "../firebase";

//שמירה
export async function saveSettings(settings){
    if(!auth.currentUser) return;
    const ref = doc(db, "settings", auth.currentUser.uid);
    await setDoc(ref, settings, {merge: true}); // לא דורס שמירות הקודמות
}

//טעינה
export async function loadSettings(){
    if(!auth.currentUser) return null;
     const ref = doc(db, "settings", auth.currentUser.uid);
     const snap = await getDoc(ref);
     return snap.exists() ? snap.data() : {};
}
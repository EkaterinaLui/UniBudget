import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import { db } from "../firebase";

const archiveCategory = async (groupId, category) => {
  try {
    const { id, ...data } = category;

    // שמירה בארכיון
    const archivedRef = doc(db, "groups", groupId, "archivedCategories", id);
    await setDoc(archivedRef, {
      ...data,
      archivedAt: serverTimestamp(),
    });

    // מציאת הוצאות שקשורות לקטגוריה
    const expensesRef = collection(db, "groups", groupId, "expenses");
    const snapshot = await getDocs(expensesRef);

    const groupExpenses = snapshot.docs.filter(
      (docSnap) => docSnap.data().categoryId === id
    );

    // העברת הוצאות לארכיון
    for (const e of groupExpenses) {
      const eData = e.data();
      const archivedExpenseRef = doc(
        db,
        "groups",
        groupId,
        "archivedCategories",
        id,
        "expenses",
        e.id
      );

      await setDoc(archivedExpenseRef, eData);
      await deleteDoc(e.ref);
    }

    // מחיקת הקטגוריה מהקטגוריות הפעילות
    const activeCategoryRef = doc(db, "groups", groupId, "categories", id);
    await deleteDoc(activeCategoryRef);

    console.log(`קטגוריה ${id} הועברה לארכיון.`);
  } catch (error) {
    console.error("שגיאה בארכוב קטגוריה:", error);
  }
};

export default archiveCategory;

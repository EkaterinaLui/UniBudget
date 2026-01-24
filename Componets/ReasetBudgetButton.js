import { useTheme } from "@react-navigation/native";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { Alert, StyleSheet, Text, TouchableOpacity } from "react-native";
import { db } from "../firebase";
import { getArchiveId } from "../Utilities/date";

const ResetBudgetsButton = ({ groupId }) => {
  const { colors } = useTheme();

  const resetBudgets = async () => {
    try {
      // חודש שרוצים לשמור בארכיון
      const now = new Date();
      const archiveDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const year = archiveDate.getFullYear();
      const month = archiveDate.getMonth() + 1; // 1..12
      const archiveId = getArchiveId(year, month);

      const archiveRef = doc(collection(db, "groups", groupId, "archive"), archiveId);

      // שומרים תקציבים ומשתמשים
      const groupRef = doc(db, "groups", groupId);
      const groupSnap = await getDoc(groupRef);
      const groupData = groupSnap.data() || {};

      await setDoc(archiveRef, {
        month,
        year,
        createdAt: now,
        totalBudget: groupData.totalBudget || 0,
        memberBudgets: groupData.memberBudgets || {},
        members: groupData.members || [],
      });

      // =========================
      // קטגוריות: בונים סט של קטגוריות מיוחדות שעדיין בתוקף
      // =========================
      const catsSnap = await getDocs(collection(db, "groups", groupId, "categories"));
      const activeTemporaryCategoryIds = new Set();

      for (const cat of catsSnap.docs) {
        const data = cat.data();

        // שומרים בארכיון
        await setDoc(doc(collection(archiveRef, "categories"), cat.id), data);

        const catRef = doc(db, "groups", groupId, "categories", cat.id);

        const isRegular = data.isRegular === true;
        const isTemporary = data.isTemporary === true;

        // קטגוריות קבועות נשארות
        if (isRegular) continue;

        // קטגוריות מיוחדות
        if (isTemporary) {
          let endDate = null;

          if (data.eventEndDate?.toDate) endDate = data.eventEndDate.toDate();
          else if (data.eventEndDate instanceof Date) endDate = data.eventEndDate;

          const nowDate = new Date();
          const isExpired = endDate ? endDate < nowDate : false;

          if (isExpired) {
            // פג תוקף - מוחקים את הקטגוריה
            await deleteDoc(catRef);
          } else {
            // עדיין בתוקף - משאירים ומסמנים כפעילה
            activeTemporaryCategoryIds.add(cat.id);
          }
          continue;
        }

        // כל מה שלא קבוע ולא זמני – מוחקים
        await deleteDoc(catRef);
      }

      // =========================
      // הוצאות: מוחקים רק הוצאות שלא שייכות לקטגוריות מיוחדות פעילות
      // =========================
      const expSnap = await getDocs(collection(db, "groups", groupId, "expenses"));

      for (const exp of expSnap.docs) {
        const expData = exp.data();

        // תמיד שומרים בארכיון
        await setDoc(doc(collection(archiveRef, "expenses"), exp.id), expData);

        const categoryId = expData?.categoryId;
        const keepInGroup = categoryId && activeTemporaryCategoryIds.has(categoryId);

        // אם לא שייך לקטגוריה מיוחדת פעילה – מוחקים מהקבוצה
        if (!keepInGroup) {
          await deleteDoc(doc(db, "groups", groupId, "expenses", exp.id));
        }
      }

      // חסכונות (את משאירה בקבוצה - רק ארכוב)
      const savingSnap = await getDocs(collection(db, "groups", groupId, "savings"));
      for (const s of savingSnap.docs) {
        await setDoc(doc(collection(archiveRef, "savings"), s.id), s.data());
      }

      Alert.alert("בוצע", "האיפוס הסתיים בהצלחה");
    } catch (err) {
      console.log("שגיאה באיפוס:", err);
      Alert.alert("שגיאה", "האיפוס נכשל, נסה שוב.");
    }
  };

  const confirmReset = () => {
    Alert.alert(
      "איפוס",
      "האם אתה בטוח שברצונך לאפס? קטגוריות קבועות יישארו, קטגוריות מיוחדות בתוקף וההוצאות שלהן יישארו, ושאר ההוצאות יימחקו.",
      [
        { text: "ביטול", style: "cancel" },
        { text: "אשר", style: "destructive", onPress: resetBudgets },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.danger }]}
      onPress={confirmReset}
    >
      <Text style={[styles.text, { color: colors.buttonText }]}>איפוס קבוצה</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ResetBudgetsButton;

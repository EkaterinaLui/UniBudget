import { useTheme } from "@react-navigation/native";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc
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
      const archiveDate = new Date(
        now.getFullYear(),
        now.getMonth() - 1, // חודש הקודם
        1
      );

      const year = archiveDate.getFullYear();
      const month = archiveDate.getMonth() + 1; // 1..12

      const archiveId = getArchiveId(year, month);

      const archiveRef = doc(
        collection(db, "groups", groupId, "archive"),
        archiveId
      );

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

      // קטגוריות
      const catsSnap = await getDocs(
        collection(db, "groups", groupId, "categories")
      );
      for (let cat of catsSnap.docs) {
        const data = cat.data();

        // שומרים בארכיון
        await setDoc(doc(collection(archiveRef, "categories"), cat.id), data);

        // אם קטגוריה קבוע משארים אם לא מוחכים
        if (!data.isRegular) {
          await deleteDoc(doc(db, "groups", groupId, "categories", cat.id));
        }
      }

      // הוצאות
      const expSnap = await getDocs(
        collection(db, "groups", groupId, "expenses")
      );
      for (let exp of expSnap.docs) {
        await setDoc(
          doc(collection(archiveRef, "expenses"), exp.id),
          exp.data()
        );
        await deleteDoc(doc(db, "groups", groupId, "expenses", exp.id));
      }

      // חסכונות
      const savingSnap = await getDocs(
        collection(db, "groups", groupId, "savings") 
      );
      for (let s of savingSnap.docs) {
        await setDoc(
          doc(collection(archiveRef, "savings"), s.id),
          s.data()
        );
       
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
      "האם אתה בטוח שברצונך לאפס? קטגוריות קבועות יישארו עם תקציב מאופס, כל השאר יימחקו.",
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
      <Text style={[styles.text, { color: colors.buttonText }]}>
        איפוס קבוצה
      </Text>
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

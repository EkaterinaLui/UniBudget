import { useTheme } from "@react-navigation/native";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { Alert, StyleSheet, Text, TouchableOpacity } from "react-native";
import { db } from "../firebase";
import { getArchiveId } from "../Utilities/date";

const ResetBudgetsButton = ({ groupId }) => {
  const { colors } = useTheme();

  const resetBudgets = async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const archiveId = getArchiveId(year, month);

      const archiveRef = doc(collection(db, "groups", groupId, "archive"), archiveId);
      await setDoc(archiveRef, {
        month,
        year,
        createdAt: now,
      });

      // קטגוריות
      const catsSnap = await getDocs(
        collection(db, "groups", groupId, "categories")
      );
      for (let cat of catsSnap.docs) {
        const data = cat.data();
        await setDoc(doc(collection(archiveRef, "categories"), cat.id), data);

        if (data.isRegular) {
          await updateDoc(doc(db, "groups", groupId, "categories", cat.id), {
            budget: 0,
          });
        } else {
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

import React, { useState } from "react";
import { View, Text, StyleSheet, Button, Alert, TextInput } from "react-native";
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  doc,
  deleteDoc,
  getDocs,
  updateDoc,
  collection,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { useNavigation, useTheme } from "@react-navigation/native";

function DeleteAccount() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [password, setPassword] = useState("");

  const deleteA = () => {
    Alert.alert("מחיקת משתמש", "אתה בטוח שברצונך למחוק את החשבון שלך?", [
      { text: "לא", style: "cancel" },
      {
        text: "מחק",
        style: "destructive",
        onPress: async () => {
          try {
            const user = auth.currentUser;

            if (!user) {
              Alert.alert("שגיאה", "לא נמצא משתמש מחובר");
              return;
            }

            if (!password) {
              Alert.alert("שגיאה", "אנא הזן סיסמה כדי לאמת מחדש");
              return;
            }

            // שלב 1: אימות מחדש
            const credential = EmailAuthProvider.credential(
              user.email,
              password
            );
            await reauthenticateWithCredential(user, credential);

            // שלב 2: מחיקת מסמכים שקשורים למשתמש
            await deleteDoc(doc(db, "settings", user.uid));

            const groupsSnap = await getDocs(collection(db, "groups"));
            for (const groupDoc of groupsSnap.docs) {
              const groupRef = doc(db, "groups", groupDoc.id);
              const groupData = groupDoc.data();

              // מחיקת הוצאות של המשתמש
              const expensesSnap = await getDocs(
                collection(db, "groups", groupDoc.id, "expenses")
              );
              for (const e of expensesSnap.docs) {
                await deleteDoc(
                  doc(db, "groups", groupDoc.id, "expenses", e.id)
                );
              }

              // מחיקת המשתמש מרשימת חברים
              if (groupData.members) {
                const updatedMembers = groupData.members.filter(
                  (m) => m.uid !== user.uid
                );
                await updateDoc(groupRef, { members: updatedMembers });
              }
            }

            // שלב 3: מחיקת המשתמש עצמו
            await deleteUser(user);

            Alert.alert("נמחק", "החשבון נמחק בהצלחה!");
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          } catch (error) {
            console.error("שגיאה במחיקת חשבון:", error);
            Alert.alert("שגיאה", error.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        מחיקת חשבון משתמש
      </Text>

      <TextInput
        style={[
          styles.input,
          { borderColor: colors.border, color: colors.text },
        ]}
        placeholder="הזן סיסמה לאימות"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Button title="מחק חשבון" color="red" onPress={deleteA} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 16,
  },
});

export default DeleteAccount;

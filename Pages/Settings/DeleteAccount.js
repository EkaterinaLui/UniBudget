import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
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
  const [loading, setLoading] = useState(false);

  const handleDelete = () => {
    Alert.alert("מחיקת משתמש", "בטוח שאתה רוצה למחוק את החשבון שלך?", [
      { text: "ביטול", style: "cancel" },
      {
        text: "מחק",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
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

            // אימות מחדש עם סיסמה
            const credential = EmailAuthProvider.credential(
              user.email,
              password
            );
            await reauthenticateWithCredential(user, credential);

            // מחיקת ההגדרות של המשתמש
            await deleteDoc(doc(db, "settings", user.uid));

            // מעבר על כל הקבוצות
            const groupsSnap = await getDocs(collection(db, "groups"));
            for (const groupDoc of groupsSnap.docs) {
              const groupRef = doc(db, "groups", groupDoc.id);
              const groupData = groupDoc.data();

              // מחיקת הוצאות של המשתמש בלבד
              const expensesSnap = await getDocs(
                collection(db, "groups", groupDoc.id, "expenses")
              );
              for (const e of expensesSnap.docs) {
                if (e.data().userId === user.uid) {
                  await deleteDoc(
                    doc(db, "groups", groupDoc.id, "expenses", e.id)
                  );
                }
              }

              // הוצאת המשתמש מרשימת חברים
              if (groupData.members) {
                const updatedMembers = groupData.members.filter(
                  (m) => m.uid !== user.uid
                );
                await updateDoc(groupRef, { members: updatedMembers });
              }
              if (groupData.memberIds) {
                const updatedIds = groupData.memberIds.filter(
                  (id) => id !== user.uid
                );
                await updateDoc(groupRef, { memberIds: updatedIds });
              }
            }

            // מחיקת המשתמש עצמו
            await deleteUser(user);

            Alert.alert("נמחק", "החשבון שלך נמחק בהצלחה!");
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          } catch (error) {
            console.error("שגיאה במחיקת חשבון:", error);
            Alert.alert("שגיאה", error.message || "מחיקה נכשלה");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>מחיקת חשבון</Text>

      <Text style={[styles.desc, { color: colors.textSecondary }]}>
        מחיקת חשבון תמחק את כל הנתונים שלך מהאפליקציה. פעולה זו סופית ולא ניתנת לשחזור.
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

      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: colors.danger }]}
        onPress={handleDelete}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.deleteText}>מחק חשבון</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
     flex: 1,
      padding: 20,
       justifyContent: "center"
     },
  title: { 
    fontSize: 24,
     fontWeight: "bold", 
     textAlign: "center",
      marginBottom: 20 
    },
  desc: {
     fontSize: 14,
      textAlign: "center", 
      marginBottom: 20 
    },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 16,
  },
  deleteButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  deleteText: {
     color: "#fff",
      fontSize: 16, 
      fontWeight: "bold" 
    },
});

export default DeleteAccount;

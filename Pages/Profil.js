import { useNavigation, useTheme } from "@react-navigation/native";
import { signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../firebase";

function Profil({ userId, auth }) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // האזנה לפרטי המשתמש בזמן אמת
  useEffect(() => {
    if (!userId) return;

    const userDocRef = doc(db, "users", userId);

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          setUserData({ error: "לא נמצא משתמש עם הפרטים האלו" });
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("שגיאה בטעינת פרופיל:", error);
        setUserData({ error: "אירעה שגיאה בטעינת הפרופיל" });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

 const backupUserData = async () => {
    if (!userId) return;
    setIsBackingUp(true);

    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        Alert.alert("שגיאה", "לא נמצאו נתונים לגיבוי");
        return;
      }

      // שמירה באוסף backups
      await setDoc(doc(db, "backups", userId), {
        ...userSnap.data(),
        backupDate: serverTimestamp(),
      });

      Alert.alert("הצלחה", "הגיבוי נשמר בהצלחה!");
    } catch (error) {
console.error("שגיאה בגיבוי:", error);
  navigation.navigate("Error", {
    message: "אירעה שגיאה בעת ביצוע הגיבוי, אנא נסה שוב.",
    onRetry: backupUserData,
  });
    } finally {
      setIsBackingUp(false);
    }
  };


  // יציאה מהמערכת
  const logOut = async () => {
    Alert.alert("התנתקות", "האם אתה בטוח שתרצה להתנתק?", [
      { text: "ביטול", style: "cancel" },
      {
        text: "התנתק",
        onPress: async () => {
          try {
            if (auth) {
              await signOut(auth);
            }
          } catch (error) {
            console.error("שגיאה ביציאה:", error);
            Alert.alert("שגיאה", "לא הצלחנו לנתק אותך, נסה שוב.");
          }
        },
        style: "destructive",
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.text }}>
          טוען את הפרופיל שלך...
        </Text>
      </View>
    );
  }

  if (!userData || userData.error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {userData?.error || "לא נמצאו נתונים להצגה"}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>הפרופיל שלי</Text>

      {/* תמונת פרופיל */}
      <Image
        source={
          userData.avatar === "male"
            ? require("../assets/avatar_male.png")
            : userData.avatar === "female"
            ? require("../assets/avatar_female.png")
            : userData.avatar && userData.avatar.startsWith("http")
            ? { uri: userData.avatar }
            : require("../assets/avatar_default.png")
        }
        style={styles.avatar}
      />

      {/* כרטיס מידע */}
      <View
        style={[
          styles.infoBox,
          { backgroundColor: colors.card, shadowColor: colors.shadow },
        ]}
      >
        <Text style={[styles.name, { color: colors.text }]}>
          {userData.name || "משתמש חדש"}
        </Text>

        <Text style={[styles.email, { color: colors.textSecondary }]}>
          {userData.email}
        </Text>

        {userData.uniqueCode && (
          <Text style={[styles.idText, { color: colors.textSecondary }]}>
            מזהה אישי: {userData.uniqueCode}
          </Text>
        )}

        <TouchableOpacity
          disabled={isBackingUp}
          style={[styles.editButton, { backgroundColor: colors.buttonPrimary }]}
          onPress={backupUserData}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            {isBackingUp ? "מגבה..." : "בצע גיבוי"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.buttonPrimary }]}
          onPress={() => navigation.navigate("EditProfil")}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            עריכת פרטים
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.logoutButton,
            { backgroundColor: colors.buttonDanger },
          ]}
          onPress={logOut}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            התנתק
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 30,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 15,
  },
  infoBox: {
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
    width: "90%",
    alignItems: "center",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    marginBottom: 5,
  },
  idText: {
    fontSize: 20,
    fontWeight: 800,
    marginBottom: 15,
  },
   backupButton: {
    padding: 12,
    borderRadius: 10,
    marginTop: 5,
    width: "100%",
    alignItems: "center",
  },
  editButton: {
    padding: 12,
    borderRadius: 10,
    marginTop: 5,
    width: "100%",
    alignItems: "center",
  },
  logoutButton: {
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default Profil;

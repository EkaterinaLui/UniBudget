import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useTheme,
  useIsFocused,
} from "@react-navigation/native";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { updateProfile, updateEmail, updatePassword } from "firebase/auth";

const EditProfil = () => {
  const user = auth.currentUser;
  const { colors } = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [name, setName] = useState(user?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatar, setAvatar] = useState(user?.photoURL || "default");
  const [loading, setLoading] = useState(false);

  // טעינת פרופיל מה-DB
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userId = auth.currentUser.uid;
        const snap = await getDoc(doc(db, "users", userId));
        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || "");
          setEmail(data.email || "");
          setAvatar(data.avatar || "default");
        }
      } catch (err) {
        console.log("שגיאה בטעינת פרופיל:", err);
      }
    };
    if (isFocused) loadProfile();
  }, [isFocused]);

  // שמירת שינויים
  const saveChanges = async () => {
    if (password && password !== confirmPassword) {
      Alert.alert("שגיאה", "הסיסמאות לא תואמות");
      return;
    }

    setLoading(true);
    try {
      const userId = auth.currentUser.uid;
      const userRef = doc(db, "users", userId);

      // עדכון במסד Firestore
      await updateDoc(userRef, { name, email, avatar });

      // עדכון בפרופיל Firebase Auth
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: avatar,
      });

      // שינוי אימייל
      if (email !== auth.currentUser.email) {
        try {
          await updateEmail(auth.currentUser, email);
        } catch (error) {
          Alert.alert("שגיאה", "כדי לשנות מייל צריך להתחבר מחדש");
          console.error(error);
        }
      }

      // שינוי סיסמה
      if (password) {
        try {
          await updatePassword(auth.currentUser, password);
        } catch (error) {
          Alert.alert("שגיאה", "כדי לשנות סיסמה צריך להתחבר מחדש");
          console.error(error);
        }
      }

      Alert.alert("הצלחה", "השינויים נשמרו");
      navigation.goBack();
    } catch (e) {
      console.error("שמירת פרופיל נכשלה:", e);
      Alert.alert("שגיאה", "שמירת הפרופיל נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container}>
        {/* פרטים אישיים */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>פרטים אישיים</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="שם מלא"
          />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="אימייל"
          />
        </View>

        {/* אבטחה */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>אבטחה</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="סיסמה חדשה"
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="אישור סיסמה חדשה"
            secureTextEntry
          />
        </View>

        {/* אווטאר */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>בחר אווטאר</Text>
          <View style={styles.avatarRow}>
            <TouchableOpacity onPress={() => setAvatar("male")}>
              <Image
                source={require("../../assets/avatar_male.png")}
                style={[
                  styles.avatarOption,
                  avatar === "male" && styles.avatarSelected,
                ]}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAvatar("female")}>
              <Image
                source={require("../../assets/avatar_female.png")}
                style={[
                  styles.avatarOption,
                  avatar === "female" && styles.avatarSelected,
                ]}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAvatar("default")}>
              <Image
                source={require("../../assets/avatar_default.png")}
                style={[
                  styles.avatarOption,
                  avatar === "default" && styles.avatarSelected,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveChanges}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>שמור שינויים</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    backgroundColor: "#fff",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  avatarRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },
  avatarOption: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginHorizontal: 10,
  },
  avatarSelected: {
    borderWidth: 3,
    borderColor: "#007bff",
  },
  saveButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "#007bff",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default EditProfil;

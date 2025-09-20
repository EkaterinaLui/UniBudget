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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy"; // ✅ משתמש ב־legacy, עובד טוב ב־SDK 54
import { useNavigation, useTheme, useIsFocused } from "@react-navigation/native";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { auth, db, storage } from "../../firebase";
import {
  updateProfile,
  updateEmail,
  updatePassword,
} from "firebase/auth";
import { ref, uploadString, getDownloadURL } from "firebase/storage"; // ✅ רק uploadString

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

  // טוען פרופיל מה־Firestore בכל כניסה למסך
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userId = auth.currentUser.uid;
        const userRef = doc(db, "users", userId);
        const snap = await getDoc(userRef);

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

    if (isFocused) {
      loadProfile();
    }
  }, [isFocused]);

  // בחירת תמונה מהגלריה
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("שגיאה", "לא ניתנה הרשאה לגשת לגלריה");
        return;
      }

      const img = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // ⚠️ יש אזהרה אבל עובד
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!img.canceled && img.assets?.length > 0) {
        setAvatar(img.assets[0].uri);
        console.log("📸 תמונה נבחרה:", img.assets[0].uri);
      }
    } catch (error) {
      console.error("❌ שגיאה בבחירת תמונה:", error);
      Alert.alert("שגיאה", "לא ניתן היה לפתוח את הגלריה");
    }
  };

  // העלאת תמונה ל־Firebase Storage ב־Base64
  const uploadImage = async (uri, userId) => {
    try {
      console.log("📂 קריאת קובץ:", uri);

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
      console.log("✅ קריאה ל־Base64 הצליחה, אורך:", base64.length);

      const storageRef = ref(storage, `avatars/${userId}.jpg`);
      console.log("📌 Firebase Storage ref:", `avatars/${userId}.jpg`);

      await uploadString(storageRef, base64, "base64");
      console.log("🚀 העלאה הצליחה עם uploadString");

      const url = await getDownloadURL(storageRef);
      console.log("🌐 לינק לתמונה:", url);

      return url;
    } catch (error) {
      console.error("❌ שגיאה בהעלאת תמונה:", error);
      throw error;
    }
  };

  // שמירת שינויים
  const saveChanges = async () => {
    if (password && password !== confirmPassword) {
      Alert.alert("שגיאה", "הסיסמאות לא תואמות");
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      const userRef = doc(db, "users", userId);

      let avatarUrl = avatar;
      if (avatar && avatar.startsWith("file")) {
        avatarUrl = await uploadImage(avatar, userId);
      }

      // עדכון Firestore
      await updateDoc(userRef, { name, email, avatar: avatarUrl });
      console.log("📝 Firestore עודכן");

      // עדכון Auth
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: avatarUrl,
      });
      console.log("👤 Auth עודכן");

      if (email !== auth.currentUser.email) {
        await updateEmail(auth.currentUser, email);
        console.log("📧 אימייל עודכן");
      }

      if (password) {
        await updatePassword(auth.currentUser, password);
        console.log("🔑 סיסמה עודכנה");
      }

      // עדכון state מיידי
      setName(name);
      setEmail(email);
      setAvatar(avatarUrl);

      Alert.alert("הצלחה", "השינויים נשמרו בהצלחה");
      navigation.goBack();
    } catch (error) {
      console.error("❌ שגיאה בשמירת פרופיל:", error);
      Alert.alert("שגיאה", "לא הצלחנו לשמור את השינויים");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.generalBackground }}>
      <ScrollView style={styles.container}>
        {/* פרטים אישיים */}
        <View style={[styles.card, { backgroundColor: colors.generalCardBackground, shadowColor: colors.generalCardShadow }]}>
          <Text style={[styles.cardTitle, { color: colors.generalTitle }]}>פרטים אישיים</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="שם מלא"
            placeholderTextColor={colors.inputPlaceholder}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="אימייל"
            placeholderTextColor={colors.inputPlaceholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
        </View>

        {/* אבטחה */}
        <View style={[styles.card, { backgroundColor: colors.generalCardBackground, shadowColor: colors.generalCardShadow }]}>
          <Text style={[styles.cardTitle, { color: colors.generalTitle }]}>אבטחה</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="סיסמה חדשה"
            placeholderTextColor={colors.inputPlaceholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="אישור סיסמה חדשה"
            placeholderTextColor={colors.inputPlaceholder}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        {/* אווטאר */}
        <View style={[styles.card, { backgroundColor: colors.generalCardBackground, shadowColor: colors.generalCardShadow }]}>
          <Text style={[styles.cardTitle, { color: colors.generalTitle }]}>בחירת אווטאר</Text>
          <View style={styles.avatarRow}>
            <TouchableOpacity onPress={() => setAvatar("male")}>
              <Image
                source={require("../../assets/avatar_male.png")}
                style={[styles.avatarOption, avatar === "male" && { borderColor: colors.primary, borderWidth: 2 }]}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAvatar("female")}>
              <Image
                source={require("../../assets/avatar_female.png")}
                style={[styles.avatarOption, avatar === "female" && { borderColor: colors.primary, borderWidth: 2 }]}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage}>
              <Image
                source={
                  avatar && avatar.startsWith("http")
                    ? { uri: avatar }
                    : avatar && avatar.startsWith("file")
                    ? { uri: avatar }
                    : require("../../assets/avatar_default.png")
                }
                style={[styles.avatarOption, avatar && (avatar.startsWith("http") || avatar.startsWith("file")) && { borderColor: colors.primary, borderWidth: 2 }]}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.success }]} onPress={saveChanges}>
          <Text style={[styles.saveButtonText, { color: colors.buttonText }]}>שמור שינויים</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderRadius: 12, padding: 16, marginTop: 40, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  input: { width: "100%", padding: 12, borderRadius: 8, marginBottom: 15, fontSize: 16 },
  avatarRow: { flexDirection: "row", justifyContent: "space-around", marginVertical: 10 },
  avatarOption: { width: 70, height: 70, borderRadius: 35, marginHorizontal: 10 },
  saveButton: { padding: 15, borderRadius: 10, alignItems: "center", marginBottom: 30, marginTop: 15 },
  saveButtonText: { fontSize: 16, fontWeight: "600" },
});

export default EditProfil;

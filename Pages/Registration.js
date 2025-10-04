import { LinearGradient } from "expo-linear-gradient";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../firebase";

const { width } = Dimensions.get("window");

function Registration({ navigation }) {
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const userRegister = async () => {
    setError("");

    if (!userName || !email || !password || !repeatPassword) {
      setError("אנא מלאו את כל השדות");
      return;
    }

    if (password.length < 8) {
      setError("הסיסמה צריכה לכלול לפחות 8 תווים");
      return;
    }

    if (password !== repeatPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    setIsLoading(true);

    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      const user = userCredential.user;
      const uniqueCode = generateUniqueCode(6);

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: userName.trim(),
        uniqueCode,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        role: "user",
        blocked: false,
      });

      await setDoc(doc(db, "settings", user.uid), {
        theme: "light",
        currency: "₪",
        notifications: {
          budgetLimit: true,
        },
      });
    } catch (firebaseError) {
      switch (firebaseError.code) {
        case "auth/email-already-in-use":
          setError("האימייל הזה כבר רשום במערכת");
          break;
        case "auth/invalid-email":
          setError("כתובת האימייל לא תקינה");
          break;
        case "auth/weak-password":
          setError("הסיסמה חלשה מדי");
          break;
        default:
          setError("משהו השתבש... נסו שוב מאוחר יותר");
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Text style={styles.title}>הרשמה</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="שם מלא"
            placeholderTextColor="#a0aebf"
            value={userName}
            onChangeText={setUserName}
            editable={!isLoading}
          />
          <TextInput
            style={styles.input}
            placeholder="כתובת אימייל"
            placeholderTextColor="#a0aebf"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
          />
          <TextInput
            style={styles.input}
            placeholder="סיסמה"
            placeholderTextColor="#a0aebf"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />
          <TextInput
            style={styles.input}
            placeholder="אימות סיסמה"
            placeholderTextColor="#a0aebf"
            secureTextEntry
            value={repeatPassword}
            onChangeText={setRepeatPassword}
            editable={!isLoading}
          />

          {/* כפתור הרשמה */}
          <TouchableOpacity
            disabled={isLoading}
            onPress={userRegister}
            activeOpacity={0.8}
            style={{
              width: width * 0.9,
              borderRadius: 30,
              overflow: "hidden",
              marginTop: 20,
            }}
          >
            <LinearGradient
              colors={["#00b0ff", "#006bb3"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>להירשם</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* לינק להתחברות */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            style={styles.linkButton}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>כבר יש לך חשבון? התחבר</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// מייצר קוד משתמש ייחודי
function generateUniqueCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijklmnpqrstuwyz123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    backgroundColor: "#e6f0ff",
    paddingVertical: 40,
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#004a99",
    marginBottom: 30,
    fontFamily: "System",
  },
  input: {
    width: width * 0.9,
    textAlign: "right",
    height: 55,
    backgroundColor: "#f7fbff",
    borderRadius: 30,
    paddingHorizontal: 20,
    fontSize: 18,
    color: "#003366",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#a8caff",
    shadowColor: "#a8caff",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  errorText: {
    color: "#e53e3e",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  linkButton: {
    marginTop: 25,
  },
  linkText: {
    color: "#004a99",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});

export default Registration;

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from "react-native";

import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithCredential,
} from "firebase/auth";

import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";

import { FontAwesome } from "@expo/vector-icons";

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get("window");

function Login({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // --- Google Provider (Expo Go) ---
  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    expoClientId:
      "91281193889-gocdr5cd2vq5mnjav2cl5d60efu0v7p5.apps.googleusercontent.com",
    androidClientId:
      "91281193889-gocdr5cd2vq5mnjav2cl5d60efu0v7p5.apps.googleusercontent.com", 
    iosClientId:
      "91281193889-gocdr5cd2vq5mnjav2cl5d60efu0v7p5.apps.googleusercontent.com", 
    webClientId:
      "91281193889-gocdr5cd2vq5mnjav2cl5d60efu0v7p5.apps.googleusercontent.com",
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const { authentication } = googleResponse;
      const auth = getAuth();
      const credential = GoogleAuthProvider.credential(
        null,
        authentication.accessToken
      );
      signInWithCredential(auth, credential)
        .then(() => Alert.alert("התחברת בהצלחה עם Google"))
        .catch(() => Alert.alert("שגיאה בהתחברות עם Google"));
    }
  }, [googleResponse]);

  // --- Facebook Provider ---
  const [fbRequest, fbResponse, promptFacebook] = Facebook.useAuthRequest({
    clientId: "2292044251311591",
  });

  useEffect(() => {
    if (fbResponse?.type === "success") {
      const { authentication } = fbResponse;
      const auth = getAuth();
      const credential = FacebookAuthProvider.credential(
        authentication.accessToken
      );
      signInWithCredential(auth, credential)
        .then(() => Alert.alert("התחברת בהצלחה עם Facebook"))
        .catch(() => Alert.alert("שגיאה בהתחברות עם Facebook"));
    }
  }, [fbResponse]);

  // --- Email/Password Login ---
  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("תמלאו את כל השדות בבקשה");
      return;
    }
    setIsLoading(true);
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
      Alert.alert("התחברת בהצלחה");
    } catch (firebaseError) {
      switch (firebaseError.code) {
        case "auth/invalid-email":
          setError("המייל שגוי");
          break;
        case "auth/user-disabled":
          setError("המשתמש חסום");
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
          setError("מייל או סיסמה שגויים");
          break;
        default:
          setError("שגיאה בהתחברות, נסו שוב בבקשה");
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Forgot Password ---
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("אנא הכנס כתובת אימייל לשחזור סיסמה");
      return;
    }
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      Alert.alert("הודעת שחזור סיסמה נשלחה לכתובת המייל שלך");
    } catch (error) {
      switch (error.code) {
        case "auth/invalid-email":
          Alert.alert("כתובת אימייל לא תקינה");
          break;
        case "auth/user-not-found":
          Alert.alert("משתמש עם האימייל הזה לא נמצא");
          break;
        default:
          Alert.alert("שגיאה בשליחת שחזור סיסמה");
      }
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
          <Text style={styles.title}>כניסה</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="מייל"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
            placeholderTextColor="#a0aecf"
          />

          <TextInput
            style={styles.input}
            placeholder="סיסמה"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
            placeholderTextColor="#a0aecf"
          />

          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>שכחתי סיסמה?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
            style={styles.mainButton}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>להתחבר</Text>
            )}
          </TouchableOpacity>

          {/* מפריד */}
          <View style={styles.separatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>או</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: "#DB4437" }]}
              onPress={() => promptGoogle()}
              disabled={!googleRequest}
            >
              <FontAwesome name="google" size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: "#3b5998" }]}
              onPress={() => promptFacebook()}
              disabled={!fbRequest}
            >
              <FontAwesome name="facebook" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate("Register")}
            style={styles.linkButton}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>אין לך משתמש? להירשם</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
    height: 55,
    textAlign: "right",
    backgroundColor: "#f7fbff",
    borderRadius: 30,
    paddingHorizontal: 20,
    fontSize: 18,
    color: "#003366",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#a8caff",
    shadowColor: "#a8caff",
    shadowOffset: { width: 0, height: 6 },
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
  forgotButton: {
    alignSelf: "flex-end",
    marginRight: 20,
    marginBottom: 10,
  },
  forgotText: {
    color: "#007fff",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  mainButton: {
    width: width * 0.9,
    borderRadius: 30,
    overflow: "hidden",
    marginTop: 20,
    backgroundColor: "#007fff",
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    width: width * 0.9,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#a0aecf",
  },
  separatorText: {
    marginHorizontal: 10,
    color: "#7a869a",
    fontSize: 14,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  iconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
    elevation: 4,
  },
  linkButton: {
    marginTop: 25,
  },
  linkText: {
    color: "#004a99",
    fontSize: 16,
    textDecorationLine: "underline",
    textAlign: "center",
  },
});

export default Login;

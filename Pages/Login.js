import { FontAwesome } from "@expo/vector-icons";
import { makeRedirectUri } from "expo-auth-session";
import * as Facebook from "expo-auth-session/providers/facebook";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  FacebookAuthProvider,
  getAuth,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get("window");

function Login({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectUri = makeRedirectUri({
    scheme: "unibudget",
    path: "redirect",
    useProxy: false,
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    responseType: "id_token",
    scopes: ["profile", "email"],
    redirectUri,
    androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.GOOGLE_WEB_CLIENT_ID,

    // השורה שמכריחה את Google שואל כל פעם באיזה חשבון לבחור
    prompt: "select_account",
  });

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params?.id_token;
      if (!idToken) {
        Alert.alert("שגיאה", "לא התקבל id_token מגוגל");
        return;
      }

      const auth = getAuth();
      const credential = GoogleAuthProvider.credential(idToken);

      signInWithCredential(auth, credential)
        .then((res) => {
          console.log("Firebase User:", res.user.uid);
          navigation.replace("Home", { userId: res.user.uid });
        })
        .catch((err) => {
          console.error("Firebase sign-in error:", err);
          Alert.alert("שגיאה", "התחברות עם Google נכשלה");
        });
    }
  }, [response, navigation]);

  const [fbRequest, fbResponse, promptFacebook] = Facebook.useAuthRequest({
    clientId: process.env.FACEBOOK_CLIENT_ID,
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

  // התחברות רגילה
  const login = async () => {
    setError("");
    if (!email || !password) {
      setError("נא למלא גם מייל וגם סיסמה");
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
      Alert.alert("ברוך שובך!", "התחברת בהצלחה");
    } catch (firebaseError) {
      console.error(firebaseError);
      switch (firebaseError.code) {
        case "auth/invalid-email":
          setError("כתובת המייל לא תקינה");
          break;
        case "auth/user-disabled":
          setError("החשבון שלך הושבת, פנה למנהל");
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
          setError("המייל או הסיסמה לא נכונים");
          break;
        default:
          setError("אירעה שגיאה בהתחברות, נסו שוב");
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // שחזור סיסמה
  const forgotPassword = async () => {
    if (!email) {
      Alert.alert("שחזור סיסמה", "נא להזין כתובת מייל לשחזור");
      return;
    }
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      Alert.alert("נשלח!", "הודעת שחזור סיסמה נשלחה אליך למייל");
    } catch (error) {
      switch (error.code) {
        case "auth/invalid-email":
          Alert.alert("שגיאה", "כתובת המייל אינה תקינה");
          break;
        case "auth/user-not-found":
          Alert.alert("שגיאה", "לא נמצא משתמש עם המייל הזה");
          break;
        default:
          Alert.alert("שגיאה", "לא הצלחנו לשלוח את המייל, נסה שוב");
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
            placeholder="אימייל"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
            placeholderTextColor="#a0aecf"
            textAlign="right"
          />

          <TextInput
            style={styles.input}
            placeholder="סיסמה"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
            placeholderTextColor="#a0aecf"
            textAlign="right"
          />

          <TouchableOpacity
            onPress={forgotPassword}
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>שכחתי סיסמה</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={login}
            disabled={isLoading}
            style={styles.mainButton}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>התחבר</Text>
            )}
          </TouchableOpacity>

          {/* מפריד */}
          <View style={styles.separatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>או</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Google/Facebook */}
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: "#DB4437" }]}
              disabled={!request}
              onPress={() => promptAsync()}
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
          >
            <Text style={styles.linkText}>אין לך חשבון? הירשם כאן</Text>
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
    fontSize: 32,
    fontWeight: "800",
    color: "#004a99",
    marginBottom: 25,
  },
  input: {
    width: width * 0.9,
    height: 50,
    backgroundColor: "#f7fbff",
    borderRadius: 25,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#003366",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#a8caff",
  },
  errorText: {
    color: "#e53e3e",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginRight: 25,
    marginBottom: 10,
  },
  forgotText: {
    color: "#007fff",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  mainButton: {
    width: width * 0.9,
    borderRadius: 25,
    marginTop: 15,
    backgroundColor: "#007fff",
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
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
    fontSize: 13,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  iconButton: {
    width: 55,
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
  },
  linkButton: {
    marginTop: 25,
  },
  linkText: {
    color: "#004a99",
    fontSize: 15,
    textDecorationLine: "underline",
    textAlign: "center",
  },
});

export default Login;

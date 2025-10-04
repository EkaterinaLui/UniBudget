import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SettingsContext, SettingsProvider } from "./Utilities/SettingsContext";
import { CustomDarkTheme, CustomLightTheme } from "./Utilities/Theme";

import * as SecureStore from "expo-secure-store";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth as firebaseAuth } from "./firebase";

// Screens
import AppAdmin from "./AdminApp/AppAdmin";
import Error from "./Componets/Error";
import Reports from "./Pages/Reports";
import LockScreen from "./Pages/Settings/LockScreen";
import AuthStack from "./Stacks/AuthStack";
import ChatStack from "./Stacks/ChatStack";
import MainStack from "./Stacks/MainStack";
import ProfilStack from "./Stacks/ProfilStack";
import SettingsStack from "./Stacks/SettingsStack";

const Tab = createBottomTabNavigator();

// RTL
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

// הגדרת התראות
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync(userId) {
  if (!userId) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("לא ניתנו הרשאות לשליחת התראות");
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("Expo Push Token:", token);

  //שמירה ב דטאבייס
  await setDoc(
    doc(db, "users", userId),
    { expoPushToken: token },
    { merge: true }
  );
}

function AppContent({ user, userId, locked, setLocked, userRole, isBlocked }) {
  const { settings } = useContext(SettingsContext);

  const navigationTheme =
    settings.theme === "dark" ? CustomDarkTheme : CustomLightTheme;
  const { colors } = navigationTheme;

  return (
    <NavigationContainer theme={navigationTheme}>
      {!user ? (
        <AuthStack db={db} />
      ) : locked ? (
        <LockScreen onUnlock={() => setLocked(false)} />
      ) : (
        <>
          {/* אם משתמש חסום יציג לו הודעה */}
          {isBlocked && (
            <View style={styles.blockedBanner}>
              <Text style={styles.blockedText}>
                המשתמש נחסם על ידי אפליקציה — נא לפנות לתמיכה
              </Text>
            </View>
          )}

          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarShowLabel: false,
               tabBarActiveTintColor: "#467077ff",
               tabBarInactiveTintColor: "#90E0EF",
              tabBarStyle: {
                ...styles.tabBar,
                backgroundColor: colors.tabBackground,
                borderTopColor: colors.border,
              },
              tabBarIcon: ({ color, size }) => {
                const icons = {
                  בית: "home-outline",
                  דוחות: "documents-outline",
                  צאט: "chatbox-outline",
                  משתמש: "person-outline",
                  הגדרות: "settings-outline",
                  ניהול: "construct-outline",
                };
                return (
                  <Ionicons
                    name={icons[route.name] || "ellipse-outline"}
                    size={size}
                    color={color}
                  />
                );
              },
            })}
          >
            {/* רק אם המשתמש לא חסום — להציג את שאר הטאבים */}
            {!isBlocked && (
              <>
                <Tab.Screen name="בית">
                  {(props) => <MainStack {...props} db={db} userId={userId} />}
                </Tab.Screen>
                <Tab.Screen name="דוחות">
                  {(props) => <Reports {...props} userId={userId} />}
                </Tab.Screen>
                <Tab.Screen name="צאט">
                  {(props) => <ChatStack {...props} db={db} userId={userId} />}
                </Tab.Screen>
              </>
            )}

            {/* תמיד יהיה גישה להגדרות ועמוד משתמש */}
            <Tab.Screen name="משתמש">
              {(props) => <ProfilStack {...props} db={db} userId={userId} auth={firebaseAuth} />}
            </Tab.Screen>
            <Tab.Screen name="הגדרות">
              {(props) => <SettingsStack {...props} db={db} userId={userId} auth={firebaseAuth} />}
            </Tab.Screen>

            {/* רק מנהל אפךיקציה יכול לגשת */}
            {userRole === "appAdmin" && (
              <Tab.Screen name="ניהול">
                {(props) => <AppAdmin {...props} db={db} userId={userId} currentUser={{ uid: userId, role: userRole }} />}
              </Tab.Screen>
            )}
          </Tab.Navigator>
        </>
      )}
    </NavigationContainer>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [locked, setLocked] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);

  // טען קוד
  useEffect(() => {
    (async () => {
      const savedPin = await SecureStore.getItemAsync("userPin");
      if (savedPin) setLocked(true);
      setIsLoading(false);
    })();
  }, []);

  // האזנה למשתמש מחובר
    useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (currentUser) {
        try {
          setUser(currentUser);
          setUserId(currentUser.uid);

          console.log("משתמש מחובר:", currentUser.uid);

          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserRole(data.role || "user");
            setIsBlocked(data.blocked === true);

            if (data.blocked) {
              Alert.alert(
                "החשבון שלך נחסם",
                "הגישה לחשבון זה נחסמה. אנא פנה לתמיכה לקבלת עזרה.",
                [{ text: "אישור" }]
              );
            }
          } else {
            console.log("לא נמצא משתמש — נוצר חדש");
            await setDoc(
              userRef,
              {
                uid: currentUser.uid,
                email: currentUser.email || "",
                name: currentUser.displayName || "משתמש חדש",
                role: "user",
                blocked: false,
                createdAt: new Date(),
              },
              { merge: true }
            );
            setUserRole("user");
            setIsBlocked(false);
          }

          await registerForPushNotificationsAsync(currentUser.uid);
        } catch (err) {
          console.error("שגיאה בטעינת נתוני משתמש:", err);
        }
      } else {
        setUser(null);
        setUserId(null);
        setUserRole(null);
        setIsBlocked(false);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5fdfff" />
        <Text style={styles.loadingText}>טוען...</Text>
      </View>
    );
  }

  return (
    <Error>
      <SafeAreaProvider>
        <SettingsProvider>
          <AppContent
            user={user}
            userId={userId}
            locked={locked}
            setLocked={setLocked}
            userRole={userRole}
            isBlocked={isBlocked}
          />
        </SettingsProvider>
      </SafeAreaProvider>
    </Error>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 0,
    height: 72,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    position: "absolute",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "500",
  },
  blockedBanner: {
    marginTop: 50,
    backgroundColor: "#b71c1c",
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  blockedText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 18,
  },
});

export default App;

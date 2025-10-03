import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  I18nManager,
  Platform,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SettingsContext, SettingsProvider } from "./Utilities/SettingsContext";
import { CustomDarkTheme, CustomLightTheme } from "./Utilities/Theme";

import * as SecureStore from "expo-secure-store";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db, auth as firebaseAuth } from "./firebase";

// Screens
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

function AppContent({ user, userId, locked, setLocked }) {
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
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarShowLabel: false,
            tabBarIcon: ({ color, size }) => {
              const icons = {
                בית: "home-outline",
                דוחות: "documents-outline",
                צאט: "chatbox-outline",
                משתמש: "person-outline",
                הגדרות: "settings-outline",
              };
              return (
                <Ionicons
                  name={icons[route.name] || "ellipse-outline"}
                  size={size}
                  color={color}
                />
              );
            },
            tabBarActiveTintColor: "#0077B6",
            tabBarInactiveTintColor: "#90E0EF",
            tabBarStyle: {
              ...styles.tabBar,
              backgroundColor: colors.tabBackground,
              borderTopColor: colors.border,
              paddingBottom: Platform.OS === "android" ? 12 : 24,
            },
          })}
        >
          <Tab.Screen name="בית">
            {(props) => <MainStack {...props} db={db} userId={userId} />}
          </Tab.Screen>
          <Tab.Screen name="דוחות">
            {(props) => (
              <Reports {...props} auth={firebaseAuth} userId={userId} />
            )}
          </Tab.Screen>
          <Tab.Screen name="צאט">
            {(props) => <ChatStack {...props} db={db} userId={userId} />}
          </Tab.Screen>
          <Tab.Screen name="משתמש">
            {(props) => (
              <ProfilStack
                {...props}
                db={db}
                userId={userId}
                auth={firebaseAuth}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="הגדרות">
            {(props) => <SettingsStack {...props} db={db} userId={userId} />}
          </Tab.Screen>
        </Tab.Navigator>
      )}
    </NavigationContainer>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [locked, setLocked] = useState(false);
 

  // טען זמן נעילה + PIN
  useEffect(() => {
    (async () => {     
      const savedPin = await SecureStore.getItemAsync("userPin");
      if (savedPin) setLocked(true);
      setIsLoading(false);
    })();
  }, []);


  

  // האזנה למשתמש מחובר
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUserId(currentUser.uid);
        console.log("Firebase User ID:", currentUser.uid);

        registerForPushNotificationsAsync(currentUser.uid);
      } else {
        setUser(null);
        setUserId(null);
        console.log("אין משתמש מחובר בפיירבייס");
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
    <SafeAreaProvider>
      <SettingsProvider>
        <AppContent user={user} userId={userId} locked={locked} setLocked={setLocked} />
      </SettingsProvider>
    </SafeAreaProvider>
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
});

export default App;

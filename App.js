// App.js
import React, { useEffect, useState, useContext } from "react";
import * as Notifications from "expo-notifications";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  Platform,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SettingsProvider, SettingsContext } from "./Utilities/SettingsContext";
import { CustomLightTheme, CustomDarkTheme } from "./Utilities/Theme";

import { auth as firebaseAuth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

// Screens
import AuthStack from "./Stacks/AuthStack";
import MainStack from "./Stacks/MainStack";
import ChatStack from "./Stacks/ChatCtack";
import SettingsStack from "./Stacks/SettingsStack";
import ProfilStack from "./Stacks/ProfilStack";
import Reports from "./Pages/Reports";
import Profil from "./Pages/Profil";

const Tab = createBottomTabNavigator();

// הגדרת התראות
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function AppContent({ user, userId }) {
  const { settings } = useContext(SettingsContext);

  const navigationTheme =
    settings.theme === "dark" ? CustomDarkTheme : CustomLightTheme;
  const { colors } = navigationTheme;

  return (
    <NavigationContainer theme={navigationTheme}>
      {!user ? (
        <AuthStack db={db} />
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUserId(currentUser.uid);
        console.log("Firebase User ID:", currentUser.uid);
      } else {
        setUser(null);
        setUserId(null);
        console.log("אין משתמש מחובר בפיירבייס");
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          alert("לא אושר לשלוח התראות ");
        }
      }
    })();
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
        <AppContent user={user} userId={userId} />
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

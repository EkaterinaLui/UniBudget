import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator, Image, TouchableOpacity } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; 

function Profil({ userId, auth }) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);  

  // טעינת פרטי המשתמש 
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          setUserData({ error: "לא נמצא משתמש" });
        }
      } catch (error) {
        console.error("שגיאה בטעינת פרופיל:", error);
        setUserData({ error: "שגיאה בטעינה" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // פונקציה ליציאה מהמערכת
  const logOut = async () => {
    Alert.alert('יציאה', 'בטוח רוצה לצאת?', [
      { text: 'ביטל', style: "cancel" },
      {
        text: "לצאת",
        onPress: async () => {
          try {
            if (auth) {
              await signOut(auth); 
              console.log('User exited the application');
            }
          } catch (error) {
            console.error('Error on exit: ', error);
            Alert.alert('שגיאה', 'תנסו שוב');
          }
        },
        style: 'destructive'
      }
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!userData || userData.error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {userData?.error || "בעיה בנתונים"}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>פרופיל</Text>

      {/* תמונה */}
      <Image
        source={
          userData.avatar === "male"
          ?require("../assets/avatar_male.png")
          :userData.avatar === "female"
          ?require("../assets/avatar_female.png")
          :userData.avatar && userData.avatar.startsWith("http")
          ?{ uri: userData.avatar}
          : require("../assets/avatar_default.png")
        }
        style={styles.avatar}
      />

      {/* מידע */}
      <View
        style={[
          styles.infoBox,
          { backgroundColor: colors.userDetailsCard, shadowColor: colors.shadow },
        ]}
      >
        {/* שם משתמש */}
        <Text style={[styles.name, { color: colors.text }]}>
          {userData.name || "משתמש"}
        </Text>

        {/* אימייל */}
        <Text style={[styles.email, { color: colors.textSecondary }]}>
          {userData.email}
        </Text>

        <Text style={[styles.idText, { color: colors.textSecondary }]}>
          ID:  {userData.uniqueCode}
        </Text>

        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.buttonPrimary }]}
          onPress={() => navigation.navigate("EditProfil")}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            עריכת פרופיל
          </Text>
        </TouchableOpacity>


        {/* כפתור יציאה */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.buttonDanger }]} onPress={logOut}>
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            יציאה
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// סגנונות
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 40,
    padding: 20,
  },
  title: {
    fontSize: 38,
    fontWeight: "bold",
    marginBottom: 50,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
  },
  email: {
    fontSize: 16,
    marginTop: 2,
  },
  idText: {
    fontSize: 14,
    marginVertical: 10,
  },
  infoBox: {
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    width: "90%",
    alignItems: "center",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 10,
  },
  editButton: {
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
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
  },
});


export default Profil;

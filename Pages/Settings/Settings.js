import React from "react";
import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";

function Settings() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  // רשימת ההגדרות – ככה לא צריך לחזור על אותו קוד חמש פעמים
  const settingsOptions = [
    { title: "הגדרות כלליות", screen: "General" },
    { title: "התראות", screen: "Notification" },
    { title: "פרטיות", screen: "Private" },
    { title: "עזרה", screen: "Help" },
    { title: "מחיקת משתמש", screen: "DeleteAccount" },
  ];

  return (
    <View
      style={[styles.container, { backgroundColor: colors.settingsBackground }]}
    >
      {settingsOptions.map((item) => (
        <TouchableOpacity
          key={item.screen}
          style={[
            styles.button,
            { backgroundColor: colors.settingsButtonBackground },
          ]}
          onPress={() => navigation.navigate(item.screen)}
        >
          <Text style={[styles.text, { color: colors.settingsButtonText }]}>
            {item.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  button: {
    width: "100%",
    padding: 18,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
    alignItems: "center",
  },
  text: {
    fontSize: 18,
    fontWeight: "600",
  },
});

export default Settings;

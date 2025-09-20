import React from "react";
import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";

function Settings() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.settingsBackground }]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.settingsButtonBackground },
        ]}
        onPress={() => navigation.navigate("General")}
      >
        <Text style={[styles.text, { color: colors.settingsButtonText }]}>
          הגדרות כלליות
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.settingsButtonBackground },
        ]}
        onPress={() => navigation.navigate("Notification")}
      >
        <Text style={[styles.text, { color: colors.settingsButtonText }]}>
          התראות
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.settingsButtonBackground },
        ]}
        onPress={() => navigation.navigate("Private")}
      >
        <Text style={[styles.text, { color: colors.settingsButtonText }]}>
          פרטיות
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.settingsButtonBackground },
        ]}
        onPress={() => navigation.navigate("Help")}
      >
        <Text style={[styles.text, { color: colors.settingsButtonText }]}>
          עזרה
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.settingsButtonBackground },
        ]}
        onPress={() => navigation.navigate("DeleteAccount")}
      >
        <Text style={[styles.text, { color: colors.settingsButtonText }]}>
          למחוק משתמש
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    width: "80%",
    padding: 20,
    marginVertical: 10,
    borderRadius: 15,
    elevation: 3,
  },
  text: {
    fontSize: 18,
    fontWeight: "600",
  },
});

export default Settings;

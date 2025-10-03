import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import Constants from "expo-constants";
import { useTheme } from "@react-navigation/native";

function Help() {
  const { colors } = useTheme();

  const appVersion =
    Constants.expoConfig?.version ||
    Constants.manifest?.version ||
    Constants.nativeAppVersion ||
    "לא ידוע";

  const buildNumber = Constants.nativeBuildVersion || "N/A";

  const contactSupport = async () => {
    try {
      await Linking.openURL("mailto:support@unibudget.app");
    } catch (error) {
      Alert.alert("שגיאה", "לא הצלחנו לפתוח את תוכנת המייל שלך.");
      console.error(error)
    }
  };

  // שאלות ותשובות נפוצות
  const faqs = [
    {
      q: "איך יוצרים קבוצה חדשה?",
      a: 'במסך "קבוצות" לוחצים על "+" וממלאים שם קבוצה וחברים.',
    },
    {
      q: "איך מוסיפים הוצאה?",
      a: 'בתוך הקבוצה לוחצים על "+" → הוצאה, ואז ממלאים סכום ותיאור.',
    },
    {
      q: "איך משנים תקציב קבוצה?",
      a: 'במסך תקציב לוחצים על "עריכת תקציב" ומזינים ערך חדש.',
    },
  ];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.helpBackground }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={[styles.title, { color: colors.helpTitle }]}>עזרה</Text>

      <Text style={[styles.subtitle, { color: colors.helpSubtitle }]}>
        שאלות נפוצות
      </Text>

      {faqs.map((item, index) => (
        <View
          key={index}
          style={[
            styles.card,
            {
              backgroundColor: colors.helpCardBackground,
              shadowColor: colors.helpCardShadow,
            },
          ]}
        >
          <Text style={[styles.q, { color: colors.helpQuestion }]}>
            {item.q}
          </Text>
          <Text style={[styles.a, { color: colors.helpAnswer }]}>{item.a}</Text>
        </View>
      ))}

      <TouchableOpacity
        style={[
          styles.supportButton,
          { backgroundColor: colors.helpSupportButtonBackground },
        ]}
        onPress={contactSupport}
      >
        <Text
          style={[
            styles.supportButtonText,
            { color: colors.helpSupportButtonText },
          ]}
        >
          צור קשר עם התמיכה
        </Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: colors.helpVersion }]}>
        גרסה: {appVersion} (Build {buildNumber})
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    marginTop: 40,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 15,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  q: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  a: {
    fontSize: 14,
    lineHeight: 20,
  },
  supportButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 25,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  supportButtonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  version: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
  },
});

export default Help;

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import Constants from "expo-constants";
import { useTheme } from "@react-navigation/native";

function Help() {
  const { colors } = useTheme();

  const contactSupport = () => {
    Linking.openURL("mailto:support@unibudget.app"); // כתובת מייל לא אמיתית
  };

  const appVersion =
    Constants.expoConfig?.version ||
    Constants.manifest?.version ||
    Constants.nativeAppVersion ||
    "לא ידוע";

  const buildNumber = Constants.nativeBuildVersion || "N/A";

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.helpBackground }]}
    >
      <Text style={[styles.title, { color: colors.helpTitle }]}>עזרה</Text>

      {/* שאלות */}
      <Text style={[styles.subtitle, { color: colors.helpSubtitle }]}>
        שאלות נפוצות (FAQ)
      </Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.helpCardBackground,
            shadowColor: colors.helpCardShadow,
          },
        ]}
      >
        <Text style={[styles.q, { color: colors.helpQuestion }]}>
          איך מוסיפים קבוצה?
        </Text>
        <Text style={[styles.a, { color: colors.helpAnswer }]}>
          במסך "קבוצות" לחצו על + והוסיפו שם קבוצה וחברים.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.helpCardBackground,
            shadowColor: colors.helpCardShadow,
          },
        ]}
      >
        <Text style={[styles.q, { color: colors.helpQuestion }]}>
          איך מוסיפים הוצאה?
        </Text>
        <Text style={[styles.a, { color: colors.helpAnswer }]}>
          בתוך קבוצה לחצו על כפתור + הוצאה, הזינו סכום ותיאור.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.helpCardBackground,
            shadowColor: colors.helpCardShadow,
          },
        ]}
      >
        <Text style={[styles.q, { color: colors.helpQuestion }]}>
          איך משנים תקציב?
        </Text>
        <Text style={[styles.a, { color: colors.helpAnswer }]}>
          במסך תקציב הקבוצה לחצו על עריכת תקציב והזינו ערך חדש.
        </Text>
      </View>

      {/* צור קשר */}
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

      {/* גרסה */}
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
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 40,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  card: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  q: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  a: {
    fontSize: 14,
    lineHeight: 20,
  },
  supportButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 20,
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
    marginTop: 30,
    fontSize: 14,
  },
});

export default Help;

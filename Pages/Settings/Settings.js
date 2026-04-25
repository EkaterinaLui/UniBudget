import { useNavigation, useTheme } from "@react-navigation/native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// דף ההגדרות של האפליקציה שמציג אפשרויות שונות לניווט למסכים אחרים
function Settings() {
  // שימוש בניווט כדי לנווט בין המסכים השונים של ההגדרות
  const navigation = useNavigation();
  // שימוש בתמות של הניווט כדי לקבל את הצבעים הנוכחיים של האפליקציה ולהתאים את העיצוב בהתאם
  const { colors } = useTheme();

  // רשימת ההגדרות
  // כל פריט ברשימה מכיל כותרת ושם המסך שאליו ינווט בעת לחיצה
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

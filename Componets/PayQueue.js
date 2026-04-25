import { useTheme } from "@react-navigation/native";
import { Alert, StyleSheet, Text, TouchableOpacity } from "react-native";

// קומפוננטה שמחשבת ומציגה מי המשתמש הבא בתור לשלם על סמך ההוצאות של כל המשתמשים בקבוצה
const PayQueue = ({ membersData, expenses, allUsers }) => {
  const { colors } = useTheme();

  // פונקציה שמחשבת מי המשתמש הבא בתור לשלם על סמך ההוצאות של כל המשתמשים
  const press = () => {
    // אם אין מספיק חברים בקבוצה, לא ניתן לקבוע מי הבא בתור לשלם
    if (!membersData || membersData.length < 2) {
      Alert.alert("חוסר נתונים", "צריך לפחות שני חברים בקבוצה.");
      return;
    }
    // אם אין הוצאות בכלל, לא ניתן לקבוע מי הבא בתור לשלם
    if (!expenses || expenses.length === 0) {
      Alert.alert("חוסר נתונים", "אין הוצאות בקבוצה.");
      return;
    }

    // סכום הוצאות לכל משתמש
    // יוצרים מערך של אובייקטים עם מזהה המשתמש וסכום ההוצאות שלו
    const totals = membersData.map((member) => {
      const memberId = member.uid || member;
      // חישוב סכום ההוצאות של המשתמש הזה על ידי סינון ההוצאות לפי מזהה המשתמש וסכימת הסכומים
      const spent = expenses
        .filter((e) => e.userId === memberId)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      return { id: memberId, spent };
    });
    // אם יש פחות משני משתמשים עם הוצאות, לא ניתן לקבוע מי הבא בתור לשלם
    if (totals.length < 2) {
      Alert.alert("חוסר נתונים", "לא מספיק נתונים לחישוב.");
      return;
    }

    // מי שילם הכי פחות
    let nextPayer = totals[0];
    // עוברים על כל המשתמשים עם ההוצאות שלהם ומוצאים את זה שהוציא הכי פחות
    totals.forEach((user) => {
      if (user.spent < nextPayer.spent) {
        nextPayer = user;
      }
    });
    // מוצאים את שם המשתמש הבא בתור לשלם על סמך מזהה המשתמש שלו
    const name = allUsers[nextPayer.id] || "משתמש לא ידוע";
    // מציגים התראה עם שם המשתמש הבא בתור לשלם
    Alert.alert("תור לתשלום", `המשתמש הבא בתור לשלם הוא: ${name}`);
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.buttonSecondary }]}
      onPress={press}
    >
      <Text style={[styles.buttonText, { color: colors.buttonText }]}>
        תור לתשלום
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default PayQueue;

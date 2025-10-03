import React from "react";
import { TouchableOpacity, Text, Alert, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";

const PayQueue = ({ membersData, expenses, allUsers }) => {
  const { colors } = useTheme();

  const handlePress = () => {
    if (!membersData || membersData.length < 2) {
      Alert.alert("חוסר נתונים", "צריך לפחות שני חברים בקבוצה.");
      return;
    }

    if (!expenses || expenses.length === 0) {
      Alert.alert("חוסר נתונים", "אין הוצאות בקבוצה.");
      return;
    }

    // סכום הוצאות לכל משתמש
    const totals = membersData.map((member) => {
      const memberId = member.uid || member;
      const spent = expenses
        .filter((e) => e.userId === memberId)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      return { id: memberId, spent };
    });

    if (totals.length < 2) {
      Alert.alert("חוסר נתונים", "לא מספיק נתונים לחישוב.");
      return;
    }

    // מי שילם הכי פחות
    let nextPayer = totals[0];
    totals.forEach((user) => {
      if (user.spent < nextPayer.spent) {
        nextPayer = user;
      }
    });

    const name = allUsers[nextPayer.id] || "משתמש לא ידוע";

    Alert.alert("תור לתשלום", `המשתמש הבא בתור לשלם הוא: ${name}`);
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.buttonSecondary }]}
      onPress={handlePress}
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

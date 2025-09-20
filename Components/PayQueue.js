import React from "react";
import { TouchableOpacity, Text, Alert, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";

const PayQueue = ({ membersData, expenses, allUsers }) => {
  const { colors } = useTheme();

  const handlePress = () => {
    if (!membersData || membersData.length === 0) {
      Alert.alert("אין משתמשים בקבוצה");
      return;
    }

    // חישוב סה"כ הוצאות של כל משתמש
    const totals = membersData.map((memberId) => {
      const spent = expenses
        .filter((e) => e.userId === memberId)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      return { id: memberId, spent };
    });

    // המשתמש עם הכי מעט הוצאות => זה שתורו לשלם
    const nextPayer = totals.reduce((min, user) =>
      user.spent < min.spent ? user : min
    );

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
  buttonText: { fontSize: 16, fontWeight: "bold" },
});

export default PayQueue;

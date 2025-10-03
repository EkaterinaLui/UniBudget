import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme, useNavigation } from "@react-navigation/native";
import { useCurrency } from "../../Utilities/Currency";

const DebtSum = ({ groupId, userId, membersData, expenses }) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const formatCurrency = useCurrency();

  const [myDebt, setMyDebt] = useState(0);
  const [myCredit, setMyCredit] = useState(0);

  useEffect(() => {
    if (!expenses || !membersData || membersData.length === 0) return;

    // סה״כ הוצאות
    let total = 0;
    expenses.forEach((e) => {
      total += e.amount || 0;
    });

    // חלק שווה לכל משתמש
    const share = total / membersData.length;

    // כמה כל אחד הוציא
    let spentMap = {};
    membersData.forEach((m) => {
      spentMap[m.uid] = 0;
    });

    expenses.forEach((e) => {
      spentMap[e.userId] = (spentMap[e.userId] || 0) + (e.amount || 0);
    });

    // כמה המשתמש הספציפי חייב או צריך לקבל
    const myBalance = (spentMap[userId] || 0) - share;

    if (myBalance < 0) {
      setMyDebt(Math.abs(myBalance));
      setMyCredit(0);
    } else {
      setMyDebt(0);
      setMyCredit(myBalance);
    }
  }, [expenses, membersData, userId]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("DebtDetails", {
            groupId,
            userId,
            membersData,
            expenses,
          })
        }
      >
        <Text style={[styles.title, { color: colors.text }]}>מצב החובות שלך</Text>
        <Text style={{ color: myDebt > 0 ? colors.danger : colors.text }}>
          יש לך חוב: {formatCurrency(myDebt)}
        </Text>
        <Text style={{ color: myCredit > 0 ? colors.success : colors.text }}>
          חייבים לך: {formatCurrency(myCredit)}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginVertical: 15,
    padding: 20,
    borderRadius: 12,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  title: { 
    fontWeight: "bold", 
    fontSize: 16,
     marginBottom: 10
    },
});

export default DebtSum;

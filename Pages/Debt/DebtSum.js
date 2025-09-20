import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme, useNavigation } from "@react-navigation/native";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { currency } from "../../Utilities/Currency";

const DebtSum = ({ groupId, userId, membersData, expenses, allUsers }) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [debts, setDebts] = useState({ toPay: 0, toReceive: 0 });
  const formatCurrency = currency();
  const [settledDebts, setSettledDebts] = useState([]);

  // מאזין למסמכי חובות שנסגרו
  useEffect(() => {
    if (!groupId) return;
    const ref = collection(db, "groups", groupId, "settledDebts");
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSettledDebts(data);
    });
    return unsub;
  }, [groupId]);

  // מחשב את מצב החובות
  useEffect(() => {
    if (!expenses?.length || !membersData?.length) return;

    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const share = total / membersData.length;

    let balances = {};
    membersData.forEach((m) => {
      const id = m.uid || m;
      balances[id] = 0;
    });

    expenses.forEach((e) => {
      balances[e.userId] = (balances[e.userId] || 0) + (e.amount || 0);
    });

    // הפחתת חלק שווה מכל אחד
    Object.keys(balances).forEach((id) => {
      balances[id] -= share;
    });

    // עדכון לפי חובות שנסגרו
    settledDebts.forEach((s) => {
      balances[s.fromUser] += s.amount; // החייב שילם
      balances[s.toUser] -= s.amount;   // הנושה קיבל
    });

    const myBalance = balances[userId] || 0;

    if (myBalance >= 0) {
      setDebts({ toPay: 0, toReceive: myBalance });
    } else {
      setDebts({ toPay: Math.abs(myBalance), toReceive: 0 });
    }
  }, [expenses, membersData, userId, settledDebts]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("DebtDetails", {
            groupId,
            userId,
            membersData,
            expenses,
            allUsers,
          })
        }
      >
        <Text style={[styles.title, { color: colors.text }]}>
          מצב החובות שלך
        </Text>
        <Text style={{ color: debts.toPay > 0 ? colors.danger : colors.text }}>
          יש לך חוב: {formatCurrency(debts.toPay)} 
        </Text>
        <Text
          style={{ color: debts.toReceive > 0 ? colors.success : colors.text }}
        >
          חייבים לך: {formatCurrency(debts.toReceive)} 
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
  title: { fontWeight: "bold", fontSize: 16, marginBottom: 10 },
});

export default DebtSum;

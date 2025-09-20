import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useNavigation, useRoute } from "@react-navigation/native";
import { collection, addDoc, Timestamp, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { currency } from "../../Utilities/Currency";

const DebtDetails = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId, userId, membersData, expenses, allUsers } = route.params;
  const formatCurrency = currency();

  const [relations, setRelations] = useState([]);
  const [settledDebts, setSettledDebts] = useState([]);

  // מאזין למסמכי חובות שנסגרו
  useEffect(() => {
    const ref = collection(db, "groups", groupId, "settledDebts");
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSettledDebts(data);
    });
    return unsub;
  }, [groupId]);

  // חישוב יחסי חוב
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

    // הפחתת חלק שווה
    Object.keys(balances).forEach((id) => {
      balances[id] -= share;
    });

    // עדכון לפי חובות סגורים
    settledDebts.forEach((s) => {
      balances[s.fromUser] += s.amount;
      balances[s.toUser] -= s.amount;
    });

    const myB = balances[userId] || 0;
    let tempRelations = [];

    membersData.forEach((m) => {
      const id = m.uid || m;
      if (id === userId) return;

      if (myB < 0 && balances[id] > 0) {
        const amount = Math.min(Math.abs(myB), balances[id]);
        if (amount > 0) {
          tempRelations.push({
            type: "owe",
            to: id,
            name: allUsers?.[id] || "משתמש",
            amount,
          });
        }
      } else if (myB > 0 && balances[id] < 0) {
        const amount = Math.min(myB, Math.abs(balances[id]));
        if (amount > 0) {
          tempRelations.push({
            type: "get",
            from: id,
            name: allUsers?.[id] || "משתמש",
            amount,
          });
        }
      }
    });

    setRelations(tempRelations);
  }, [expenses, membersData, allUsers, userId, settledDebts]);

  // סגירת חוב יחיד
  const closeSingleDebt = async (debt) => {
    try {
      await addDoc(collection(db, "groups", groupId, "settledDebts"), {
        fromUser: userId,
        toUser: debt.to,
        amount: debt.amount,
        settledAt: Timestamp.now(),
      });

      Alert.alert("הצלחה", `החוב ל־${debt.name} נסגר `);
    } catch (error) {
      console.error("Error closing debt:", error);
      Alert.alert("שגיאה", "סגירת החוב נכשלה");
    }
  };

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Ionicons
        name={item.type === "owe" ? "arrow-redo" : "arrow-undo"}
        size={20}
        color={item.type === "owe" ? colors.danger : colors.success}
      />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={[styles.text, { color: colors.text }]}>
          {item.type === "owe"
            ? `יש חוב ל־${item.name}: ${formatCurrency(item.amount)} `
            : `${item.name} חייב לך: ${formatCurrency(item.amount)}`}
        </Text>

        {item.type === "owe" && (
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.danger }]}
            onPress={() => closeSingleDebt(item)}
          >
            <Text style={styles.closeButtonText}>סגור חוב</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* כפתור חזור */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.text }]}>מצב החובות שלך</Text>

      <FlatList
        data={relations}
        renderItem={renderItem}
        keyExtractor={(_, index) => index.toString()}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: colors.secondary }}>אין חובות פתוחים </Text>
          </View>
        }
        contentContainerStyle={{ padding: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  backButton: { marginTop: 50, marginLeft: 20 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 15,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
  },
  text: { fontSize: 16, marginBottom: 10 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  closeButton: {
    width: "90%",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5,
    alignSelf: "flex-start",
  },
  closeButtonText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
});

export default DebtDetails;

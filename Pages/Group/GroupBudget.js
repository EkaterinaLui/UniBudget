import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";
import { doc, onSnapshot, updateDoc, collection } from "firebase/firestore";
import { currency } from "../../Utilities/Currency";

const GroupBudget = () => {
  const route = useRoute();
  const { groupId, userId } = route.params;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const formatCurrency = currency();

  const [groupData, setGroupData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newBudget, setNewBudget] = useState("0");
  const [promptVisible, setPromptVisible] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!groupId) return;

    const groupRef = doc(db, "groups", groupId);
    const expensesRef = collection(db, "groups", groupId, "expenses");
    const categoriesRef = collection(db, "groups", groupId, "categories");

    const unsubGroup = onSnapshot(groupRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGroupData(data);
        setIsAdmin(data.adminIds?.includes(userId));
        setNewBudget(data.totalBudget ? String(data.totalBudget) : "0");
      }
    });

    const unsubExpenses = onSnapshot(expensesRef, (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setExpenses(data);
    });

    const unsubCategories = onSnapshot(categoriesRef, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(data);
    });

    return () => {
      unsubGroup();
      unsubExpenses();
      unsubCategories();
    };
  }, [groupId, userId]);

  const spentAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const remainingBudget = (groupData?.totalBudget || 0) - spentAmount;
  const totalBudget = groupData?.totalBudget || 0;

  const handleUpdateBudget = () => {
    if (!isAdmin) {
      Alert.alert("שגיאה", "רק מנהל יכול לשנות תקציב.");
      return;
    }
    setPromptVisible(true);
  };

  const handleSaveBudget = async (value) => {
    const parsedBudget = parseFloat(value);
    if (isNaN(parsedBudget) || parsedBudget < 0) {
      Alert.alert("שגיאה", "אנא הזן מספר תקין.");
      return;
    }

    const categoriesSum = categories.reduce(
      (sum, cat) => sum + (cat.budget || 0),
      0
    );
    console.log("Budget: ", parsedBudget);
    console.log("categories Sum: ", categoriesSum);
    if (parsedBudget < categoriesSum) {
      Alert.alert(
        "שגיאה",
        `התקציב הכולל חייב להיות גדול או שווה לסכום התקציבים של כל הקטגוריות. (סכום קטגוריות: ${formatCurrency(
          categoriesSum.toFixed(2)
        )})`
      );
      return;
    }

    try {
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, { totalBudget: parsedBudget });
      Alert.alert("הצלחה", "התקציב עודכן!");
    } catch (err) {
      console.error("Error updating budget: ", err);
      Alert.alert("שגיאה", "עדכון התקציב נכשל");
    }
    setPromptVisible(false);
  };

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.backButton,
          {
            top: insets.top + 10,
            backgroundColor: colors.card,
            shadowColor: colors.shadow,
          },
        ]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <ScrollView>
        <Text style={[styles.title, { color: colors.text }]}>
          מידע על הוצאות ותקציב
        </Text>

        <View
          style={[
            styles.budgetCard,
            { backgroundColor: colors.cardBackground },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            התקציב הנוכחי של הקבוצה
          </Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>
            תקציב: {formatCurrency(totalBudget)}
          </Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>
            בוזבז: {formatCurrency(spentAmount)} 
          </Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>
            נשאר: {formatCurrency(remainingBudget)} 
          </Text>
        </View>

        {isAdmin && (
          <View
            style={[
              styles.budgetControlContainer,
              { backgroundColor: colors.buttonPromary },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.setBudgetButton,
                { backgroundColor: colors.saveBudgetButton },
              ]}
              onPress={handleUpdateBudget}
            >
              <Ionicons name="wallet-outline" size={20} color="#fff" />
              <Text
                style={[
                  styles.setBudgetButtonText,
                  { color: colors.buttonText },
                ]}
              >
                הגדרת תקציב
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          כל ההוצאות
        </Text>
        <View style={styles.expensesList}>
          {expenses.map((expense) => (
            <View
              key={expense.id}
              style={[
                styles.expenseItem,
                {
                  backgroundColor: colors.expenseBackground,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <Text style={[styles.expenseText, { color: colors.text }]}>
                {groupData?.members.find((m) => m.uid === expense.userId)
                  ?.name || "משתמש"}
              </Text>
              <Text style={[styles.expenseText, { color: colors.text }]}>
                {expense.description}
              </Text>
              <Text style={[styles.expenseAmount, { color: colors.text }]}>
                {formatCurrency(expense.amount)} 
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={promptVisible}
        animationType="fade"
        onRequestClose={() => setPromptVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              הזן תקציב חדש
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  borderColor: colors.modalInputBorder,
                  color: colors.text,
                },
              ]}
              value={newBudget}
              onChangeText={setNewBudget}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setPromptVisible(false)}
              >
                <Text style={{ color: colors.buttonText }}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.buttonPrimary },
                ]}
                onPress={() => handleSaveBudget(newBudget)}
              >
                <Text style={{ color: colors.buttonText }}>שמור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0f2f5" },
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 50,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginTop: 50,
    marginBottom: 20,
  },
  budgetCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  cardValue: {
    fontSize: 16,
    color: "#666",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  budgetControlContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  setBudgetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6acce4",
    padding: 15,
    borderRadius: 10,
    width: "100%",
  },
  setBudgetButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 10,
  },
  expensesList: {
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  expenseText: {
    fontSize: 14,
    color: "#333",
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },

  // --- modal styles ---
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
});

export default GroupBudget;

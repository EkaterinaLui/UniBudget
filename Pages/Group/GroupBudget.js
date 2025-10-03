import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";
import { useCurrency } from "../../Utilities/Currency";

const GroupBudget = () => {
  const route = useRoute();
  const { groupId, userId } = route.params || {};
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const formatCurrency = useCurrency();

  const [groupData, setGroupData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newBudget, setNewBudget] = useState("");
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
        setNewBudget(data.totalBudget ? String(data.totalBudget) : "");
      }
    });

    const unsubExpenses = onSnapshot(expensesRef, (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setExpenses(data);
    });

    const unsubCategories = onSnapshot(categoriesRef, (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCategories(data);
    });

    return () => {
      unsubGroup();
      unsubExpenses();
      unsubCategories();
    };
  }, [groupId, userId]);

  const spentAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalBudget = groupData?.totalBudget || 0;
  const remainingBudget = totalBudget - spentAmount;

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
      Alert.alert("שגיאה", "נא להזין מספר תקין.");
      return;
    }

    const categoriesSum = categories.reduce(
      (sum, cat) => sum + (cat.budget || 0),
      0
    );
    if (parsedBudget < categoriesSum) {
      Alert.alert(
        "שגיאה",
        `התקציב הכולל חייב להיות לפחות ${formatCurrency(
          categoriesSum.toFixed(2)
        )}, 
          כי זה סכום התקציבים של כל הקטגוריות.`
      );
      return;
    }

    try {
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, { totalBudget: parsedBudget });
      Alert.alert("הצלחה", "התקציב עודכן בהצלחה!");
    } catch (err) {
      console.error("שגיאה בעדכון תקציב:", err);
      Alert.alert("שגיאה", "עדכון התקציב נכשל.");
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
      {/* כפתור חזור */}
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
        <Ionicons name="arrow-forward" size={24} color={colors.text} />
      </TouchableOpacity>

      <ScrollView>
        <Text style={[styles.title, { color: colors.text }]}>
          ניהול תקציב והוצאות
        </Text>

        {/* כרטיס מידע */}
        <View
          style={[
            styles.budgetCard,
            { backgroundColor: colors.cardBackground },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            סיכום התקציב
          </Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>
            תקציב כולל: {formatCurrency(totalBudget)}
          </Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>
            הוצאות: {formatCurrency(spentAmount)}
          </Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>
            נשאר: {formatCurrency(remainingBudget)}
          </Text>
        </View>

        {/* כפתור ניהול תקציב */}
        {isAdmin && (
          <View style={styles.budgetControlContainer}>
            <TouchableOpacity
              style={[
                styles.setBudgetButton,
                { backgroundColor: colors.buttonPrimary },
              ]}
              onPress={handleUpdateBudget}
            >
              <Ionicons name="wallet-outline" size={20} color="#fff" />
              <Text style={[styles.setBudgetButtonText, { color: "#fff" }]}>
                עריכת תקציב
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* רשימת הוצאות */}
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

      {/*  עדכון תקציב */}
      <Modal
        transparent
        visible={promptVisible}
        animationType="fade"
        onRequestClose={() => setPromptVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modalContent, { backgroundColor: colors.card }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                הזן תקציב חדש
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { borderColor: colors.modalInputBorder, color: colors.text },
                ]}
                value={newBudget}
                onChangeText={setNewBudget}
                keyboardType="numeric"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    { backgroundColor: colors.border },
                  ]}
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
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    borderRadius: 50,
    padding: 8,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 50,
    marginBottom: 20,
  },
  budgetCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "right",
  },
  cardValue: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    paddingHorizontal: 20,
    marginBottom: 10,
    textAlign: "right",
  },

  budgetControlContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  setBudgetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
  },
  setBudgetButtonText: {
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
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  expenseText: {
    fontSize: 14,
    textAlign: "right",
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)", 
    width: "100%",
    height: "100%",
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    width: "100%",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
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

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
  const [budgetMode, setBudgetMode] = useState("total");
  const [memberBudgets, setMemberBudgets] = useState([]);

  const isFamilyGroup = groupData?.type === "family";

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

        // שמירת תקציב כללי משותף
        setNewBudget(data.totalBudget ? String(data.totalBudget) : "");

        // תקציב לפי משתמש – רק לקבוצות מסוג משפחה
        if (data.type === "family" && data.memberBudgets) {
          setBudgetMode("perMember");
          const arr = [];

          if (data.members) {
            for (let i = 0; i < data.members.length; i++) {
              const m = data.members[i];
              const value = data.memberBudgets[m.uid];

              if (value !== undefined && value !== null) {
                arr.push(String(value));
              } else {
                arr.push("");
              }
            }
          }

          setMemberBudgets(arr);
        } else {
          setBudgetMode("total");
          setMemberBudgets([]);
        }
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

  // מזהים קטגוריות מיוחדות
  const temporaryCategoryIds = new Set(
    (categories || []).filter((c) => c.isTemporary === true).map((c) => c.id)
  );

  // הוצאות רגילות
  const regularBudgetExpenses = (expenses || []).filter(
    (e) => !temporaryCategoryIds.has(e.categoryId)
  );

  // הוצאות מיוחדות
  const specialBudgetExpenses = (expenses || []).filter((e) =>
    temporaryCategoryIds.has(e.categoryId)
  );

  // סכומים
  const spentRegular = regularBudgetExpenses.reduce(
    (sum, e) => sum + (e.amount || 0),
    0
  );
  const spentSpecial = specialBudgetExpenses.reduce(
    (sum, e) => sum + (e.amount || 0),
    0
  );
  const spentTotal = (expenses || []).reduce(
    (sum, e) => sum + (e.amount || 0),
    0
  );

  const totalBudget = groupData?.totalBudget || 0;
  const remainingBudget = totalBudget - spentRegular; // חשוב: נשאר מהתקציב החודשי רק לפי רגיל

  const updateBudget = () => {
    if (!isAdmin) {
      Alert.alert("שגיאה", "רק מנהל יכול לשנות תקציב.");
      return;
    }
    setPromptVisible(true);
  };

  const saveBudget = async () => {
    if (!groupId) return;

    const groupRef = doc(db, "groups", groupId);

    const categoriesSum = categories
      .filter((cat) => cat.isTemporary !== true)
      .reduce((sum, cat) => sum + (cat.budget || 0), 0);

    // בדיקה שזה קבוצה מסוג משפחה
    if (budgetMode === "perMember" && !isFamilyGroup) {
      Alert.alert("שגיאה", "תקציב לפי משתמש זמין רק לקבוצות משפחתיות.");
      return;
    }

    // תקציב כללי
    if (budgetMode === "total" || !isFamilyGroup) {
      const parsedBudget = parseFloat(newBudget);
      if (isNaN(parsedBudget) || parsedBudget < 0) {
        Alert.alert("שגיאה", "נא להזין מספר תקין.");
        return;
      }
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
        await updateDoc(groupRef, {
          totalBudget: parsedBudget,
          memberBudgets: {}, // מנקים תקציב כללי
        });
        Alert.alert("הצלחה", "התקציב עודכן בהצלחה!");
      } catch (error) {
        console.log("שגיאה בעדכון תקציב:", error);
        Alert.alert("שגיאה", "עדכון התקציב נכשל.");
      }

      setPromptVisible(false);
      return;
    }

    // תקציב לפי משתמש (רק family)
    if (!groupData || !groupData.members || groupData.members.length === 0) {
      Alert.alert("שגיאה", "אין משתמשים בקבוצה.");
      return;
    }

    const budgets = {};
    let totalMemBud = 0;

    for (let i = 0; i < groupData.members.length; i++) {
      const member = groupData.members[i];
      const tValue = memberBudgets[i] || 0;
      const num = parseFloat(tValue);

      if (isNaN(num) || num < 0) {
        Alert.alert(
          "שגיאה",
          `נא להזין תקציב תקין עבור ${member.name || "משתמש"}.`
        );
        return;
      }

      budgets[member.uid] = num;
      totalMemBud = totalMemBud + num;
    }

    if (totalMemBud <= 0) {
      Alert.alert("שגיאה", "סך התקציבים למשתמשים חייב להיות גדול מאפס.");
      return;
    }

    if (totalMemBud < categoriesSum) {
      Alert.alert(
        "שגיאה",
        `סך התקציבים למשתמשים חייב להיות לפחות ${formatCurrency(
          categoriesSum.toFixed(2)
        )}, 
        כי זה סכום התקציבים של כל הקטגוריות.`
      );
      return;
    }

    try {
      await updateDoc(groupRef, {
        totalBudget: totalMemBud,
        memberBudgets: budgets,
      });
      Alert.alert("הצלחה", "התקציב לפי משתמש עודכן בהצלחה!");
    } catch (err) {
      console.log("שגיאה בעדכון תקציב לפי משתמש:", err);
      Alert.alert("שגיאה", "עדכון התקציב לפי משתמש נכשל.");
    }

    setPromptVisible(false);
  };

  const changeMemBud = (index, text) => {
    setMemberBudgets((prev) => {
      const newArr = [...prev];
      newArr[index] = text;
      return newArr;
    });
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
            תקציב חודשי כולל: {formatCurrency(totalBudget)}
          </Text>

          <Text style={[styles.cardValue, { color: colors.text }]}>
            הוצאות תקציב חודשי :{" "}
            {formatCurrency(spentRegular)}
          </Text>

          <Text style={[styles.cardValue, { color: colors.text }]}>
            הוצאות תקציבים מיוחדים: {formatCurrency(spentSpecial)}
          </Text>

          <Text
            style={[
              styles.cardValue,
              { color: colors.text, fontWeight: "bold" },
            ]}
          >
            סה״כ כל ההוצאות (כולל מיוחדים): {formatCurrency(spentTotal)}
          </Text>

          <Text style={[styles.cardValue, { color: colors.text }]}>
            יתרה לתקציב החודשי: {formatCurrency(remainingBudget)}
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
              onPress={updateBudget}
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
          הוצאות תקציב חודשי
        </Text>
        <View style={styles.expensesList}>
          {regularBudgetExpenses.map((expense) => (
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          הוצאות תקציבים מיוחדים
        </Text>
        <View style={styles.expensesList}>
          {specialBudgetExpenses.length === 0 ? (
            <Text
              style={[styles.expenseText, { color: colors.text, opacity: 0.7 }]}
            >
              אין הוצאות בקטגוריות מיוחדות החודש.
            </Text>
          ) : (
            specialBudgetExpenses.map((expense) => (
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
            ))
          )}
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
              {/* מחליף בין תקציב כללי לתקציב לפי משתמש*/}
              {isFamilyGroup && (
                <View style={styles.budgetModeSwitcher}>
                  <TouchableOpacity
                    style={[
                      styles.budgetModeButton,
                      budgetMode === "total" && styles.budgetModeButtonActive,
                    ]}
                    onPress={() => setBudgetMode("total")}
                  >
                    <Text
                      style={[
                        styles.budgetModeText,
                        budgetMode === "total" && styles.budgetModeTextActive,
                      ]}
                    >
                      תקציב חודשי כולל
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.budgetModeButton,
                      budgetMode === "perMember" &&
                        styles.budgetModeButtonActive,
                    ]}
                    onPress={() => setBudgetMode("perMember")}
                  >
                    <Text
                      style={[
                        styles.budgetModeText,
                        budgetMode === "perMember" &&
                          styles.budgetModeTextActive,
                      ]}
                    >
                      תקציב לפי משתמש
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* תקציב כללי */}
              {(!isFamilyGroup || budgetMode === "total") && (
                <>
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
                    keyboardType="numeric"
                  />
                </>
              )}

              {/* רק לקבוצה מסוג משפחה*/}
              {isFamilyGroup && budgetMode === "perMember" && (
                <>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    תקציב לכל משתמש
                  </Text>
                  <ScrollView
                    style={{ maxHeight: 250, width: "100%" }}
                    nestedScrollEnabled
                  >
                    {groupData?.members?.map((member, index) => (
                      <View key={member.uid} style={styles.memberBudgetRow}>
                        <Text
                          style={[
                            styles.memberBudgetName,
                            { color: colors.text },
                          ]}
                        >
                          {member.name || "משתמש"}
                        </Text>
                        <TextInput
                          style={[
                            styles.memberBudgetInput,
                            {
                              borderColor: colors.modalInputBorder,
                              color: colors.text,
                            },
                          ]}
                          value={memberBudgets[index] || ""}
                          onChangeText={(text) => changeMemBud(index, text)}
                          keyboardType="numeric"
                        />
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}

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
                  onPress={saveBudget}
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
    textAlign: "left",
  },
  cardValue: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: "left",
    writingDirection: "rtl"
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
    textAlign: "left",
    flex: 1, 
    marginLeft: 7,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "left",
    marginRight: 7,
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
  budgetModeSwitcher: {
    flexDirection: "row",
    marginBottom: 15,
    width: "100%",
  },
  budgetModeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    marginHorizontal: 4,
    alignItems: "center",
  },
  budgetModeButtonActive: {
    backgroundColor: "#0077B6",
    borderColor: "#0077B6",
  },
  budgetModeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  budgetModeTextActive: {
    color: "#fff",
  },

  memberBudgetRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    justifyContent: "space-between",
  },
  memberBudgetName: {
    fontSize: 14,
    flex: 1,
    marginLeft: 10,
  },
  memberBudgetInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    width: 200,
    fontSize: 14,
  },
});

export default GroupBudget;

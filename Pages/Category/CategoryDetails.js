import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";
import { useCurrency } from "../../Utilities/Currency";

const CategoryDetails = () => {
  const { groupId, userId, categoryId } = useRoute().params;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const formatCurrency = useCurrency();

  const [category, setCategory] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newBudget, setNewBudget] = useState("");
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [users, setUsers] = useState({});
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [isRegular, setIsRegular] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!groupId || !categoryId) return;
    // הפניות למסמכים ואוספים הרלוונטיים לקטגוריה, לקבוצה ולהוצאות
    const categoryRef = doc(db, "groups", groupId, "categories", categoryId);
    const groupRef = doc(db, "groups", groupId);
    const expensesRef = collection(db, "groups", groupId, "expenses");
    // מאזינים לקטגוריה, לקבוצה ולהוצאות כדי לקבל עדכונים בזמן אמת
    const unsubCategory = onSnapshot(categoryRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCategory(data);
        setNewBudget(data.budget ? String(data.budget) : "0");
        setIsRegular(data.isRegular || false);
      } else {
        navigation.goBack();
      }
      setLoading(false);
    });
    // מאזין לשינויים בקבוצה כדי לבדוק אם המשתמש הוא מנהל ולקבל את רשימת המשתמשים
    const unsubGroup = onSnapshot(groupRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsAdmin(docSnap.data().adminIds?.includes(userId));
        const members = docSnap.data().members || [];
        const map = {};
        members.forEach((m) => {
          if (m.uid) map[m.uid] = m.name || "משתמש";
        });
        setUsers(map);
      }
    });
    const q = query(
      expensesRef,
      where("categoryId", "==", categoryId),
      orderBy("createdAt", "desc"),
    );
    // מאזין לשינויים בהוצאות של הקטגוריה כדי לעדכן את הרשימה בזמן אמת
    const unsubExpenses = onSnapshot(q, (querySnapshot) => {
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExpenses(list);
    });

    return () => {
      unsubCategory();
      unsubGroup();
      unsubExpenses();
    };
  }, [groupId, categoryId, userId, navigation]);

  // בדיקת תוקף לקטגוריות מיוחדות
  const isExpired =
    category?.isTemporary && category.eventEndDate
      ? (category.eventEndDate.toDate
          ? category.eventEndDate.toDate()
          : category.eventEndDate) <= new Date()
      : false;
  // שמירת תקציב חדש לקטגוריה רגילה
  const saveBudget = async (value) => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert("שגיאה", "אנא הזן מספר תקין.");
      return;
    }
    try {
      const groupSnap = await getDoc(doc(db, "groups", groupId));
      const totalGroupBudget = groupSnap.data().totalBudget || 0;
      // קבלת כל הקטגוריות של הקבוצה כדי לבדוק את סכום התקציבים של שאר הקטגוריות
      const categoriesSnap = await getDocs(
        collection(db, "groups", groupId, "categories"),
      );
      // סכום התקציבים של שאר הקטגוריות (לא כולל זו שמעדכנים)
      const otherSum = categoriesSnap.docs.reduce((sum, doc) => {
        if (doc.data().isTemporary) return sum; // לא סופרים קטגוריות מיוחדות
        if (doc.id !== categoryId) return sum + (doc.data().budget || 0); // סופרים רק קטגוריות רגילות אחרות
        return sum; // לא סופרים את הקטגוריה שמעדכנים
      }, 0);
      // בדיקה אם התקציב החדש יחד עם סכום שאר הקטגוריות חורג מהתקציב הכולל של הקבוצה
      if (otherSum + parsed > totalGroupBudget) {
        Alert.alert("שגיאה", "חורג מהתקציב הכולל של הקבוצה.");
        return;
      }
      // עדכון התקציב במסד הנתונים
      await updateDoc(doc(db, "groups", groupId, "categories", categoryId), {
        budget: parsed,
      });
      // עדכון התקציב במצב המקומי כדי שהמסך יתעדכן מיד
      Alert.alert("הצלחה", "התקציב עודכן בהצלחה");
      setCategory((prev) => ({ ...prev, budget: parsed }));
    } catch (error) {
      console.error("שגיאה בעדכון תקציב:", error);
      Alert.alert("שגיאה", "עדכון התקציב נכשל");
    }
    setShowBudgetModal(false);
  };
  // מחיקת קטגוריה וכל ההוצאות שבתוכה
  const deleteCategory = async () => {
    try {
      const expensesRef = collection(db, "groups", groupId, "expenses");
      const q = query(expensesRef, where("categoryId", "==", categoryId));
      const querySnapshot = await getDocs(q);
      // מחיקת כל ההוצאות של הקטגוריה
      const deletePromises = querySnapshot.docs.map((docSnap) =>
        deleteDoc(docSnap.ref),
      );
      await Promise.all(deletePromises);
      // מחיקת הקטגוריה עצמה
      await deleteDoc(doc(db, "groups", groupId, "categories", categoryId));
      // חזרה למסך הקודם אחרי המחיקה
      Alert.alert("בוצע", "הקטגוריה וכל ההוצאות נמחקו");
    } catch (error) {
      console.error("שגיאה במחיקת קטגוריה:", error);
      Alert.alert("שגיאה", "מחיקת הקטגוריה נכשלה.");
    }
  };
  // מחיקת הוצאה ספציפית (רק למנהלים)
  const deleteExpense = async (id) => {
    if (!isAdmin) {
      Alert.alert("שגיאה", "רק מנהלים יכולים למחוק הוצאות.");
      return;
    }
    try {
      await deleteDoc(doc(db, "groups", groupId, "expenses", id));
      Alert.alert("בוצע", "ההוצאה נמחקה.");
    } catch (error) {
      console.error("שגיאה במחיקת הוצאה:", error);
      Alert.alert("שגיאה", "מחיקת ההוצאה נכשלה.");
    }
  };
  // הצגת מסך טעינה בזמן שהנתונים נטענים מהמסד
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text }}>טוען...</Text>
      </View>
    );
  }
  // אם הקטגוריה לא נמצאה (ייתכן ונמחקה), מציג הודעה מתאימה
  if (!category) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.text }}>הקטגוריה לא נמצאה.</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.categoryDetailsBackground,
          paddingTop: insets.top,
        },
      ]}
    >
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.ordeem, { backgroundColor: colors.card }]}>
            <View>
              <Text style={{ color: colors.text }}>{item.description}</Text>
              <Text style={{ color: colors.textSecondary }}>
                {users[item.userId] || "משתמש"}
              </Text>
            </View>
            <Text style={{ color: colors.primary }}>
              {formatCurrency(item.amount || 0)}
            </Text>
            {isAdmin && (
              <TouchableOpacity onPress={() => deleteExpense(item.id)}>
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.danger}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
        ListHeaderComponent={
          <>
            {/* חזור */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-forward" size={24} color={colors.text} />
            </TouchableOpacity>

            {/* כותרת */}
            <View style={styles.header}>
              <Text
                style={[
                  styles.categoryName,
                  { color: isExpired ? "red" : colors.text },
                ]}
              >
                {category.name}
              </Text>

              {/* קטגוריה רגילה */}
              {!category.isTemporary && (
                <Text style={{ color: colors.textSecondary }}>
                  תקציב נוכחי: {formatCurrency(category.budget || 0)}
                </Text>
              )}

              {/* קטגוריה מיוחדת */}
              {category.isTemporary && (
                <>
                  {category.notes && (
                    <Text style={{ color: colors.textSecondary }}>
                      הערות: {category.notes}
                    </Text>
                  )}
                  {category.eventEndDate && (
                    <Text style={{ color: colors.textSecondary }}>
                      תוקף עד:{" "}
                      {category.eventEndDate.toDate
                        ? category.eventEndDate
                            .toDate()
                            .toLocaleDateString("he-IL")
                        : new Date(category.eventEndDate).toLocaleDateString(
                            "he-IL",
                          )}
                    </Text>
                  )}
                </>
              )}

              {isExpired && (
                <Text style={{ color: colors.danger, fontWeight: "bold" }}>
                  קטגוריה זו פגה תוקף
                </Text>
              )}
            </View>

            {/* הוספת הוצאה */}
            {!isExpired && (
              <View style={styles.addExpenseRow}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.primary, flex: 1 },
                  ]}
                  onPress={() =>
                    navigation.navigate("AddExpense", {
                      groupId,
                      userId,
                      initialCategoryId: categoryId,
                    })
                  }
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={20} color={colors.buttonText} />
                  <Text
                    style={[styles.actionText, { color: colors.buttonText }]}
                  >
                    הוסף הוצאה
                  </Text>
                </TouchableOpacity>

                {/*חץ פותח/מסתיר */}
                {(isAdmin || isExpired) && (
                  <TouchableOpacity
                    style={[
                      styles.chevronButton,
                      {
                        backgroundColor:
                          colors.categoryDetailsCard ?? colors.card,
                      },
                    ]}
                    onPress={() => setShowSettings((p) => !p)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={showSettings ? "chevron-up" : "chevron-down"}
                      size={22}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* כל מה שמתחת לחץ */}
            {showSettings && (
              <View
                style={[styles.settingsBox, { borderColor: colors.border }]}
              >
                {/* עדכון תקציב לקטגוריה רגילה ולא מיוחדת*/}
                {isAdmin && !isExpired && !category.isTemporary && (
                  <TouchableOpacity
                    style={[
                      styles.settingsItem,
                      {
                        backgroundColor: colors.card,
                        shadowColor: colors.shadow,
                      },
                    ]}
                    onPress={() => setShowBudgetModal(true)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.settingsLeft}>
                      <Ionicons
                        name="wallet-outline"
                        size={20}
                        color={colors.text}
                      />
                      <Text
                        style={[styles.settingsText, { color: colors.text }]}
                      >
                        עדכון תקציב
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}

                {/* שמירה לחודשים הבאים */}
                {isAdmin && !isExpired && !category.isTemporary && (
                  <View
                    style={[
                      styles.settingsItem,
                      {
                        backgroundColor: colors.card,
                        shadowColor: colors.shadow,
                      },
                    ]}
                  >
                    <View style={styles.settingsLeft}>
                      <Ionicons
                        name="repeat-outline"
                        size={20}
                        color={colors.text}
                      />
                      <Text
                        style={[styles.settingsText, { color: colors.text }]}
                      >
                        שמור לחודשים הבאים
                      </Text>
                    </View>

                    <Switch
                      value={isRegular}
                      onValueChange={async (val) => {
                        setIsRegular(val);
                        await updateDoc(
                          doc(db, "groups", groupId, "categories", categoryId),
                          { isRegular: val },
                        );
                      }}
                    />
                  </View>
                )}

                {/* מחיקה */}
                {(isAdmin || isExpired) && (
                  <TouchableOpacity
                    style={[
                      styles.settingsItem,
                      {
                        backgroundColor: colors.card,
                        shadowColor: colors.shadow,
                      },
                    ]}
                    onPress={() =>
                      Alert.alert(
                        "מחיקת קטגוריה",
                        "למחוק את הקטגוריה וכל ההוצאות שבתוכה?",
                        [
                          { text: "ביטול", style: "cancel" },
                          {
                            text: "מחק",
                            style: "destructive",
                            onPress: deleteCategory,
                          },
                        ],
                      )
                    }
                    activeOpacity={0.85}
                  >
                    <View style={styles.settingsLeft}>
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={colors.danger}
                      />
                      <Text
                        style={[styles.settingsText, { color: colors.danger }]}
                      >
                        מחק קטגוריה
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* כותרת הוצאות */}
            <View style={styles.expensesSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                הוצאות
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
            אין הוצאות
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* Modal תקציב */}
      <Modal visible={showBudgetModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
              <Text style={{ fontWeight: "bold", color: colors.text }}>
                הזן תקציב חדש
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { borderColor: colors.border, color: colors.text },
                ]}
                value={newBudget}
                onChangeText={setNewBudget}
                keyboardType="numeric"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setShowBudgetModal(false)}>
                  <Text style={{ color: colors.text }}>ביטול</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => saveBudget(newBudget)}>
                  <Text style={{ color: colors.primary }}>שמור</Text>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    margin: 15,
  },
  header: {
    alignItems: "center",
    marginVertical: 20,
  },
  categoryName: {
    fontSize: 26,
    fontWeight: "bold",
  },
  adminSection: {
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 10,
    margin: 10,
  },
  actionText: {
    fontSize: 16,
    marginLeft: 8,
  },
  expensesSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  ordeem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    width: "100%",
    height: "100%",
  },
  modalBox: {
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginVertical: 10,
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
  addExpenseRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    gap: 10,
    marginTop: 10,
  },

  chevronButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },

  settingsBox: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },

  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    elevation: 2,
  },

  settingsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  settingsText: {
    fontSize: 15,
    fontWeight: "600",
  },
});

export default CategoryDetails;

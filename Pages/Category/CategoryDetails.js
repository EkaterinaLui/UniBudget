import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { currency } from "../../Utilities/Currency";

const CategoryDetails = () => {
  const route = useRoute();
  const { groupId, userId, categoryId } = route.params;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const formatCurrency = currency();

  const [categoryData, setCategoryData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newBudget, setNewBudget] = useState("");
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [users, setUsers] = useState({});
  const [promptVisible, setPromptVisible] = useState(false);
  const [isRegular, setIsRegular] = useState(false);

  // משתמשים מתוך הקבוצה
useEffect(() => {
  if (!groupId) return;

  const groupRef = doc(db, "groups", groupId);
  const unsub = onSnapshot(groupRef, (docSnap) => {
    if (docSnap.exists()) {
      const groupData = docSnap.data();
      const members = groupData.members || [];
      const usersMap = {};
      members.forEach((m) => {
        if (m.uid) {
          usersMap[m.uid] = m.name || "משתמש לא ידוע";
        }
      });
      setUsers(usersMap);
    }
  });

  return () => unsub();
}, [groupId]);

  // --- טוען קטגוריה + קבוצה + הוצאות
  useEffect(() => {
    if (!groupId || !categoryId) {
      setLoading(false);
      return;
    }

    const categoryRef = doc(db, "groups", groupId, "categories", categoryId);
    const groupRef = doc(db, "groups", groupId);
    const expensesRef = collection(db, "groups", groupId, "expenses");

    const unsubCategory = onSnapshot(categoryRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCategoryData(data);
        setNewBudget(data.budget ? String(data.budget) : "0");
        setIsRegular(data.isRegular || false);
      } else {
        navigation.goBack();
      }
      setLoading(false);
    });

    const unsubGroup = onSnapshot(groupRef, (docSnap) => {
      if (docSnap.exists()) {
        const groupInfo = docSnap.data();
        setIsAdmin(groupInfo.adminIds?.includes(userId));
      }
    });

    const q = query(expensesRef, where("categoryId", "==", categoryId));
    const unsubExpenses = onSnapshot(q, (querySnapshot) => {
      const expensesList = [];
      querySnapshot.forEach((doc) => {
        expensesList.push({ id: doc.id, ...doc.data() });
      });
      setExpenses(expensesList);
    });

    return () => {
      unsubCategory();
      unsubGroup();
      unsubExpenses();
    };
  }, [groupId, categoryId, userId, navigation]);

  // בדיקת תוקף
  const isExpired =
    categoryData?.istemporary && categoryData.eventEndDate
      ? (categoryData.eventEndDate.toDate
          ? categoryData.eventEndDate.toDate()
          : categoryData.eventEndDate) <= new Date()
      : false;

  // עדכון תקציב
  const saveBudget = async (value) => {
    const parsedBudget = parseFloat(value);
    if (isNaN(parsedBudget) || parsedBudget < 0) {
      Alert.alert("שגיאה", "אנא הזן מספר תקין.");
      return;
    }
    try {
      const groupRef = doc(db, "groups", groupId);
      const groupSnap = await getDoc(groupRef);
      const totalGroupBudget = groupSnap.data().totalBudget || 0;

      const categoriesRef = collection(db, "groups", groupId, "categories");
      const categoriesSnap = await getDocs(categoriesRef);

      const otherCatSum = categoriesSnap.docs.reduce((sum, doc) => {
        if (doc.id !== categoryId) {
          return sum + (doc.data().budget || 0);
        }
        return sum;
      }, 0);

      if (otherCatSum + parsedBudget > totalGroupBudget) {
        Alert.alert(
          "שגיאה",
          "התקציב הכולל של הקטגוריות חורג מהתקציב הכללי של הקבוצה."
        );
        return;
      }

      const categoryRef = doc(db, "groups", groupId, "categories", categoryId);
      await updateDoc(categoryRef, { budget: parsedBudget });
      Alert.alert("הצלחה", "התקציב עודכן!");
      setCategoryData((prev) => ({ ...prev, budget: parsedBudget }));
    } catch (error) {
      console.error("Error updating budget: ", error);
      Alert.alert("שגיאה", "עדכון התקציב נכשל");
    }
    setPromptVisible(false);
  };

  // מחיקת הוצאה
  const deleteExpense = async (expenseId) => {
    if (!isAdmin) {
      Alert.alert("שגיאה", "רק מנהלים יכולים למחוק הוצאות.");
      return;
    }
    try {
      await deleteDoc(doc(db, "groups", groupId, "expenses", expenseId));
      Alert.alert("הצלחה", "ההוצאה נמחקה.");
    } catch (error) {
      console.error("Error deleting expense:", error);
      Alert.alert("שגיאה", "מחיקת ההוצאה נכשלה.");
    }
  };

  const renderExpenseItem = ({ item }) => (
    <View
      style={[
        styles.expenseItem,
        {
          backgroundColor: colors.categoryDetailsCard,
          shadowColor: colors.categoryDetailsShadow,
        },
      ]}
    >
      <View style={styles.expenseInfo}>
        <Text
          style={[
            styles.expenseDescription,
            { color: colors.categoryDetailsTitle },
          ]}
        >
          {item.description}
        </Text>
        <Text
          style={[
            styles.expenseUser,
            { color: colors.categoryDetailsSubtitle },
          ]}
        >
          {users[item.userId] || "משתמש לא ידוע"}
        </Text>
      </View>
      <Text
        style={[
          styles.expenseAmount,
          { color: colors.categoryDetailsExpenseAmount },
        ]}
      >
        {formatCurrency(item.amount || 0)}
      </Text>
      {isAdmin && (
        <TouchableOpacity onPress={() => deleteExpense(item.id)}>
          <Ionicons
            name="trash-outline"
            size={18}
            color={colors.categoryDetailsButtonDanger}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={colors.categoryDetailsButtonPrimary}
        />
        <Text style={{ color: colors.categoryDetailsTitle }}>טוען...</Text>
      </View>
    );
  }

  if (!categoryData) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.categoryDetailsTitle }}>
          קטגוריה לא נמצאה.
        </Text>
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
      <TouchableOpacity
        style={[
          styles.backButton,
          {
            backgroundColor: colors.categoryDetailsCard,
            shadowColor: colors.categoryDetailsShadow,
            top: insets.top + 10,
          },
        ]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons
          name="arrow-back"
          size={24}
          color={colors.categoryDetailsTitle}
        />
      </TouchableOpacity>

      <ScrollView>
        <View style={styles.header}>
          <Text
            style={[
              styles.categoryName,
              { color: isExpired ? "red" : colors.categoryDetailsTitle },
            ]}
          >
            {categoryData.name}
          </Text>
          <Text
            style={[
              styles.currentBudget,
              { color: colors.categoryDetailsSubtitle },
            ]}
          >
            תקציב נוכחי: {formatCurrency(categoryData.budget)} 
          </Text>

          {isExpired && (
            <Text style={[styles.expiredCat, { color: colors.danger }]}>
              קטגוריה זו פגה תוקף
            </Text>
          )}
        </View>

        {/* הגדר תקציב : רק אדמין וקטגוריה לא פג תוקף וקטגוריה לא מיוחדת */}
        {isAdmin && !isExpired && !categoryData.istemporary && (
          <View style={styles.budgetControlContainer}>
            <TouchableOpacity
              style={[
                styles.setBudgetButton,
                { backgroundColor: colors.categoryDetailsButtonPrimary },
              ]}
              onPress={() => setPromptVisible(true)}
            >
              <Ionicons
                name="wallet-outline"
                size={20}
                color={colors.categoryDetailsButtonText}
              />
              <Text
                style={[
                  styles.setBudgetButtonText,
                  { color: colors.categoryDetailsButtonText },
                ]}
              >
                הגדרת תקציב
              </Text>
            </TouchableOpacity>

            <View
              style={[
                styles.regularContainer,
                {
                  backgroundColor: colors.categoryDetailsCard,
                  shadowColor: colors.categoryDetailsShadow,
                },
              ]}
            >
              <Text
                style={[
                  styles.regularLabel,
                  { color: colors.categoryDetailsTitle },
                ]}
              >
                שמור לחודשים הבאים
              </Text>
              <Switch
                value={isRegular}
                onValueChange={async (value) => {
                  setIsRegular(value);
                  try {
                    const categoryRef = doc(
                      db,
                      "groups",
                      groupId,
                      "categories",
                      categoryId
                    );
                    await updateDoc(categoryRef, { isRegular: value });
                  } catch (error) {
                    console.error("שגיאה בעדכון isRegular:", error);
                  }
                }}
              />
            </View>
          </View>
        )}

        <View style={styles.actionsContainer}>
          {!isExpired && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.categoryDetailsButtonPrimary },
              ]}
              onPress={() =>
                navigation.navigate("AddExpense", {
                  groupId,
                  userId,
                  initialCategoryId: categoryId,
                })
              }
            >
              <Ionicons
                name="add"
                size={20}
                color={colors.categoryDetailsButtonText}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: colors.categoryDetailsButtonText },
                ]}
              >
                להוסיף הוצאה
              </Text>
            </TouchableOpacity>
          )}

          {(isAdmin || isExpired) && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.categoryDetailsButtonDanger },
              ]}
              onPress={async () => {
                Alert.alert(
                  "מחיקת קטגוריה",
                  "אתה בטוח שברצונך למחוק את הקטגוריה וכל הוצאותיה?",
                  [
                    { text: "ביטול", style: "cancel" },
                    {
                      text: "מחק",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          const categoryRef = doc(
                            db,
                            "groups",
                            groupId,
                            "categories",
                            categoryId
                          );
                          const expensesRef = collection(
                            db,
                            "groups",
                            groupId,
                            "expenses"
                          );
                          const q = query(
                            expensesRef,
                            where("categoryId", "==", categoryId)
                          );
                          const querySnapshot = await getDocs(q);
                          const deletePromises = querySnapshot.docs.map(
                            (expenseDoc) => deleteDoc(expenseDoc.ref)
                          );
                          await Promise.all(deletePromises);
                          await deleteDoc(categoryRef);
                          Alert.alert("הצלחה", "הקטגוריה וכל ההוצאות נמחקו");
                          navigation.goBack();
                        } catch (error) {
                          console.error("Error deleting category:", error);
                          Alert.alert("שגיאה", "מחיקת הקטגוריה נכשלה.");
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={colors.categoryDetailsButtonText}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: colors.categoryDetailsButtonText },
                ]}
              >
                למחוק קטגוריה
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.expensesListContainer}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.categoryDetailsTitle },
            ]}
          >
            הוצאות של קטגוריה
          </Text>
          {expenses.length > 0 ? (
            <FlatList
              data={expenses}
              renderItem={renderExpenseItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text
              style={[
                styles.noExpensesText,
                { color: colors.categoryDetailsSubtitle },
              ]}
            >
              אין הוצאות רשומות
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={promptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPromptVisible(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: colors.categoryDetailsModalOverlay },
          ]}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.categoryDetailsModalBackground },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: colors.categoryDetailsModalText },
              ]}
            >
              הזן תקציב חדש
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  borderColor: colors.categoryDetailsBorder,
                  color: colors.categoryDetailsTitle,
                },
              ]}
              value={newBudget}
              onChangeText={setNewBudget}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.categoryDetailsSubtitle}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.categoryDetailsBorder },
                ]}
                onPress={() => setPromptVisible(false)}
              >
                <Text style={{ color: colors.categoryDetailsTitle }}>
                  ביטול
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.categoryDetailsButtonPrimary },
                ]}
                onPress={() => saveBudget(newBudget)}
              >
                <Text style={{ color: colors.categoryDetailsButtonText }}>
                  שמור
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    borderRadius: 50,
    padding: 8,
    elevation: 4,
  },
  header: { alignItems: "center", marginTop: 20, marginBottom: 20 },
  categoryName: { fontSize: 28, fontWeight: "bold" },
  currentBudget: { fontSize: 18, marginTop: 5 },
  expiredCat: { color: "red", fontWeight: "bold", marginVertical: 10 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  budgetControlContainer: { paddingHorizontal: 20, marginBottom: 20 },
  setBudgetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
    width: "100%",
  },
  setBudgetButtonText: { fontWeight: "bold", fontSize: 16, marginLeft: 10 },
  regularContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 15,
    marginTop: 30,
    elevation: 2,
  },
  regularLabel: { fontSize: 16, fontWeight: "600" },
  actionsContainer: { paddingHorizontal: 20 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionText: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
    textAlign: "center",
  },
  expensesListContainer: { paddingHorizontal: 20, marginTop: 20 },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 3,
  },
  expenseInfo: { flex: 1 },
  expenseDescription: {
    fontSize: 16,
    fontWeight: "500",
  },
  expenseUser: {
    fontSize: 14,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 10,
  },
  noExpensesText: {
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
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

export default CategoryDetails;

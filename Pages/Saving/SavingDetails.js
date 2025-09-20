import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useTheme, useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";
import { currency } from "../../Utilities/Currency";

const SavingDetails = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId, savingId, userId } = route.params;
  const insets = useSafeAreaInsets();
  const formatCurrency = currency();

  const [targetData, setTargetData] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDep, setAddDep] = useState(false);
  const [depAmount, setDepAmount] = useState("");

  useEffect(() => {
    const targetRef = doc(db, "groups", groupId, "saving", savingId);
    const unsubTarget = onSnapshot(targetRef, (snap) => {
      if (snap.exists()) {
        setTargetData({ id: snap.id, ...snap.data() });
      }
    });
    setLoading(false);

    const depositsRef = collection(
      db,
      "groups",
      groupId,
      "saving",
      savingId,
      "deposits"
    );
    const unsubDep = onSnapshot(depositsRef, (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setDeposits(data);
    });

    return () => {
      unsubTarget();
      unsubDep();
    };
  }, [groupId, savingId]);

  // חישוב התקדמות
  const progress =
    targetData?.targetAmount > 0
      ? (targetData.currentAmount / targetData.targetAmount) * 100
      : 0;

  let progressColor =  "red";
  if (progress >= 80) {
    progressColor =  "green";
  } else if (progress >= 50) {
    progressColor =  "orange";
  }

  // הוספת הפקדה
  const addDeposit = async () => {
    const amount = Number(depAmount);
    if (!amount || amount <= 0) {
      Alert.alert("שגיאה", "אנא הזן סכום תקין.");
      return;
    }

    try {
      // הוספת ההפקדה גם להוצאות הכלליות
      const expensesRef = collection(db, "groups", groupId, "expenses");
      const expenseDoc = await addDoc(expensesRef, {
        amount,
        description: `הפקדה ליעד: ${targetData.name}`,
        userId,
        createdAt: serverTimestamp(),
        categoryId: null,
      });

      // שמירת ההפקדה בתוך deposits עם expenseId
      const depositsRef = collection(
        db,
        "groups",
        groupId,
        "saving",
        savingId,
        "deposits"
      );
      await addDoc(depositsRef, {
        amount,
        createdAt: serverTimestamp(),
        expenseId: expenseDoc.id,
      });

      // עדכון סכום יעד החיסכון
      const targetRef = doc(db, "groups", groupId, "saving", savingId);
      await updateDoc(targetRef, {
        currentAmount: (targetData.currentAmount || 0) + amount,
      });

      setDepAmount("");
      setAddDep(false);
    } catch (error) {
      console.error("Error adding deposit:", error);
      Alert.alert("שגיאה", "הוספת ההפקדה נכשלה.");
    }
  };

  // מחיקת הפקדה בודדת
  const deleteDeposit = async (depositId, amount, expenseId) => {
    try {
      // מחיקת ההפקדה
      await deleteDoc(
        doc(db, "groups", groupId, "saving", savingId, "deposits", depositId)
      );

      // מחיקת ההוצאה המקושרת
      if (expenseId) {
        await deleteDoc(doc(db, "groups", groupId, "expenses", expenseId));
      }

      // עדכון סכום יעד החיסכון
      const targetRef = doc(db, "groups", groupId, "saving", savingId);
      await updateDoc(targetRef, {
        currentAmount: (targetData.currentAmount || 0) - amount,
      });
    } catch (error) {
      console.error("Error deleting deposit:", error);
      Alert.alert("שגיאה", "מחיקת ההפקדה נכשלה.");
    }
  };

  // מחיקת יעד חיסכון
  const deleteSaving = async () => {
    Alert.alert(
      "מחיקת חיסכון",
      "האם אתה בטוח שברצונך למחוק את יעד החיסכון הזה? כל ההפקדות וההוצאות יימחקו.",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "מחק",
          style: "destructive",
          onPress: async () => {
            try {
              // שליפת כל ההפקדות
              const depositsRef = collection(
                db,
                "groups",
                groupId,
                "saving",
                savingId,
                "deposits"
              );
              const depositsSnap = await getDocs(depositsRef);

              // מחיקת כל ההפקדות וההוצאות המקושרות
              for (const deposit of depositsSnap.docs) {
                const { expenseId } = deposit.data();
                await deleteDoc(deposit.ref);
                if (expenseId) {
                  await deleteDoc(
                    doc(db, "groups", groupId, "expenses", expenseId)
                  );
                }
              }

              // מחיקת יעד החיסכון עצמו
              await deleteDoc(doc(db, "groups", groupId, "saving", savingId));

              navigation.goBack();
            } catch (error) {
              console.error("Error deleting saving:", error);
              Alert.alert("שגיאה", "מחיקת יעד החיסכון נכשלה.");
            }
          },
        },
      ]
    );
  };

  const renderDeposit = ({ item }) => (
    <View
      style={[
        styles.depositItem,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.depositAmount, { color: colors.text }]}>
        {formatCurrency(item.amount)}
      </Text>
      <TouchableOpacity
        onPress={() => deleteDeposit(item.id, item.amount, item.expenseId)}
      >
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text }}>טוען...</Text>
      </View>
    );
  }

  if (!targetData) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.text }}>היעד לא נמצא.</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* כפתור חזור */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 10 }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.targetName, { color: colors.text }]}>
          {targetData.name}
        </Text>
        <Text style={[styles.targetAmount, { color: colors.secondary }]}>
          {targetData.currentAmount} / {formatCurrency(targetData.targetAmount)}
        </Text>

        {/* פרוגרס */}
        <View
          style={[
            styles.progressBar,
            { backgroundColor: colors.progressBackground },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: progressColor },
            ]}
          />
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>

        {/* כפתור הוספת הפקדה */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setAddDep(true)}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>הוסף הפקדה</Text>
        </TouchableOpacity>

        {/* רשימת הפקדות */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          הפקדות:
        </Text>
        {deposits.length > 0 ? (
          <FlatList
            data={deposits}
            renderItem={renderDeposit}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        ) : (
          <Text style={{ color: colors.secondary, textAlign: "center" }}>
            אין עדיין הפקדות
          </Text>
        )}

        {/* כפתור מחיקת חיסכון */}
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: colors.danger }]}
          onPress={deleteSaving}
        >
          <Ionicons name="trash-outline" size={20} color="white" />
          <Text style={styles.deleteButtonText}>מחק חיסכון</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal להוספת הפקדה */}
      <Modal
        visible={addDep}
        transparent
        animationType="fade"
        onRequestClose={() => setAddDep(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              הזן סכום להפקדה
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { borderColor: colors.border, color: colors.text },
              ]}
              value={depAmount}
              onChangeText={setDepAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.secondary}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setAddDep(false)}
              >
                <Text style={{ color: colors.text }}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={addDeposit}
              >
                <Text style={{ color: "white" }}>שמור</Text>
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
  scroll: { padding: 20, paddingBottom: 60 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 50,
  },
  targetName: { fontSize: 28, fontWeight: "bold", textAlign: "center" },
  targetAmount: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 15,
    marginTop: 5,
  },
  progressBar: {
    height: 18,
    borderRadius: 6,
    overflow: "hidden",
    marginVertical: 20,
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
  },
  progressText: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    fontWeight: "bold",
    color: "white", 
  },
  addButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  addButtonText: { color: "white", marginLeft: 8, fontWeight: "600" },
  deleteButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    marginTop: 50,
  },
  deleteButtonText: { color: "white", marginLeft: 8, fontWeight: "600" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  depositItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  depositAmount: { fontSize: 16, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: { padding: 20, borderRadius: 10, width: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
  modalButton: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
});

export default SavingDetails;

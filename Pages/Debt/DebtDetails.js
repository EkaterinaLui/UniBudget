import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { addDoc, collection, onSnapshot, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebase";
import { useCurrency } from "../../Utilities/Currency";

// דף המציג את פירוט החובות של המשתמש
const DebtDetails = () => {
  // שימוש בתמות של הניווט כדי לקבל את הצבעים הנוכחיים של האפליקציה
  const { colors } = useTheme();
  // שימוש בניווט כדי לנווט חזרה למסך הקודם
  const navigation = useNavigation();
  const route = useRoute();
  // שימוש בנתונים שנשלחו כפרמטרים מהמסך הקודם (groupId, userId, membersData, expenses, allUsers)
  const { groupId, userId, membersData, expenses, allUsers } = route.params;
  // שימוש בהוק של מטבע כדי לעצב את הסכומים בצורה נכונה לפי המטבע הנבחר
  const formatCurrency = useCurrency();
  // רשימה של חובות המשתמש לאחר חישוב
  const [debtsList, setDebtsList] = useState([]);
  // רשימה של חובות שכבר סגורים כדי לעדכן את החישובים בהתאם
  const [settledDebts, setSettledDebts] = useState([]);

  // מאזין לחובות סגורים
  useEffect(() => {
    const ref = collection(db, "groups", groupId, "settledDebts");
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSettledDebts(data);
    });
    return unsub;
  }, [groupId]);

  // חישוב חובות
  useEffect(() => {
    if (!expenses || !membersData || membersData.length === 0) return;

    // סה"כ הוצאות
    let total = 0;
    expenses.forEach((e) => {
      total += e.amount || 0;
    });

    // כמה כל אחד צריך לשלם
    const share = total / membersData.length;

    // חישוב כמה כל משתמש הוציא בפועל על ידי סינון ההוצאות לפי מזהה המשתמש וסכימת הסכומים
    let balances = {};
    membersData.forEach((m) => {
      balances[m.uid] = 0;
    });
    // חישוב כמה כל משתמש הוציא בפועל על ידי סינון ההוצאות לפי מזהה המשתמש וסכימת הסכומים
    expenses.forEach((e) => {
      balances[e.userId] = (balances[e.userId] || 0) + (e.amount || 0);
    });

    // הפחתת חלק שווה
    Object.keys(balances).forEach((id) => {
      balances[id] -= share;
    });

    // עדכון לפי חובות שכבר סגורים
    settledDebts.forEach((s) => {
      balances[s.fromUser] += s.amount;
      balances[s.toUser] -= s.amount;
    });
    // חישוב יחסי חוב בין המשתמשים
    const myBalance = balances[userId] || 0;
    let relations = [];
    // השוואת היתרה שלי עם כל משתמש אחר כדי לקבוע מי חייב למי וכמה
    membersData.forEach((m) => {
      // לא משווים את המשתמש עם עצמו
      if (m.uid === userId) return;
      const otherBalance = balances[m.uid] || 0;
      // אם אני חייב למישהו אחר, או שמישהו אחר חייב לי, נוצר קשר חוב בין שנינו
      if (myBalance < 0 && otherBalance > 0) {
        const amount = Math.min(Math.abs(myBalance), otherBalance);
        relations.push({
          type: "owe",
          to: m.uid,
          name: allUsers?.[m.uid] || "משתמש",
          amount,
        });
      }
      // אם מישהו אחר חייב לי, או שאני חייב למישהו אחר, נוצר קשר חוב בין שנינו
      if (myBalance > 0 && otherBalance < 0) {
        const amount = Math.min(myBalance, Math.abs(otherBalance));
        relations.push({
          type: "get",
          from: m.uid,
          name: allUsers?.[m.uid] || "משתמש",
          amount,
        });
      }
    });
    // עדכון רשימת החובות עם הקשרים החדשים שחושבו
    setDebtsList(relations);
  }, [expenses, membersData, userId, allUsers, settledDebts]);

  // סגירת חוב יחיד
  const closeSingleDebt = async (debt) => {
    try {
      // הוספת רשומה של החוב הסגור לבסיס הנתונים
      await addDoc(collection(db, "groups", groupId, "settledDebts"), {
        fromUser: userId,
        toUser: debt.to,
        amount: debt.amount,
        settledAt: Timestamp.now(),
      });
      // הצגת התראה שהחוב נסגר בהצלחה
      Alert.alert("הצלחה", `החוב ל־${debt.name} נסגר בהצלחה`);
    } catch (error) {
      // טיפול בשגיאות בעת סגירת החוב והצגת התראה מתאימה
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
            ? `אתה חייב ל־${item.name}: ${formatCurrency(item.amount)}`
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
        <Ionicons name="arrow-forward" size={24} color={colors.text} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.text }]}>מצב החובות שלך</Text>

      <FlatList
        data={debtsList}
        renderItem={renderItem}
        keyExtractor={(_, index) => index.toString()}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: colors.secondary }}>אין חובות כרגע </Text>
          </View>
        }
        contentContainerStyle={{ padding: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backButton: {
    marginTop: 50,
    marginLeft: 20,
  },
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
  text: {
    fontSize: 16,
    marginBottom: 10,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    width: "90%",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5,
    alignSelf: "flex-start",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default DebtDetails;

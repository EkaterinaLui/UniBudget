import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";
import { SettingsContext } from "../../Utilities/SettingsContext";

const AddExpenses = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { settings } = useContext(SettingsContext);

  const currencySymbol = settings.currency; // סימן מטבע (₪, $, €)

  const { groupId, userId, initialCategoryId } = route.params || {};

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  //  טוען שם הקטגוריה 
  useEffect(() => {
    if (!groupId || !initialCategoryId) {
      Alert.alert("שגיאה", "פרטי הקבוצה או הקטגוריה חסרים.");
      navigation.canGoBack() && navigation.goBack();
      return;
    }

    const fetchCategoryName = async () => {
      try {
        const categoryRef = doc(
          db,
          "groups",
          groupId,
          "categories",
          initialCategoryId
        );
        const docSnap = await getDoc(categoryRef);

        if (docSnap.exists()) {
          setCategoryName(docSnap.data().name);
        } else {
          Alert.alert("שגיאה", "לא נמצאה קטגוריה.");
          navigation.canGoBack() && navigation.goBack();
        }
      } catch (error) {
        console.error("שגיאה בטעינת קטגוריה:", error);
        Alert.alert("שגיאה", "טעינת הקטגוריה נכשלה.");
        navigation.canGoBack() && navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryName();
  }, [groupId, initialCategoryId, navigation]);

  //  בדיקה אם חרגו מהתקציב (קבוצתי או קטגוריה)
  const checkBudgetAndNotify = async () => {
     try {
    // טוען הגדרות מעודכנות ממסד הנתונים
    const settingsSnap = await getDoc(doc(db, "settings", userId));
    const settingsData = settingsSnap.exists() ? settingsSnap.data() : null;

    // בדיקה האם בכלל ההתרעה פעילה
    if (!settingsData?.notifications?.budgetLimit) {
      console.log("ההתראות כבויות, לא נשלחה התראה");
      return;
    }

    // מבקש הרשאות אם אין
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const request = await Notifications.requestPermissionsAsync();
      if (request.status !== "granted") {
        console.log("אין הרשאה לשליחת התראות");
        return;
      }
    }

      const groupRef = doc(db, "groups", groupId);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) return;
      const groupData = groupSnap.data();

      // סך הוצאות של הקבוצה
      const expSnap = await getDocs(
        collection(db, "groups", groupId, "expenses")
      );
      const totalExpenses = expSnap.docs.reduce(
        (sum, e) => sum + (e.data().amount || 0),
        0
      );

      if (totalExpenses > (groupData.totalBudget || 0)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: " חריגה מתקציב הקבוצה",
            body: "סכום ההוצאות עבר את גבול התקציב הכולל!",
          },
          trigger: null, // מיידי
        });
      }

      // בדיקה לקטגוריה
      const catRef = doc(
        db,
        "groups",
        groupId,
        "categories",
        initialCategoryId
      );
      const catSnap = await getDoc(catRef);
      if (catSnap.exists()) {
        const catData = catSnap.data();

        const catExpenses = expSnap.docs
          .filter((e) => e.data().categoryId === initialCategoryId)
          .reduce((sum, e) => sum + (e.data().amount || 0), 0);

        if (catExpenses > (catData.budget || 0)) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `חריגה בקטגוריה "${catData.name}"`,
              body: "הוצאות הקטגוריה עברו את התקציב שלה!",
            },
            trigger: null,
          });
        }
      }
    } catch (err) {
      console.error("שגיאה בבדיקת חריגה:", err);
    }
  };

  //  שמירה של ההוצאה
  const handleAddExpense = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert("שגיאה", "אנא הזן סכום תקין.");
      return;
    }

    if (!initialCategoryId) {
      Alert.alert("שגיאה", "לא ניתן היה לקבוע את הקטגוריה.");
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(db, "groups", groupId, "expenses"), {
        amount: parseFloat(amount),
        description: description,
        categoryId: initialCategoryId,
        userId: userId,
        createdAt: Timestamp.now(),
      });

      //  אחרי שמירה - בדוק חריגה
      await checkBudgetAndNotify();

      Alert.alert("הצלחה", "ההוצאה נוספה בהצלחה!");
      navigation.canGoBack() && navigation.goBack();
    } catch (error) {
      console.error("שגיאה בהוספת הוצאה:", error);
      Alert.alert("שגיאה", "הוספת ההוצאה נכשלה.");
    } finally {
      setIsSaving(false);
    }
  };

  //  מצב טעינה
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>טוען...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* חזור */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 10 }]}
        onPress={() => navigation.canGoBack() && navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>הוסף הוצאה</Text>

        {/* מידע על הקטגוריה */}
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryLabel}>קטגוריה:</Text>
          <Text style={styles.categoryNameText}>{categoryName}</Text>
        </View>

        {/* סכום */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>סכום הוצאה ({currencySymbol})</Text>
          <TextInput
            style={styles.input}
            placeholder={`0.00 ${currencySymbol}`}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* תיאור */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>תיאור (אופציונלי)</Text>
          <TextInput
            style={styles.input}
            placeholder="תיאור"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* כפתור שמירה */}
        <TouchableOpacity
          style={[styles.button, isSaving && styles.buttonDisabled]}
          onPress={handleAddExpense}
          disabled={isSaving}
        >
          <Text style={styles.buttonText}>
            {isSaving ? "שומר..." : "לשמור הוצאה"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
  },
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
    marginBottom: 30,
    textAlign: "center",
    color: "#333",
    marginTop: 60,
  },
  categoryInfo: {
    marginBottom: 20,
    alignItems: "center",
  },
  categoryLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#555",
  },
  categoryNameText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginTop: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "bold",
    color: "#555",
  },
  input: {
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    backgroundColor: "#fff",
    fontSize: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    textAlign: "right",
  },
  button: {
    backgroundColor: "#2196f3",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: "#a9a9a9",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default AddExpenses;

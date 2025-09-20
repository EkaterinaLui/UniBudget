import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";
import { doc, getDoc, collection, addDoc, Timestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { currency } from "../../Utilities/Currency";

const AddExpense = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const formatCurrency = currency();

  const params = route.params || {};
  const { groupId, userId, initialCategoryId } = params;

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
          Alert.alert("Error", "Category not found.");
          navigation.canGoBack() && navigation.goBack();
        }
      } catch (error) {
        console.error("Error getting category:", error);
        Alert.alert("שגיאה", "טעינת הקטגוריה נכשלה.");
        navigation.canGoBack() && navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryName();
  }, [groupId, initialCategoryId]);

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

      Alert.alert("הצלחה", "ההוצאה נוספה בהצלחה!");
      navigation.canGoBack() && navigation.goBack();
    } catch (error) {
      console.error("Failed to add expense:", error);
      Alert.alert("שגיאה", "הוספת הוצאה נכשלה: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 10 }]}
        onPress={() => navigation.canGoBack() && navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>הוסף הוצאה</Text>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryLabel}>קטגוריה:</Text>
          <Text style={styles.categoryNameText}>{categoryName}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>סכום הוצאה ({formatCurrency("")})</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>תיאור (אופציונלי)</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isSaving && styles.buttonDisabled]}
          onPress={handleAddExpense}
          disabled={isSaving}
        >
          <Text style={styles.buttonText}>
            {isSaving ? "שמירה..." : "לשמור הוצאה"}
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
    alignItems: "center" 
  },
  categoryLabel: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#555" 
  },
  categoryNameText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginTop: 5,
  },
  inputGroup: { 
    marginBottom: 20 
  },
  label: { 
    fontSize: 16,
    marginBottom: 8, 
    fontWeight: "bold", 
    color: "#555" 
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
    backgroundColor: "#a9a9a9" 
  },
  buttonText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "bold" 
  },
});

export default AddExpense;

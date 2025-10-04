import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { db } from "../../firebase";

// צבעים ואייקונים
const colorOptions = [
  "#FF5733",
  "#33FF57",
  "#3357FF",
  "#F1C40F",
  "#9B59B6",
  "#1ABC9C",
  "#E74C3C",
];
const iconOptions = [
  "fast-food-outline",
  "car-outline",
  "home-outline",
  "book-outline",
  "gift-outline",
  "wifi-outline",
  "medical-outline",
  "cart-outline",
  "cash-outline",
  "bulb-outline",
  "pricetag-outline",
  "wallet-outline",
];

const CreateCategory = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId, isTemporary } = route.params;
  const { colors } = useTheme();

  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
  const [selectedIcon, setSelectedIcon] = useState(iconOptions[0]);
  const [loading, setLoading] = useState(false);

  //  תוקף
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // יצירת קטגוריה
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("שגיאה", "חייב למלא שם קטגוריה");
      return;
    }

    setLoading(true);

    try {
      const data = {
        name,
        icon: selectedIcon,
        color: selectedColor,
        isTemporary, 
        isRegular: false,
        createdAt: new Date(),
      };

      if (isTemporary) {
        // קטגוריה מיוחדת – הערות + תוקף
        data.notes = notes;
        data.eventStartDate = Timestamp.fromDate(new Date());
        data.eventEndDate = Timestamp.fromDate(expiryDate);
      } else {
        // קטגוריה רגילה – תקציב
        data.budget = Number(budget) || 0;
      }

      await addDoc(collection(db, "groups", groupId, "categories"), data);

      Alert.alert("הצלחה", `הקטגוריה "${name}" נשמרה בהצלחה`);
      navigation.goBack();
    } catch (err) {
      console.log("שגיאה:", err);
      Alert.alert("שגיאה", "לא הצלחנו לשמור את הקטגוריה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isTemporary ? "צור קטגוריה מיוחדת" : "צור קטגוריה רגילה"}
        </Text>

        {/* שם */}
        <TextInput
          placeholder="שם הקטגוריה"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.text },
          ]}
          value={name}
          onChangeText={setName}
        />

        {/* קטגוריה רגילה */}
        {!isTemporary && (
          <TextInput
            placeholder="תקציב"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
            value={budget}
            onChangeText={setBudget}
            keyboardType="numeric"
          />
        )}

        {/* קטגוריה מיוחדת */}
        {isTemporary && (
          <>
            <TextInput
              placeholder="הערות"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            {/* בחירת תוקף */}
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={[styles.input, { justifyContent: "center" }]}
            >
              <Text style={{ color: colors.text }}>
                תוקף עד: {expiryDate.toLocaleDateString("he-IL")}
              </Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={expiryDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowPicker(false);
                  if (selectedDate) setExpiryDate(selectedDate);
                }}
              />
            )}
          </>
        )}

        {/* צבע */}
        <Text style={{ marginTop: 20, marginBottom: 10, color: colors.text }}>
          בחר צבע:
        </Text>
        <FlatList
          data={colorOptions}
          horizontal
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedColor(item)}
              style={[
                styles.colorCircle,
                { backgroundColor: item },
                selectedColor === item && styles.colorSelected,
              ]}
            />
          )}
        />

        {/* אייקון */}
        <Text style={{ marginTop: 20, marginBottom: 10, color: colors.text }}>
          בחר אייקון:
        </Text>
        <FlatList
          data={iconOptions}
          horizontal
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedIcon(item)}
              style={[
                styles.iconCircle,
                {
                  borderColor:
                    selectedIcon === item ? selectedColor : colors.border,
                },
              ]}
            >
              <Ionicons
                name={item}
                size={28}
                color={selectedIcon === item ? selectedColor : colors.text}
              />
            </TouchableOpacity>
          )}
        />

        {/* שמירה */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: selectedColor }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>שמור קטגוריה</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    marginTop: 40,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: "#000",
  },
  iconCircle: {
    width: 50,
    height: 50,
    marginRight: 10,
    borderWidth: 2,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    marginTop: 30,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default CreateCategory;

import React, { useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { db } from "../../firebase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// צבעים זמינים לבחירה
const colors = [
  "#FF5733",
  "#33FF57",
  "#3357FF",
  "#F1C40F",
  "#9B59B6",
  "#1ABC9C",
  "#E74C3C",
];

// אייקונים זמינים לבחירה
const icons = [
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
  const insets = useSafeAreaInsets();
  const { colors: theme } = useTheme();

  const [categoryName, setCategoryName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("fast-food-outline");
  const [selectedColor, setSelectedColor] = useState("#FF5733");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [purchaseList, setPurchaseList] = useState("");
  const [eventStartDate, setEventStartDate] = useState(new Date());
  const [eventEndDate, setEventEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateCategory = async () => {
    if (!categoryName || categoryName.trim() === "") {
      Alert.alert("שגיאה", "נא להזין שם קטגוריה");
      return;
    }

    setLoading(true);
    try {
      const categoryData = {
        name: categoryName,
        icon: selectedIcon,
        color: selectedColor,
        istemporary: isTemporary,
        createdAt: new Date(),
      };

      if (isTemporary) {
        categoryData.budget = Number(budget) || 0;
        categoryData.notes = notes;
        categoryData.purchaseList = purchaseList
          ? purchaseList.split(",").map((item) => item.trim())
          : [];
        categoryData.eventStartDate = Timestamp.fromDate(eventStartDate);
        categoryData.eventEndDate = Timestamp.fromDate(eventEndDate);
      }

      await addDoc(
        collection(db, "groups", groupId, "categories"),
        categoryData
      );

      Alert.alert("הצלחה", `קטגוריה "${categoryName}" נשמרה בהצלחה.`);
      navigation.goBack();
    } catch (error) {
      console.error("Error creating category:", error);
      Alert.alert("שגיאה", "אירעה שגיאה, נסה שוב מאוחר יותר.");
    } finally {
      setLoading(false);
    }
  };

  const onChangeStartDate = (event, selectedDate) => {
    const currentDate = selectedDate || eventStartDate;
    setShowStartDatePicker(Platform.OS === "ios");
    setEventStartDate(currentDate);
  };

  const onChangeEndDate = (event, selectedDate) => {
    const currentDate = selectedDate || eventEndDate;
    setShowEndDatePicker(Platform.OS === "ios");
    setEventEndDate(currentDate);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.createCategoryBackground,
            paddingTop: insets.top,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: theme.createCategoryCard,
              shadowColor: theme.createCategoryShadow,
              top: insets.top + 10,
            },
          ]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.createCategoryText}
          />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.title, { color: theme.createCategoryText }]}>
            {isTemporary ? "צור קטגוריה מיוחדת חדשה" : "צור קטגוריה חדשה"}
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.createCategoryBorder,
                backgroundColor: theme.createCategoryCard,
                color: theme.createCategoryText,
                shadowColor: theme.createCategoryShadow,
              },
            ]}
            placeholder="שם הקטגוריה"
            placeholderTextColor={theme.createCategoryTextSecondary}
            value={categoryName}
            onChangeText={setCategoryName}
          />

          <Text
            style={[
              styles.sectionTitle,
              { color: theme.createCategoryTextSecondary },
            ]}
          >
            בחר אייקון:
          </Text>
          <FlatList
            data={icons}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  {
                    borderColor:
                      selectedIcon === item
                        ? selectedColor
                        : theme.createCategoryBorder,
                    backgroundColor: theme.createCategoryCard,
                  },
                ]}
                onPress={() => setSelectedIcon(item)}
              >
                <Ionicons
                  name={item}
                  size={30}
                  color={
                    selectedIcon === item
                      ? selectedColor
                      : theme.createCategoryText
                  }
                />
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.iconList}
          />

          <Text
            style={[
              styles.sectionTitle,
              { color: theme.createCategoryTextSecondary },
            ]}
          >
            בחר צבע:
          </Text>
          <FlatList
            data={colors}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.colorButton,
                  { backgroundColor: item },
                  selectedColor === item && styles.selectedColor,
                ]}
                onPress={() => setSelectedColor(item)}
              />
            )}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.colorList}
          />

          {isTemporary && (
            <View>
              <Text
                style={[
                  styles.label,
                  { color: theme.createCategoryTextSecondary },
                ]}
              >
                תקציב
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.createCategoryBorder,
                    backgroundColor: theme.createCategoryCard,
                    color: theme.createCategoryText,
                    shadowColor: theme.createCategoryShadow,
                  },
                ]}
                keyboardType="numeric"
                value={budget}
                onChangeText={setBudget}
              />

              <Text
                style={[
                  styles.label,
                  { color: theme.createCategoryTextSecondary },
                ]}
              >
                רשימת קניות (עם פסיק)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.createCategoryBorder,
                    backgroundColor: theme.createCategoryCard,
                    color: theme.createCategoryText,
                    shadowColor: theme.createCategoryShadow,
                  },
                ]}
                value={purchaseList}
                onChangeText={setPurchaseList}
              />

              <Text
                style={[
                  styles.label,
                  { color: theme.createCategoryTextSecondary },
                ]}
              >
                הערות
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.notesInput,
                  {
                    borderColor: theme.createCategoryBorder,
                    backgroundColor: theme.createCategoryCard,
                    color: theme.createCategoryText,
                    shadowColor: theme.createCategoryShadow,
                  },
                ]}
                multiline={true}
                value={notes}
                onChangeText={setNotes}
              />

              <Text
                style={[
                  styles.label,
                  { color: theme.createCategoryTextSecondary },
                ]}
              >
                תאריך התחלה
              </Text>
              <TouchableOpacity
                onPress={() => setShowStartDatePicker(true)}
                style={[
                  styles.datePickerButton,
                  {
                    backgroundColor: theme.createCategoryCard,
                    borderColor: theme.createCategoryBorder,
                  },
                ]}
              >
                <Text
                  style={[styles.dateText, { color: theme.createCategoryText }]}
                >
                  {eventStartDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={eventStartDate}
                  mode="date"
                  display="default"
                  onChange={onChangeStartDate}
                />
              )}

              <Text
                style={[
                  styles.label,
                  { color: theme.createCategoryTextSecondary },
                ]}
              >
                תאריך סוף
              </Text>
              <TouchableOpacity
                onPress={() => setShowEndDatePicker(true)}
                style={[
                  styles.datePickerButton,
                  {
                    backgroundColor: theme.createCategoryCard,
                    borderColor: theme.createCategoryBorder,
                  },
                ]}
              >
                <Text
                  style={[styles.dateText, { color: theme.createCategoryText }]}
                >
                  {eventEndDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={eventEndDate}
                  mode="date"
                  display="default"
                  onChange={onChangeEndDate}
                />
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: selectedColor,
                shadowColor: theme.createCategoryShadow,
              },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleCreateCategory}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.createCategoryButtonText} />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  { color: theme.createCategoryButtonText },
                ]}
              >
                לשמור קטגוריה
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
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
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 60,
    marginBottom: 30,
  },
  input: {
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 25,
    fontSize: 16,
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 10 },
  iconList: { alignItems: "center", paddingVertical: 10 },
  iconButton: {
    height: 60,
    width: 60,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
    borderWidth: 2,
    borderRadius: 15,
  },
  colorList: { paddingVertical: 10 },
  colorButton: {
    width: 45,
    height: 45,
    borderRadius: 25,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: "transparent",
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  selectedColor: { borderColor: "#212529", borderWidth: 3 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  notesInput: { height: 100, textAlignVertical: "top" },
  datePickerButton: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  dateText: { fontSize: 16 },
  button: {
    padding: 15,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 80,
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 18, fontWeight: "bold" },
});

export default CreateCategory;

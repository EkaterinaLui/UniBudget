import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";

function CreateGroup({ navigation, db, userId, route }) {
  const [groupName, setGroupName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [groupType, setGroupType] = useState("family");
  const { userName } = route.params || {};
  const { colors } = useTheme();

  useEffect(() => {
    console.log("userName:", userName);
  }, []);

  // חזרה למסך הבית
  const handleGoBack = () => {
    navigation.navigate("Home");
  };

  // שמירה של הקבוצה בפיירסטור
  const handleSaveGroup = async () => {
    if (groupName.trim() === "") {
      Alert.alert("נא להכניס שם לקבוצה");
      return;
    }

    if (!db || !userId) {
      Alert.alert("שגיאה", "משתמש או בסיס נתונים לא מחובר");
      return;
    }

    setIsSaving(true);

    try {
      const groupsRef = collection(db, "groups");
      // בדיקה שאין קבוצות עם אותו שם לאותו משתמש
      const q = query(
        groupsRef,
        where("memberIds", "array-contains", userId),
        where("groupName", "==", groupName.trim())
      );

      const existingGroupsSnapshot = await getDocs(q);

      if (!existingGroupsSnapshot.empty) {
        Alert.alert("שגיאה", "כבר יש לך קבוצה עם שם זהה");
        setIsSaving(false);
        return;
      }

      await addDoc(groupsRef, {
        groupName: groupName.trim(),
        type: groupType,
        createdAt: serverTimestamp(),
        members: [{ uid: userId, name: userName }],
        memberIds: [userId],
        adminIds: [userId], // 🔥 היוצר נכנס ישר כאדמין
      });

      Alert.alert("הקבוצה נוצרה", `"${groupName}" נשמרה בהצלחה`);
      setGroupName("");
      navigation.navigate("Home", { newGroupAdded: true });
    } catch (error) {
      console.error("שגיאה ביצירת קבוצה:", error);
      Alert.alert("שגיאה", "אירעה תקלה, נסה שוב");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { backgroundColor: colors.background },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* כפתור חזור + כותרת */}
        <View>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={32} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            יצירת קבוצה חדשה
          </Text>
        </View>

        {/* טופס קבוצה */}
        <View style={styles.formContainer}>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
                color: colors.text,
              },
            ]}
            placeholder="שם הקבוצה"
            placeholderTextColor={colors.text + "99"}
            value={groupName}
            onChangeText={setGroupName}
            editable={!isSaving}
          />

          <Text style={[styles.label, { color: colors.text }]}>
            בחר סוג קבוצה:
          </Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                groupType === "family" && { backgroundColor: colors.typeColor },
              ]}
              onPress={() => setGroupType("family")}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: groupType === "family" ? "white" : colors.text },
                ]}
              >
                משפחה
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                groupType === "partners" && { backgroundColor: colors.typeColor },
              ]}
              onPress={() => setGroupType("partners")}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: groupType === "partners" ? "white" : colors.text },
                ]}
              >
                שותפים
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.buttonSave,
              { backgroundColor: colors.primary },
              isSaving && styles.disabledButton,
            ]}
            onPress={handleSaveGroup}
            disabled={isSaving}
          >
            <Text style={styles.buttonText}>
              {isSaving ? "שומר..." : "שמור קבוצה"}
            </Text>
          </TouchableOpacity>

          {isSaving && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.activityIndicator}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  backButton: {
    position: "absolute",
    top: 100,
    left: 20,
    zIndex: 10,
  },
  title: {
    paddingTop: 95,
    paddingHorizontal: 20,
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "right",
  },
  typeContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  typeButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },

  formContainer: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    marginTop: 80,
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  buttonSave: {
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  activityIndicator: {
    marginTop: 15,
  },
});

export default CreateGroup;

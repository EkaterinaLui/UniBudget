import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

function CreateGroup({ navigation, db, userId, route }) {
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState("family");
  const [loading, setLoading] = useState(false);

  const { colors } = useTheme();
  const { userName } = route.params || {};

  const saveGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("שגיאה", "צריך למלא שם קבוצה");
      return;
    }

    setLoading(true);
    try {
      const groupsRef = collection(db, "groups");
      await addDoc(groupsRef, {
        groupName: groupName.trim(),
        type: groupType,
        createdAt: serverTimestamp(),
        members: [{ uid: userId, name: userName || "משתמש" }],
        memberIds: [userId],
        adminIds: [userId],
      });

      Alert.alert("הצלחה", "הקבוצה נשמרה");
      setGroupName("");
      navigation.navigate("Home");
    } catch (err) {
      console.log("שגיאה ביצירת קבוצה:", err);
      Alert.alert("שגיאה", "משהו השתבש, נסה שוב");
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* כותרת וחזור */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={28} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: colors.text }]}>יצירת קבוצה חדשה</Text>

      {/* שדה שם */}
      <TextInput
        style={[
          styles.input,
          { borderColor: colors.border, backgroundColor: colors.card, color: colors.text },
        ]}
        placeholder="שם הקבוצה"
        placeholderTextColor={colors.text + "77"}
        value={groupName}
        onChangeText={setGroupName}
        editable={!loading}
      />

      {/* בחירת סוג */}
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[
            styles.typeBtn,
            groupType === "family" && { backgroundColor: colors.primary },
          ]}
          onPress={() => setGroupType("family")}
        >
          <Text style={{ color: groupType === "family" ? "white" : colors.text }}>
            משפחה
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeBtn,
            groupType === "partners" && { backgroundColor: colors.primary },
          ]}
          onPress={() => setGroupType("partners")}
        >
          <Text style={{ color: groupType === "partners" ? "white" : colors.text }}>
            שותפים
          </Text>
        </TouchableOpacity>
      </View>

      {/* כפתור שמירה */}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        onPress={saveGroup}
        disabled={loading}
      >
        <Text style={styles.saveBtnText}>{loading ? "שומר..." : "שמור"}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 15 }} />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 100,
  },
  backBtn: {
    position: "absolute",
    top: 40,
    left: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  typeRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 30,
  },
  typeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CreateGroup;

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const CreateSaving = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [targetName, setTargetName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const createTarget = async () => {
    if (!targetName.trim() || !targetAmount.trim()) {
      Alert.alert("שגיאה", "אנא מלא שם יעד וסכום יעד.");
      return;
    }

    const amountNum = Number(targetAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("שגיאה", "אנא הזן סכום יעד תקין (מספר גדול מאפס).");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "groups", groupId, "savings"), {
        name: targetName.trim(),
        targetAmount: amountNum,
        currentAmount: 0,
        createdAt: serverTimestamp(),
      });

      Alert.alert("הצלחה", `היעד "${targetName}" נוצר בהצלחה.`);
      navigation.goBack();
    } catch (error) {
      console.error("שגיאה ביצירת יעד חיסכון:", error);
      Alert.alert("שגיאה", "לא הצלחנו לשמור את היעד. נסה שוב מאוחר יותר.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
    >
      <View
        style={[
          styles.root,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        {/* חזור */}
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: colors.text }]}>
            יצירת יעד חיסכון
          </Text>

          {/* שם יעד */}
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
                color: colors.text,
              },
            ]}
            placeholder="לדוגמה: טיול, רכב, לימודים..."
            placeholderTextColor={colors.text + "99"}
            value={targetName}
            onChangeText={setTargetName}
          />

          {/* סכום יעד */}
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
                color: colors.text,
              },
            ]}
            placeholder="סכום היעד בשקלים"
            placeholderTextColor={colors.text + "99"}
            value={targetAmount}
            onChangeText={setTargetAmount}
            keyboardType="numeric"
          />

          {/* כפתור שמירה */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: loading ? colors.border : colors.primary,
              },
            ]}
            onPress={createTarget}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>שמור יעד</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
     flex: 1
     },
  scroll: {
     padding: 20, 
     paddingBottom: 40 
    },
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 50,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 40,
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
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { 
    color: "white", 
    fontSize: 18, 
    fontWeight: "600" 
},
});

export default CreateSaving;

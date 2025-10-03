import { useTheme } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { loadSettings, saveSettings } from "../../Utilities/ServiceSettings";

function Private() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);

  const [pin, setPin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState("");

  // טוען הגדרות
  useEffect(() => {
  (async () => {
    const s = await loadSettings();
    if (s?.privacy) {
      setPin(s.privacy.pin ?? false);
    }

    // בודק אם יש פינקוד מוגדר ומדליק אוטומתית
    const savedPin = await SecureStore.getItemAsync("userPin");
    if (savedPin) {
      setPin(true); 
    }

    setLoading(false);
  })();
}, []);


  const savePin = async () => {
    if (/^\d{4}$/.test(newPin)) {
      await SecureStore.setItemAsync("userPin", newPin);
      setPin(true);
      await saveSettings({ privacy: { pin: true } });
      setShowPinModal(false);
      setNewPin("");
      Alert.alert("הצלחה", "PIN נשמר בהצלחה!");
    } else {
      Alert.alert("שגיאה", "ה־PIN חייב להיות בדיוק 4 ספרות");
    }
  };

  // הפעלה של PIN
  const pinToggle = async (val) => {
    if (val) {
      setShowPinModal(true);
    } else {
      await SecureStore.deleteItemAsync("userPin");
      setPin(false);
      await saveSettings({ privacy: { pin: false } });
      Alert.alert("כבוי", "PIN כובה");
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.privateLabel }}>
          טוען הגדרות פרטיות...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.privateBackground }]}>
      <Text style={[styles.title, { color: colors.privateTitle }]}>פרטיות</Text>

      {/* PIN */}
      <View
        style={[styles.card, { backgroundColor: colors.privateCardBackground }]}
      >
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.privateLabel }]}>
            כניסה עם PIN
          </Text>
          <Switch value={pin} onValueChange={pinToggle} />
        </View>
      </View>

      {/* modal for PIN */}

      <Modal visible={showPinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>הגדרת PIN חדש</Text>
            <TextInput
              style={styles.input}
              value={newPin}
              onChangeText={setNewPin}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              placeholder="הכנס 4 ספרות"
            />
            <View style={styles.modalButtons}>
              <Button title="שמירה" onPress={savePin} />
              <Button
                title="ביטול"
                color="red"
                onPress={() => setShowPinModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 40,
  },
  card: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    fontSize: 22,
    textAlign: "center",
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
});

export default Private;

import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";

export default function LockScreen({ onUnlock }) {
  const [input, setInput] = useState("");

  const unlock = async () => {
    const savedPin = await SecureStore.getItemAsync("userPin");
      console.log("PIN שמור:", savedPin, "הוקלד:", input); 
    if (input === savedPin) {
      onUnlock();
    } else {
      Alert.alert("שגיאה", "PIN לא נכון");
      setInput("");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>אנא הכנס PIN</Text>
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={setInput}
        secureTextEntry
        keyboardType="numeric"
        maxLength={4}
      />
      <Button title="כניסה" onPress={unlock} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, marginBottom: 20 },
  input: {
    borderWidth: 1,
    width: 120,
    textAlign: "center",
    fontSize: 22,
    marginBottom: 20,
    padding: 5,
  },
});

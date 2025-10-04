import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

class Error extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("שגיאה גלובלית:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="alert-circle-outline" size={80} color="#e63946" />
          <Text style={styles.title}>אופס!</Text>
          <Text style={styles.message}>
            משהו השתבש במהלך הפעלת האפליקציה.
          </Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || "שגיאה לא צפויה"}
          </Text>

          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#d62828",
    marginTop: 10,
  },
  message: {
    fontSize: 18,
    color: "#444",
    textAlign: "center",
    marginVertical: 8,
  },
  errorText: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 25,
  },
  button: {
    backgroundColor: "#0077b6",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default Error;

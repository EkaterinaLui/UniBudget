import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { SettingsContext } from "../../Utilities/SettingsContext";

function General() {
  const { settings, updateSettings, loading } = useContext(SettingsContext);
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.generalLabel }}>טוען הגדרות...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.generalBackground }]}>
      <Text style={[styles.title, { color: colors.generalTitle }]}>
        הגדרות כלליות
      </Text>

      {/* מצב כהה */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.generalCardBackground,
            shadowColor: colors.generalCardShadow,
          },
        ]}
      >
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.generalLabel }]}>
            מצב כהה
          </Text>
          <Switch
            value={settings.theme === "dark"}
            onValueChange={(val) =>
              updateSettings({ theme: val ? "dark" : "light" })
            }
          />
        </View>
      </View>

      {/* מטבע */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.generalCardBackground,
            shadowColor: colors.generalCardShadow,
          },
        ]}
      >
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.generalLabel }]}>
            מטבע
          </Text>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: colors.generalPrimaryButton },
            ]}
            onPress={() => {
              const next =
                settings.currency === "₪"
                  ? "$"
                  : settings.currency === "$"
                  ? "€"
                  : "₪";
              updateSettings({ currency: next });
            }}
          >
            <Ionicons
              name="cash-outline"
              size={18}
              color={colors.generalPrimaryButtonText}
            />
            <Text
              style={[
                styles.buttonText,
                { color: colors.generalPrimaryButtonText },
              ]}
            >
              {settings.currency}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: "bold",
    marginLeft: 6,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default General;

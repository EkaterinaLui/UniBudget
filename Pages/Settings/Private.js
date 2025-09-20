import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Button,
  ActivityIndicator,
} from "react-native";
import { saveSettings, loadSettings } from "../../Utilities/ServiceSettings";
import { useTheme } from "@react-navigation/native";

function Private() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState(false);
  const [faceID, setFaceID] = useState(false);
  const [autoLock, setAutoLock] = useState(5); // דקות

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      if (s?.privacy) {
        setPin(s.privacy.pin ?? false);
        setFaceID(s.privacy.faceID ?? false);
        setAutoLock(s.privacy.autoLock ?? 5);
      }
      setLoading(false);
    })();
  }, []);

  const updatePrivacy = async (newValues) => {
    const newPrivacy = {
      pin,
      faceID,
      autoLock,
      ...newValues,
    };
    setPin(newPrivacy.pin);
    setFaceID(newPrivacy.faceID);
    setAutoLock(newPrivacy.autoLock);
    await saveSettings({ privacy: newPrivacy });
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
        style={[
          styles.card,
          {
            backgroundColor: colors.privateCardBackground,
            shadowColor: colors.privateCardShadow,
          },
        ]}
      >
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.privateLabel }]}>
            כניסה עם PIN
          </Text>
          <Switch
            value={pin}
            onValueChange={(val) => updatePrivacy({ pin: val })}
          />
        </View>
      </View>

      {/* Face ID */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.privateCardBackground,
            shadowColor: colors.privateCardShadow,
          },
        ]}
      >
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.privateLabel }]}>
            FaceID / TouchID
          </Text>
          <Switch
            value={faceID}
            onValueChange={(val) => updatePrivacy({ faceID: val })}
          />
        </View>
      </View>

      {/* Auto lock */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.privateCardBackground,
            shadowColor: colors.privateCardShadow,
          },
        ]}
      >
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.privateLabel }]}>
            נעילה אוטומטית
          </Text>
          <Button
            title={`${autoLock} דק׳`}
            onPress={() => {
              const next = autoLock === 1 ? 5 : autoLock === 5 ? 10 : 1;
              updatePrivacy({ autoLock: next });
            }}
            color={colors.privateTime}
          />
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
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Private;

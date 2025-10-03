import { useTheme } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { loadSettings, saveSettings } from "../../Utilities/ServiceSettings";

//  הגדרות ברירת מחדל להתראות
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // באנר בזמן אמת
    shouldShowList: true, // יוצג במרכז ההתראות
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function Notific() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [budgetLimit, setBudgetLimit] = useState(true); // דלוק כברירת מחדל


  useEffect(() => {
    (async () => {
      try {
        const s = await loadSettings();
        if (s?.notifications) {
          setBudgetLimit(s.notifications.budgetLimit ?? true);
        }
      } catch (err) {
        console.log("שגיאה בטעינת הגדרות:", err);
      }
      setLoading(false);
    })();
  }, []);

  // שמירת ההגדרה
  const updateBudgetLimit = async (val) => {
    setBudgetLimit(val);
    try {
      await saveSettings({
        notifications: {
          budgetLimit: val,
        },
      });

      if (val) {
        // שולח התראה לדוגמה כשהמשתמש מדליק
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "חריגה מתקציב",
            body: "תתחיל לקבל התראות אם הקבוצה או קטגוריה חורגים מהתקציב",
          },
          trigger: null, // מיידי
        });
      }
    } catch (error) {
      console.log("שגיאה בשמירת הגדרה:", error);
      Alert.alert("שגיאה", "שמירת ההגדרות נכשלה");
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.notificationLabel }}>
          טוען הגדרות התראות...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { backgroundColor: colors.notificationBackground }]}
    >
      <Text style={[styles.title, { color: colors.notificationTitle }]}>
        התראות
      </Text>

      {/* כרטיס חריגת תקציב */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.notificationCardBackground,
            shadowColor: colors.notificationCardShadow,
          },
        ]}
      >
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.notificationLabel }]}>
            התראה על חריגת תקציב
          </Text>
          <Switch value={budgetLimit} onValueChange={updateBudgetLimit} />
        </View>
        {budgetLimit && (
          <Text style={[styles.info, { color: colors.notificationInfo }]}>
            תקבל התראות על חריגה מתקציב הקבוצה או הקטגוריות.
          </Text>
        )}
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
  info: {
    marginTop: 10,
    fontSize: 14,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Notific;

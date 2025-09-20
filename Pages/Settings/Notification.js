import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as Notifications from "expo-notifications";
import DateTimePicker from "@react-native-community/datetimepicker";
import { saveSettings, loadSettings } from "../../Utilities/ServiceSettings";
import { useTheme } from "@react-navigation/native";

// בקשת הרשאות (לוקאליות בלבד)
async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("שגיאה", "לא אושרו הרשאות לשליחת התראות");
    return false;
  }
  return true;
}

function Notification() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);

  const [reminder, setReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date(2024, 0, 1, 20, 0));
  const [transaction, setTransaction] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // טעינת הגדרות + הרשאות
  useEffect(() => {
    (async () => {
      await requestNotificationPermissions();
      const s = await loadSettings();
      if (s?.notifications) {
        setReminder(s.notifications.reminder ?? false);
        setTransaction(s.notifications.transaction ?? false);
        setBudgetLimit(s.notifications.budgetLimit ?? false);

        if (
          s.notifications.reminderHour !== undefined &&
          s.notifications.reminderMinute !== undefined
        ) {
          setReminderTime(
            new Date(
              2024,
              0,
              1,
              s.notifications.reminderHour,
              s.notifications.reminderMinute
            )
          );
        }
      }
      setLoading(false);
    })();
  }, []);

  // עדכון הגדרות + שמירה
  const updateNotification = async (newValues) => {
    const newSettings = {
      notifications: {
        reminder,
        transaction,
        budgetLimit,
        ...newValues,
      },
    };

    if (newValues.reminder !== undefined) setReminder(newValues.reminder);
    if (newValues.transaction !== undefined)
      setTransaction(newValues.transaction);
    if (newValues.budgetLimit !== undefined)
      setBudgetLimit(newValues.budgetLimit);

    await saveSettings(newSettings);
  };

  // תזכורת יומית
  const dailyReminder = async (hour, minute) => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "תזכורת יומית ",
        body: "אל תשכח לעדכן את ההוצאות שלך היום!",
      },
      trigger: { hour, minute, repeats: true },
    });
    Alert.alert(
      "נקבעה",
      `תזכורת יומית נקבעה לשעה ${hour}:${minute.toString().padStart(2, "0")}`
    );

    await saveSettings({
      notifications: {
        reminder: true,
        reminderHour: hour,
        reminderMinute: minute,
        transaction,
        budgetLimit,
      },
    });
  };

  const onTimeSelected = (event, selectedDate) => {
    if (event.type === "dismissed") {
      setShowPicker(false);
      return;
    }
    setShowPicker(false);
    if (selectedDate) {
      setReminderTime(selectedDate);
      const hour = selectedDate.getHours();
      const minute = selectedDate.getMinutes();
      dailyReminder(hour, minute);
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

      {/* תזכורת יומית */}
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
            תזכורת יומית
          </Text>
          <Switch
            value={reminder}
            onValueChange={async (val) => {
              setReminder(val);
              if (val) {
                setShowPicker(true);
              } else {
                await Notifications.cancelAllScheduledNotificationsAsync();
                updateNotification({ reminder: false });
              }
            }}
          />
        </View>
        {reminder && (
          <Text style={[styles.info, { color: colors.notificationInfo }]}>
            תזכורת נקבעה לשעה {reminderTime.getHours()}:
            {reminderTime.getMinutes().toString().padStart(2, "0")}
          </Text>
        )}
      </View>

      {/* בחירת שעה */}
      {showPicker && (
        <DateTimePicker
          value={reminderTime}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onTimeSelected}
        />
      )}

      {/* התראה על עסקה חדשה */}
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
            התראה על עסקה חדשה
          </Text>
          <Switch
            value={transaction}
            onValueChange={(val) => {
              setTransaction(val);
              updateNotification({ transaction: val });
              if (val) {
                Notifications.scheduleNotificationAsync({
                  content: {
                    title: "עסקה חדשה",
                    body: "נוספה הוצאה חדשה לחשבון שלך",
                  },
                  trigger: null, // מידית
                });
              }
            }}
          />
        </View>
      </View>

      {/* התראה על חריגת תקציב */}
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
          <Switch
            value={budgetLimit}
            onValueChange={(val) => {
              setBudgetLimit(val);
              updateNotification({ budgetLimit: val });
              if (val) {
                Notifications.scheduleNotificationAsync({
                  content: {
                    title: "⚠️ חריגה מתקציב",
                    body: "הגעת לגבול התקציב שלך",
                  },
                  trigger: null, // מידית
                });
              }
            }}
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

export default Notification;

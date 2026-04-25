import { useNavigation } from "@react-navigation/native";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../firebase";

// דף ניהול האפליקציה שמאפשר למנהלי אפליקציה לצפות בכל המשתמשים,
// לחסום או למחוק משתמשים, לשחזר משתמשים מגיבוי ולהגדיר משתמשים כמנהלי אפליקציה
function AppAdmin({ currentUser }) {
  // שימוש בניווט כדי לנווט בין המסכים השונים של האפליקציה
  const navigation = useNavigation();
  // סטייטים לניהול רשימת המשתמשים, מנהלי האפליקציה ומצב הטעינה
  const [users, setUsers] = useState([]);
  // רשימת מנהלי האפליקציה כדי להציג אותם בנפרד מהמשתמשים הרגילים
  const [admins, setAdmins] = useState([]);
  // סטייט לניהול מצב הטעינה בזמן טעינת הנתונים מהמסד
  const [loading, setLoading] = useState(true);

  // בעת טעינת הדף, בודקים אם המשתמש הנוכחי הוא מנהל אפליקציה.
  // אם לא, מציגים הודעת שגיאה ומנווטים חזרה למסך הבית.
  // אם כן, טוענים את רשימת המשתמשים מהמסד ומפרידים בין מנהלי האפליקציה למשתמשים הרגילים כדי להציג אותם בנפרד.
  useEffect(() => {
    if (currentUser?.role !== "appAdmin") {
      Alert.alert("אין לך הרשאה לגשת למסך זה");
      if (navigation?.replace) {
        navigation.replace("Home");
      } else if (navigation?.navigate) {
        navigation.navigate("Home");
      }
    }

    getAllUsers();
  }, []);

  // פונקציה שמטענת את כל המשתמשים מהמסד ומפרידה בין מנהלי האפליקציה למשתמשים הרגילים כדי להציג אותם בנפרד
  const getAllUsers = async () => {
    setLoading(true);
    // מנסה לקבל את כל המשתמשים מהמסד ומפריד אותם לפי תפקיד כדי להציג מנהלי אפליקציה בנפרד ממשתמשים רגילים
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // מפרידים לפי תפקיד
      const appAdmins = data.filter((u) => u.role === "appAdmin");
      const normalUsers = data.filter((u) => u.role !== "appAdmin");

      setAdmins(appAdmins);
      setUsers(normalUsers);
    } catch (err) {
      console.log("Error getting users:", err);
      Alert.alert("שגיאה בטעינת משתמשים");
    } finally {
      setLoading(false);
    }
  };
  // פונקציה לחסימת משתמש או הסרת החסימה שלו על ידי עדכון השדה "blocked" במסד.
  const blockUser = async (id, blocked) => {
    // מנסה לעדכן את שדה "blocked" של המשתמש במסד כדי לחסום או להסיר חסימה, ומציג הודעה בהתאם לתוצאה
    try {
      const status = !blocked;
      await updateDoc(doc(db, "users", id), { blocked: status });
      Alert.alert(status ? "המשתמש נחסם בהצלחה" : "החסימה הוסרה בהצלחה");
      getAllUsers();
    } catch (error) {
      Alert.alert("שגיאה בחסימת משתמש");
      console.error(error);
    }
  };

  // פונקציה למחיקת משתמש על ידי מחיקת המסמך שלו במסד, עם אפשרות לגיבוי הנתונים לפני המחיקה
  const deleteUser = async (id) => {
    // לפני מחיקת המשתמש, מציגים התראה עם אפשרות לגיבוי הנתונים שלו.
    // אם המשתמש מאשר את המחיקה, מנסים לגבות את הנתונים שלו לאוסף "backups" לפני שמוחקים את המסמך שלו מהאוסף "users".
    // לאחר המחיקה, מציגים הודעה ומעדכנים את רשימת המשתמשים.
    Alert.alert("אישור מחיקה", "האם למחוק את המשתמש הזה?", [
      { text: "בטל", style: "cancel" },
      {
        text: "מחק",
        style: "destructive",
        // בעת אישור המחיקה, מנסים לגבות את הנתונים של המשתמש לפני שמוחקים אותו מהמסד
        onPress: async () => {
          try {
            const userRef = doc(db, "users", id);
            const userSnap = await getDoc(userRef);
            // אם נמצאו נתונים, שומרים אותם באוסף "backups" לפני המחיקה
            if (userSnap.exists()) {
              await setDoc(doc(db, "backups", id), userSnap.data());
            }
            // לאחר הגיבוי, מוחקים את המסמך של המשתמש מהאוסף "users"
            // אם המחיקה מצליחה, מציגים הודעה ומעדכנים את רשימת המשתמשים. אם יש שגיאה, מציגים הודעת שגיאה.
            await deleteDoc(userRef);
            Alert.alert("המשתמש נמחק בהצלחה");
            getAllUsers();
          } catch (error) {
            Alert.alert("שגיאה במחיקת משתמש");
            console.error(error);
          }
        },
      },
    ]);
  };
  // פונקציה לשחזור משתמש מגיבוי על ידי העתקת הנתונים שלו מהאוסף "backups" חזרה לאוסף "users"
  const restoreUser = async (id) => {
    try {
      const backupRef = doc(db, "backups", id);
      const backupSnap = await getDoc(backupRef);
      if (!backupSnap.exists()) {
        Alert.alert("אין גיבוי למשתמש הזה");
        return;
      }
      // אם נמצא גיבוי, משחזרים את הנתונים שלו לאוסף "users" ומציגים הודעה בהתאם לתוצאה
      await setDoc(doc(db, "users", id), backupSnap.data(), { merge: true });
      Alert.alert("המשתמש שוחזר בהצלחה");
      getAllUsers();
    } catch (error) {
      Alert.alert("שגיאה בשחזור משתמש");
      console.error(error);
    }
  };
  // פונקציה להפיכת משתמש למנהל אפליקציה על ידי עדכון השדה
  // "appAdmin" שלו ל-"role"
  const makeAppAdmin = async (id) => {
    Alert.alert("אישור", "להפוך משתמש זה למנהל אפליקציה?", [
      { text: "בטל", style: "cancel" },
      {
        text: "אשר",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "users", id), { role: "appAdmin" });
            Alert.alert("המשתמש קיבל הרשאת AppAdmin");
            getAllUsers();
          } catch (error) {
            Alert.alert("שגיאה בעדכון הרשאה");
            console.error(error);
          }
        },
      },
    ]);
  };
  // פונקציה שמטענת את רשימת החובות של המשתמש הנוכחי על ידי חישוב הקשרים בין ההוצאות, החברים והחובות שסוגרו
  const renderUserCard = (item) => {
    const lastLogin = item.lastLogin?.toDate
      ? item.lastLogin.toDate()
      : new Date(item.lastLogin || 0);
    // קובע אם המשתמש נחשב לא פעיל אם הוא לא התחבר מעל 6 חודשים
    const inactive =
      Date.now() - lastLogin.getTime() > 1000 * 60 * 60 * 24 * 180;

    return (
      <View style={styles.userCard}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.roleText}>תפקיד: {item.role || "user"}</Text>

        <Text
          style={[
            styles.status,
            inactive
              ? styles.inactive
              : item.blocked
                ? styles.blocked
                : styles.active,
          ]}
        >
          {inactive ? "לא התחבר מעל 6 חודשים" : item.blocked ? "חסום" : "פעיל"}
        </Text>

        <Text style={styles.lastLogin}>
          התחבר לאחרונה:{" "}
          {lastLogin.getTime() > 0
            ? formatDistanceToNow(lastLogin, { locale: he, addSuffix: true })
            : "אין נתונים"}
        </Text>

        <View style={styles.buttonsRow}>
          <TouchableOpacity
            onPress={() => deleteUser(item.id)}
            style={[styles.button, styles.deleteBtn]}
          >
            <Text style={styles.btnText}>מחק</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => blockUser(item.id, item.blocked)}
            style={[
              styles.button,
              item.blocked ? styles.unblockBtn : styles.blockBtn,
            ]}
          >
            <Text style={styles.btnText}>
              {item.blocked ? "הסר חסימה" : "חסום"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => restoreUser(item.id)}
            style={[styles.button, styles.restoreBtn]}
          >
            <Text style={styles.btnText}>שחזר</Text>
          </TouchableOpacity>

          {currentUser?.role === "appAdmin" && item.role === "user" && (
            <TouchableOpacity
              onPress={() => makeAppAdmin(item.id)}
              style={[styles.button, styles.makeAdminBtn]}
            >
              <Text style={styles.btnText}>להגדיר כמנהל</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196f3" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>ניהול אפליקציה</Text>

      {/* רשימת מנהלי אפליקציה */}
      <Text style={styles.sectionTitle}>מנהלי אפליקציה</Text>
      {admins.length === 0 ? (
        <Text style={styles.emptyText}>אין מנהלי אפליקציה</Text>
      ) : (
        admins.map((admin) => (
          <View key={admin.id}>{renderUserCard(admin)}</View>
        ))
      )}

      {/* רשימת משתמשים רגילים */}
      <Text style={styles.sectionTitle}>👥 משתמשים רגילים</Text>
      {users.length === 0 ? (
        <Text style={styles.emptyText}>אין משתמשים להצגה</Text>
      ) : (
        users.map((user) => <View key={user.id}>{renderUserCard(user)}</View>)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    padding: 12,
    marginBottom: 75,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    marginTop: 60,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
    color: "#023e8a",
  },
  userCard: {
    backgroundColor: "#fff",
    padding: 12,
    marginVertical: 6,
    borderRadius: 10,
    elevation: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
  },
  email: {
    color: "#555",
  },
  roleText: {
    color: "#888",
    fontSize: 13,
  },
  status: {
    marginTop: 4,
    fontWeight: "bold",
  },
  inactive: {
    color: "red",
  },
  blocked: {
    color: "orange",
  },
  active: {
    color: "green",
  },
  lastLogin: {
    fontSize: 12,
    color: "#777",
  },
  buttonsRow: {
    flexDirection: "row",
    marginTop: 10,
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
  },
  deleteBtn: {
    backgroundColor: "#E63946",
  },
  blockBtn: {
    backgroundColor: "#F4A261",
  },
  unblockBtn: {
    backgroundColor: "#2A9D8F",
  },
  restoreBtn: {
    backgroundColor: "#2A9D8F",
  },
  makeAdminBtn: {
    backgroundColor: "#264653",
  },
  btnText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#555",
    textAlign: "center",
    marginBottom: 10,
    fontStyle: "italic",
  },
});

export default AppAdmin;

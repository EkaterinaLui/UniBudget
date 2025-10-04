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
  View
} from "react-native";
import { db } from "../firebase";

function AppAdmin({ currentUser }) {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const getAllUsers = async () => {
    setLoading(true);
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

  const blockUser = async (id, blocked) => {
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

  const deleteUser = async (id) => {
    Alert.alert("אישור מחיקה", "האם למחוק את המשתמש הזה?", [
      { text: "בטל", style: "cancel" },
      {
        text: "מחק",
        style: "destructive",
        onPress: async () => {
          try {
            const userRef = doc(db, "users", id);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              await setDoc(doc(db, "backups", id), userSnap.data());
            }

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

  const restoreUser = async (id) => {
    try {
      const backupRef = doc(db, "backups", id);
      const backupSnap = await getDoc(backupRef);

      if (!backupSnap.exists()) {
        Alert.alert("אין גיבוי למשתמש הזה");
        return;
      }

      await setDoc(doc(db, "users", id), backupSnap.data(), { merge: true });
      Alert.alert("המשתמש שוחזר בהצלחה");
      getAllUsers();
    } catch (error) {
      Alert.alert("שגיאה בשחזור משתמש");
      console.error(error);
    }
  };

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

  const renderUserCard = (item) => {
    const lastLogin = item.lastLogin?.toDate
      ? item.lastLogin.toDate()
      : new Date(item.lastLogin || 0);

    const inactive = Date.now() - lastLogin.getTime() > 1000 * 60 * 60 * 24 * 180;

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
          {inactive
            ? "לא התחבר מעל 6 חודשים"
            : item.blocked
            ? "חסום"
            : "פעיל"}
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
    fontSize:10
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

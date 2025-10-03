import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebase";

const { width } = Dimensions.get("window");

function AddUsers({ navigation, route }) {
  const { groupId, groupName, userId } = route.params || {};
  const { colors } = useTheme();

  const [userCodeInput, setUserCodeInput] = useState("");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [currentMembers, setCurrentMembers] = useState([]);

  useEffect(() => {
    if (!db || !groupId) return;

    const groupDocRef = doc(db, `groups/${groupId}`);
    const unsubscribe = onSnapshot(groupDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setCurrentMembers(docSnap.data().members || []);
      } else {
        setCurrentMembers([]);
      }
    });

    return () => unsubscribe();
  }, [groupId]);

  const handleGoBack = () => navigation.goBack();

  const handleAddUser = async () => {
    if (!userCodeInput.trim()) {
      Alert.alert("שגיאה", "נא להזין קוד משתמש");
      return;
    }
    if (!db || !userId || !groupId) {
      Alert.alert("שגיאה", "נתוני קבוצה או משתמש חסרים");
      return;
    }

    setIsAddingUser(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("uniqueCode", "==", userCodeInput.trim())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert("שגיאה", "לא נמצא משתמש עם הקוד הזה");
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const foundUserId = userDoc.id;

      if (currentMembers.some((m) => m.uid === foundUserId)) {
        Alert.alert("שים לב", "המשתמש כבר נמצא בקבוצה");
        return;
      }

      const groupDocRef = doc(db, "groups", groupId);
      await updateDoc(groupDocRef, {
        members: arrayUnion({ uid: foundUserId, name: userData.name }),
        memberIds: arrayUnion(foundUserId),
      });

      Alert.alert(
        "הצלחה",
        `המשתמש "${userData.name}" נוסף לקבוצה "${groupName || "ללא שם"}"`
      );
      setUserCodeInput("");
    } catch (error) {
      console.error("שגיאה בהוספה:", error);
      Alert.alert("שגיאה", "אירעה תקלה בהוספת המשתמש. נסה שוב מאוחר יותר.");
    } finally {
      setIsAddingUser(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.keyboardAvoiding,
        { backgroundColor: colors.addUsersBackground },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { backgroundColor: colors.addUsersBackground },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* כפתור חזור */}
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons
              name="arrow-forward"
              size={30}
              color={colors.addUsersPrimary}
            />
          </TouchableOpacity>

          {/* כותרת */}
          <Text style={[styles.title, { color: colors.addUsersTitle }]}>
            הוספת משתמש חדש
          </Text>

          {/* שדה קוד משתמש */}
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.addUsersBorder,
                backgroundColor: colors.addUsersCard,
                color: colors.addUsersText,
              },
            ]}
            placeholder="הזן קוד משתמש..."
            placeholderTextColor={colors.addUsersBorder}
            value={userCodeInput}
            onChangeText={setUserCodeInput}
            editable={!isAddingUser}
          />

          {/* כפתור הוספה */}
          <TouchableOpacity
            style={[
              styles.addButton,
              {
                backgroundColor:
                  userCodeInput.trim() && !isAddingUser
                    ? colors.addUsersPrimary
                    : colors.addUsersPrimaryDisabled,
              },
            ]}
            onPress={handleAddUser}
            disabled={!userCodeInput.trim() || isAddingUser}
          >
            {isAddingUser ? (
              <ActivityIndicator
                size="small"
                color={colors.addUsersButtonText}
              />
            ) : (
              <Text
                style={[
                  styles.addButtonText,
                  { color: colors.addUsersButtonText },
                ]}
              >
                הוסף משתמש
              </Text>
            )}
          </TouchableOpacity>

          {/* רשימת חברים */}
          <Text style={[styles.subtitle, { color: colors.addUsersSubtitle }]}>
            משתמשים בקבוצה:
          </Text>

          {currentMembers.length > 0 ? (
            currentMembers.map((item, index) => (
              <View
                key={`${item.uid}_${index}`}
                style={[
                  styles.memberItem,
                  { backgroundColor: colors.addUsersCard },
                ]}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={28}
                  color={colors.addUsersPrimary}
                />
                <Text
                  style={[styles.memberText, { color: colors.addUsersTitle }]}
                >
                  {item.name}
                </Text>
              </View>
            ))
          ) : (
            <Text
              style={[styles.emptyListText, { color: colors.addUsersEmpty }]}
            >
              אין משתתפים עדיין
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoiding: { flex: 1 },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  container: {
    marginBottom: 30,
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    top: -50,
    left: 0,
    zIndex: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 25,
    textAlign: "center",
  },
  input: {
    width: width * 0.9,
    height: 50,
    borderWidth: 1,
    borderRadius: 30,
    paddingHorizontal: 20,
    fontSize: 18,
    marginBottom: 16,
  },
  addButton: {
    width: width * 0.9,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 35,
    marginBottom: 15,
    alignSelf: "flex-start",
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 25,
    marginBottom: 12,
  },
  memberText: {
    fontSize: 18,
  },
  emptyListText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
});

export default AddUsers;

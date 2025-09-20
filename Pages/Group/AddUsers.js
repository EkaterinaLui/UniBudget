import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import {
  doc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

const { width } = Dimensions.get("window");

function AddUsers({ navigation, route, db, userId }) {
  const { groupId, groupName } = route.params || {};
  const { colors } = useTheme();

  const [userCodeInput, setUserCodeInput] = useState("");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [currentMembers, setCurrentMembers] = useState([]);

  useEffect(() => {
    if (!db || !groupId) return;

    const groupDocRef = doc(db, `groups/${groupId}`);
    const unsubscribe = onSnapshot(groupDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentMembers(data.members || []);
      } else {
        setCurrentMembers([]);
      }
    });

    return () => unsubscribe();
  }, [db, groupId]);

  const handleGoBack = () => navigation.goBack();

  const handleAddUser = async () => {
    if (userCodeInput.trim() === "") {
      Alert.alert("שגיאה", "נא להזין קוד משתמש");
      return;
    }
    if (!db || !userId || !groupId) {
      Alert.alert("שגיאה", "מידע חסר לצורך הוספה");
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
        setIsAddingUser(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const foundUserId = userDoc.id;

      const alreadyMember = currentMembers.some((m) => m.uid === foundUserId);
      if (alreadyMember) {
        Alert.alert("המשתמש כבר בקבוצה");
        setIsAddingUser(false);
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
      Alert.alert("שגיאה", "אירעה שגיאה, נסו שוב מאוחר יותר.");
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* כפתור חזור */}
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons
              name="arrow-back"
              size={30}
              color={colors.addUsersPrimary}
            />
          </TouchableOpacity>

          {/* כותרת */}
          <Text style={[styles.title, { color: colors.addUsersTitle }]}>
            הוספת משתמש
          </Text>

          {/* שדה קוד משתמש */}
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.addUsersBorder,
                backgroundColor: colors.addUsersCard,
                color: colors.addUsersText,
                shadowColor: colors.addUsersShadow,
              },
            ]}
            placeholder="הזן קוד משתמש"
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
                backgroundColor: colors.addUsersPrimary,
                shadowColor: colors.addUsersShadow,
              },
              (!userCodeInput.trim() || isAddingUser) && {
                backgroundColor: colors.addUsersPrimaryDisabled,
              },
            ]}
            onPress={handleAddUser}
            disabled={!userCodeInput.trim() || isAddingUser}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.addButtonText,
                { color: colors.addUsersButtonText },
              ]}
            >
              {isAddingUser ? "מוסיף..." : "הוסף משתמש"}
            </Text>
          </TouchableOpacity>

          {isAddingUser && (
            <ActivityIndicator
              size="small"
              color={colors.addUsersPrimary}
              style={{ marginTop: 10 }}
            />
          )}

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
                  {
                    backgroundColor: colors.addUsersCard,
                    shadowColor: colors.addUsersShadow,
                  },
                ]}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={28}
                  color={colors.addUsersPrimary}
                  style={{ marginRight: 10 }}
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
  keyboardAvoiding: {
    flex: 1,
  },
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
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 25,
  },
  input: {
    width: width * 0.9,
    height: 50,
    borderWidth: 1,
    borderRadius: 30,
    paddingHorizontal: 20,
    fontSize: 18,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  addButton: {
    width: width * 0.9,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
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
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
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

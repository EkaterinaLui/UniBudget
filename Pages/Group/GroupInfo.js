import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";

const GroupInfo = () => {
  const route = useRoute();
  const { groupId, userId } = route.params || {};
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [groupData, setGroupData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (!groupId || !userId) {
      Alert.alert("שגיאה", "נתוני קבוצה או משתמש חסרים.");
      navigation.goBack();
      return;
    }

    const groupRef = doc(db, "groups", groupId);
    const unsubscribe = onSnapshot(
      groupRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGroupData(data);
          setIsAdmin(data.adminIds?.includes(userId));
        } else {
          Alert.alert("שגיאה", "הקבוצה לא נמצאה.");
          navigation.goBack();
        }
      },
      (error) => {
        console.error("שגיאה בטעינת נתוני קבוצה:", error);
        Alert.alert("שגיאה", "טעינת נתוני הקבוצה נכשלה.");
      }
    );

    return () => unsubscribe();
  }, [groupId, userId, navigation]);

  const deleteMember = async () => {
    if (!isAdmin || !selectedUser) {
      Alert.alert("שגיאה", "רק אדמין יכול להסיר חברים.");
      return;
    }

    Alert.alert("הסרת חבר", "האם אתה בטוח שברצונך להסיר את המשתמש הזה?", [
      { text: "ביטול", style: "cancel", onPress: () => setModalVisible(false) },
      {
        text: "אישור",
        style: "destructive",
        onPress: async () => {
          const groupRef = doc(db, "groups", groupId);
          await updateDoc(groupRef, {
            members: arrayRemove({
              name: selectedUser.name,
              uid: selectedUser.uid,
            }),
            memberIds: arrayRemove(selectedUser.uid),
            adminIds: arrayRemove(selectedUser.uid),
          });
          Alert.alert("בוצע", `"${selectedUser.name}" הוסר מהקבוצה`);
          setModalVisible(false);
        },
      },
    ]);
  };

  const memberPress = (member) => {
    if (member.uid === userId) {
      navigation.navigate("Profil");
    } else {
      setSelectedUser(member);
      setModalVisible(true);
    }
  };

  const deleteGroup = async () => {
    if (!isAdmin) {
      Alert.alert("שגיאה", "רק אדמין יכול למחוק קבוצה.");
      return;
    }

    Alert.alert("מחיקת קבוצה", "האם למחוק את כל הקבוצה? פעולה זו בלתי הפיכה.", [
      { text: "ביטול", style: "cancel" },
      {
        text: "אישור",
        style: "destructive",
        onPress: async () => {
          try {
            const subcollections = [
              "archive",
              "categories",
              "expenses",
              "settledDebts",
              "messages",
              "reports",
              "saving",
            ];

            for (const sub of subcollections) {
              const subRef = collection(db, "groups", groupId, sub);
              const snapshot = await getDocs(subRef);
              await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
            }

            await deleteDoc(doc(db, "groups", groupId));
            Alert.alert("בוצע", "הקבוצה וכל הנתונים נמחקו.");
            navigation.popToTop();
          } catch (error) {
            console.error("שגיאה במחיקת קבוצה:", error);
            Alert.alert("שגיאה", "אירעה תקלה במחיקה.");
          }
        },
      },
    ]);
  };


  const groupChat = async () => {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, {
      openedBy: arrayUnion(userId),
    });

    navigation.navigate("צאט", {
      screen: "Chat",
      params: {
        chatId: groupId,
        chatName: groupData.groupName,
        chatType: "group",
        userId,
        userName:
          groupData.members.find((m) => m.uid === userId)?.name || "אני",
      },
    });
  };


  const openPrivateChat = async (member) => {
    if (!member) return;

    const conversationId =
      userId < member.uid ? `${userId}_${member.uid}` : `${member.uid}_${userId}`;
    const chatRef = doc(db, "privateChats", conversationId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        participantsIds: [userId, member.uid],
        participants: [
          {
            uid: userId,
            name:
              groupData.members.find((m) => m.uid === userId)?.name || "אני",
          },
          { uid: member.uid, name: member.name },
        ],
        createdAt: serverTimestamp(),
        openedBy: [userId], 
      });
    } else {
      await updateDoc(chatRef, {
        openedBy: arrayUnion(userId),
      });
    }

    navigation.navigate("צאט", {
      screen: "Chat",
      params: {
        chatId: conversationId,
        chatName: member.name,
        chatType: "private",
        userId,
        userName:
          groupData.members.find((m) => m.uid === userId)?.name || "אני",
        otherUserId: member.uid,
      },
    });
  };

  const leaveGroup = async () => {
    const groupRef = doc(db, "groups", groupId);

    await updateDoc(groupRef, {
      members: arrayRemove({
        uid: userId,
        name: groupData.members.find((m) => m.uid === userId)?.name,
      }),
      memberIds: arrayRemove(userId),
      adminIds: arrayRemove(userId),
    });

    const updateSnap = await getDoc(groupRef);
    if (updateSnap.exists()) {
      const updateData = updateSnap.data();

      if (updateData.memberIds.length === 0) {
        await deleteDoc(groupRef);
        Alert.alert("יציאה", "עזבת את הקבוצה והקבוצה נמחקה.");
        navigation.popToTop();
        return;
      }

      if (
        (!updateData.adminIds || updateData.adminIds.length === 0) &&
        updateData.memberIds.length > 0
      ) {
        const newAdmin = updateData.memberIds[0];
        await updateDoc(groupRef, { adminIds: arrayUnion(newAdmin) });
      }
    }

    Alert.alert("יציאה", "עזבת את הקבוצה.");
    navigation.popToTop();
  };

  if (!groupData) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>טוען נתונים...</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* כפתור חזור */}
      <TouchableOpacity
        style={[
          styles.backButton,
          {
            top: insets.top + 10,
            backgroundColor: colors.card,
            shadowColor: colors.shadow,
          },
        ]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-forward" size={24} color={colors.text} />
      </TouchableOpacity>

      <ScrollView>
        <View style={styles.header}>
          <Text style={[styles.groupName, { color: colors.text }]}>
            {groupData.groupName}
          </Text>
        </View>

        {/* רשימת חברים */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          חברי הקבוצה
        </Text>
        <View style={styles.membersContainer}>
          {groupData.members.map((member) => (
            <TouchableOpacity
              key={member.uid}
              style={[styles.memberCard, { backgroundColor: colors.userCard }]}
              onPress={() => memberPress(member)}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    marginRight: 8,
                    backgroundColor: groupData.adminIds?.includes(member.uid)
                      ? "green"
                      : "gray",
                  }}
                />
                <Text style={[styles.memberName, { color: colors.text }]}>
                  {member.name}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* פעולות */}
        <View style={styles.actionsContainer}>
          {isAdmin && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.buttonPrimary },
              ]}
              onPress={() =>
                navigation.navigate("AddUsers", { groupId, userId })
              }
            >
              <Ionicons
                name="person-add-outline"
                size={20}
                color={colors.buttonText}
              />
              <Text style={[styles.actionText, { color: colors.buttonText }]}>
                הוספת חבר
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.buttonPrimary },
            ]}
            onPress={groupChat}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={20}
              color={colors.buttonText}
            />
            <Text style={[styles.actionText, { color: colors.buttonText }]}>
              פתיחת צאט קבוצה
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.buttonDanger },
            ]}
            onPress={leaveGroup}
          >
            <Ionicons name="exit-outline" size={20} color={colors.buttonText} />
            <Text style={[styles.actionText, { color: colors.buttonText }]}>
              יציאה מהקבוצה
            </Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.buttonDanger },
              ]}
              onPress={deleteGroup}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={colors.buttonText}
              />
              <Text style={[styles.actionText, { color: colors.buttonText }]}>
                מחיקת קבוצה
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={[
            styles.modalOverlay,
            { backgroundColor: colors.modalOverlay },
          ]}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.modalBackground },
            ]}
          >
            {selectedUser && (
              <>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selectedUser.name}
                </Text>

                {/* הודעה פרטית */}
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    { backgroundColor: colors.modalButtonBackground },
                  ]}
                  onPress={() => {
                    openPrivateChat(selectedUser);
                    setModalVisible(false);
                  }}
                >
                  <Ionicons
                    name="chatbubbles-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.modalButtonText, { color: colors.primary }]}
                  >
                    שליחת הודעה
                  </Text>
                </TouchableOpacity>

                {/* מחיקת משתמש */}
                {isAdmin && selectedUser.uid !== userId && (
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      { backgroundColor: colors.modalDeleteBackground },
                    ]}
                    onPress={deleteMember}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={colors.danger}
                    />
                    <Text
                      style={[styles.modalButtonText, { color: colors.danger }]}
                    >
                      מחיקת משתמש
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text
                style={[
                  styles.closeButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                סגירה
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    borderRadius: 50,
    padding: 8,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  header: { padding: 20, alignItems: "center", marginBottom: 20 },
  groupName: { fontSize: 26, fontWeight: "bold", textAlign: "center" },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  membersContainer: { paddingHorizontal: 20 },
  memberCard: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  memberName: { fontSize: 16, fontWeight: "500" },
  actionsContainer: { marginTop: 20, paddingHorizontal: 20 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  actionText: { fontSize: 16, fontWeight: "bold", marginLeft: 10 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    width: "100%",
    justifyContent: "center",
    marginBottom: 10,
    borderRadius: 8,
  },
  modalButtonText: { fontSize: 16, marginLeft: 10 },
  closeButton: { marginTop: 10 },
  closeButtonText: { fontSize: 16 },
});

export default GroupInfo;

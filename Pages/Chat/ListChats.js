import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useTheme } from "@react-navigation/native";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../firebase";

const ListChats = ({ userId, userName }) => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const unsubscribers = [];

    // 🔹 קבוצות – קודם כל שולפים לפי חברות
    const groupQuery = query(
      collection(db, "groups"),
      where("memberIds", "array-contains", userId)
    );

    const unsubGroups = onSnapshot(groupQuery, (snapshot) => {
      const groups = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          type: "group",
          name: doc.data().groupName || "קבוצה ללא שם",
          ...doc.data(),
        }))

        .filter((g) => g.openedBy?.includes(userId));

      groups.forEach((g) => {
        const lastMsgQuery = query(
          collection(db, "groups", g.id, "messages"),
          orderBy("createdAt", "desc"),
          limit(1)
        );

        const unsubLast = onSnapshot(lastMsgQuery, (msgSnap) => {
          if (!msgSnap.empty) g.lastMessage = msgSnap.docs[0].data();

          setChats((prev) => {
            const others = prev.filter((c) => c.id !== g.id);
            return [...others, g];
          });
        });

        unsubscribers.push(unsubLast);
      });

      setLoading(false);
    });
    unsubscribers.push(unsubGroups);

    //  צ'אטים פרטיים – קודם כל שולפים לפי המשתתפים
    const privateQuery = query(
      collection(db, "privateChats"),
      where("participantsIds", "array-contains", userId)
    );

    const unsubPrivate = onSnapshot(privateQuery, (snapshot) => {
      const privates = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          type: "private",
          ...doc.data(),
        }))

        .filter((p) => p.openedBy?.includes(userId));

      privates.forEach((p) => {
        const lastMsgQuery = query(
          collection(db, "privateChats", p.id, "messages"),
          orderBy("createdAt", "desc"),
          limit(1)
        );

        const unsubLast = onSnapshot(lastMsgQuery, (msgSnap) => {
          if (!msgSnap.empty) p.lastMessage = msgSnap.docs[0].data();

          setChats((prev) => {
            const others = prev.filter((c) => c.id !== p.id);
            return [...others, p];
          });
        });

        unsubscribers.push(unsubLast);
      });

      setLoading(false);
    });
    unsubscribers.push(unsubPrivate);

    return () => {
      unsubscribers.forEach((unsub) => unsub && unsub());
    };
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.listChatsIcon} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.listChatsBackground }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {chats.length === 0 && (
          <Text style={[styles.noChats, { color: colors.listChatsNoChats }]}>
            אין צ׳אטים פתוחים
          </Text>
        )}
        {chats
          .sort(
            (a, b) =>
              (b.lastMessage?.createdAt?.seconds || 0) -
              (a.lastMessage?.createdAt?.seconds || 0)
          )
          .map((chat) => {
            const otherUser =
              chat.type === "private"
                ? chat.participants?.find((u) => u.uid !== userId)
                : null;

            const lastMessageText = chat.lastMessage
              ? chat.type === "group"
                ? `${chat.lastMessage.userName || "אנונימי"}: ${
                    chat.lastMessage.text
                  }`
                : chat.lastMessage.text
              : "אין הודעות";

            return (
              <TouchableOpacity
                key={chat.id}
                style={[
                  styles.chatItem,
                  { backgroundColor: colors.listChatsItemBackground },
                ]}
                onPress={() =>
                  navigation.navigate("Chat", {
                    chatId: chat.id,
                    chatName:
                      chat.type === "group"
                        ? chat.name
                        : otherUser?.name || "צ'אט",
                    chatType: chat.type,
                    userId,
                    userName,
                    otherUserId:
                      chat.type === "private" ? otherUser?.uid : null,
                  })
                }
              >
                <Ionicons
                  name={chat.type === "group" ? "people" : "person"}
                  size={30}
                  color={colors.listChatsIcon}
                />
                <View style={styles.chatInfo}>
                  <Text
                    style={[styles.chatName, { color: colors.listChatsName }]}
                  >
                    {chat.type === "group"
                      ? chat.name
                      : otherUser?.name || "צ'אט"}
                  </Text>
                  <Text
                    style={[
                      styles.lastMessage,
                      { color: colors.listChatsLastMessage },
                    ]}
                    numberOfLines={1}
                  >
                    {lastMessageText}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 24,
    marginTop: 30,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noChats: {
    textAlign: "center",
    fontSize: 16,
    marginVertical: 20,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
  },
  chatInfo: {
    marginLeft: 12,
    flex: 1,
  },
  chatName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
    textAlign: "right",
  },
  lastMessage: {
    fontSize: 14,
    textAlign: "right",
  },
});

export default ListChats;

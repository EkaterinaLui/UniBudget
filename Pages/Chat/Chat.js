import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

const Chat = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { chatId, chatName, chatType, userId, userName, otherUserId } =
    route.params || {};

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");

  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (!chatId && chatType === "group") return;
    if (!userId) return;

    let messagesRef;

    if (chatType === "group") {
      messagesRef = collection(db, "groups", chatId, "messages");
    } else {
      if (!otherUserId) return;
      const conversationId = [userId, otherUserId].sort().join("_");
      messagesRef = collection(db, "privateChats", conversationId, "messages");
    }

    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(msgs);
      },
      (error) => {
        console.error("Error fetching messages: ", error);
        Alert.alert("שגיאה", "טעינת ההודעות נכשלה.");
      }
    );

    return unsubscribe;
  }, [chatId, chatType, userId, otherUserId]);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (inputMessage.trim() === "") return;

    try {
      let messagesRef;

      if (chatType === "group") {
        messagesRef = collection(db, "groups", chatId, "messages");
      } else {
        const conversationId = [userId, otherUserId].sort().join("_");
        messagesRef = collection(
          db,
          "privateChats",
          conversationId,
          "messages"
        );
      }

      await addDoc(messagesRef, {
        text: inputMessage,
        createdAt: serverTimestamp(),
        userId,
        userName,
      });

      setInputMessage("");
    } catch (error) {
      console.error("Error sending message: ", error);
      Alert.alert("שגיאה", "שליחת ההודעה נכשלה.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: colors.chatBackground, paddingTop: insets.top },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.chatHeaderBackground,
            borderBottomColor: colors.chatHeaderBorder,
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.chatHeaderText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.chatHeaderText }]}>
          {chatName}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* הודעות */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={{ padding: 20 }}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.userId === userId
                ? {
                    backgroundColor: colors.chatMyMessageBackground,
                    alignSelf: "flex-end",
                  }
                : {
                    backgroundColor: colors.chatOtherMessageBackground,
                    alignSelf: "flex-start",
                  },
              { shadowColor: colors.chatHeaderBorder },
            ]}
          >
            <Text
              style={[
                styles.messageText,
                msg.userId === userId
                  ? { color: colors.chatMyMessageText }
                  : { color: colors.chatOtherMessageText },
              ]}
            >
              <Text
                style={[
                  styles.messageAuthor,
                  { color: colors.chatMessageAuthor },
                ]}
              >
                {msg.userName}:{" "}
              </Text>
              {msg.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.chatHeaderBackground,
            borderTopColor: colors.chatInputBorder,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.chatInputBackground,
              color: colors.chatHeaderText,
            },
          ]}
          value={inputMessage}
          onChangeText={setInputMessage}
          multiline
          placeholder="כתוב הודעה..."
          placeholderTextColor={colors.chatOtherMessageText}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: colors.chatSendButtonBackground },
          ]}
          onPress={sendMessage}
        >
          <Ionicons name="send" size={24} color={colors.chatSendButtonIcon} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 30,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  messagesContainer: { flex: 1 },
  messageBubble: {
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginVertical: 5,
    maxWidth: "80%",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  messageText: { fontSize: 16 },
  messageAuthor: { fontWeight: "bold" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    marginBottom: 70,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Chat;

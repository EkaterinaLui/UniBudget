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

  const { chatId, chatName, chatType, userId, userName } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");

  const scrollViewRef = useRef(null);

  // האזנה להודעות
  useEffect(() => {
    if (!chatId || !userId) return;

    let messagesRef;
    if (chatType === "group") {
      messagesRef = collection(db, "groups", chatId, "messages");
    } else {
      messagesRef = collection(db, "privateChats", chatId, "messages");
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
  }, [chatId, chatType, userId]);

  // שליחת הודעה
  const sendMessage = async () => {
    if (inputMessage.trim() === "") return;

    try {
      let messagesRef;
      if (chatType === "group") {
        messagesRef = collection(db, "groups", chatId, "messages");
      } else {
        messagesRef = collection(db, "privateChats", chatId, "messages");
      }

      await addDoc(messagesRef, {
        text: inputMessage,
        createdAt: serverTimestamp(),
        userId,
        userName: userName || "משתמש לא מזוהה",
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
      {/* כותרת */}
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
          <Ionicons
            name="arrow-forward"
            size={24}
            color={colors.chatHeaderText}
          />
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
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map((msg) => {
          const isMyMessage = msg.userId === userId;
          return (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                isMyMessage
                  ? [
                      styles.myMessage,
                      {
                        backgroundColor: colors.chatMyMessageBackground,
                        alignSelf: "flex-end",
                      },
                    ]
                  : [
                      styles.otherMessage,
                      {
                        backgroundColor: colors.chatOtherMessageBackground,
                        alignSelf: "flex-start",
                      },
                    ],
              ]}
            >
              {chatType === "group" && !isMyMessage && (
                <Text
                  style={[
                    styles.messageAuthor,
                    { color: colors.chatMessageAuthor },
                  ]}
                >
                  {msg.userName}
                </Text>
              )}
              <Text
                style={[
                  styles.messageText,
                  isMyMessage
                    ? { color: colors.chatMyMessageText }
                    : { color: colors.chatOtherMessageText },
                ]}
              >
                {msg.text}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* קלט הודעה */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.chatHeaderBackground,
            borderTopColor: colors.chatInputBorder,
            paddingBottom: insets.bottom + 8,
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
          <Ionicons name="send" size={22} color={colors.chatSendButtonIcon} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 30,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  messagesContainer: {
    flex: 1,
  },
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
  myMessage: {
    borderTopRightRadius: 0,
  },
  otherMessage: {
    borderTopLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
  },
  messageAuthor: {
    fontWeight: "bold",
    marginBottom: 4,
    fontSize: 13,
  },
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
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});

export default Chat;

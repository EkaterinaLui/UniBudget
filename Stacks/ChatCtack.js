import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ListChats from "../Pages/Chat/ListChats";
import Chat from "../Pages/Chat/Chat";

const Stack = createNativeStackNavigator();

function ChatStack ({db, userId}) {
     return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ListChats">
        {(props) => <ListChats {...props} db={db} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="Chat">
        {(props) => <Chat {...props} db={db} userId={userId} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
 export default ChatStack;
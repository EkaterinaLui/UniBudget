import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import Login from "../Pages/Login";
import Registration from "../Pages/Registration";

const Stack = createStackNavigator();

function AuthStack({ db }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login">
        {(props) => <Login {...props} />}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {(props) => <Registration {...props} db={db} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default AuthStack;
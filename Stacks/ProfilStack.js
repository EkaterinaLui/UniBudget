import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Profil from "../Pages/Profil";
import EditProfil from "../Pages/Settings/EditProfil";

const Stack = createNativeStackNavigator();

function ProfilStack({ db, userId, auth }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profil">
        {(props) => <Profil {...props} db={db} userId={userId} auth={auth} />}
      </Stack.Screen>
      <Stack.Screen name="EditProfil">
        {(props) => <EditProfil {...props} db={db} userId={userId} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default ProfilStack;

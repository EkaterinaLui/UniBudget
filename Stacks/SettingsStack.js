import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Settings from "../Pages/Settings/Settings";
import General from "../Pages/Settings/General";
import Notification from "../Pages/Settings/Notification"
import Private from "../Pages/Settings/Private"
import Help from "../Pages/Settings/Help"
import DeleteAccount from "../Pages/Settings/DeleteAccount"

const Stack = createNativeStackNavigator();

function SettingsStack({ db, userId }) {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Settings" options={{ title: "הגדרות" }}>
                {(props) => <Settings {...props} db={db} userId={userId} />}
            </Stack.Screen>
            <Stack.Screen name="General" options={{ title: "כללי" }}>
                {(props) => <General {...props} db={db} userId={userId} />}
            </Stack.Screen>
            <Stack.Screen name="Notification" options={{ title: "התראות" }}>
                {(props) => <Notification {...props} db={db} userId={userId} />}
            </Stack.Screen>
            <Stack.Screen name="Private" options={{ title: "פרטיות" }}>
                {(props) => <Private {...props} db={db} userId={userId} />}
            </Stack.Screen>
            <Stack.Screen name="Help" options={{ title: "עזרה" }}>
                {(props) => <Help {...props} db={db} userId={userId} />}
            </Stack.Screen>
            <Stack.Screen name="DeleteAccount" options={{ title: "למחוק משתמש" }}>
                {(props) => <DeleteAccount {...props} db={db} userId={userId} />}
            </Stack.Screen>
        </Stack.Navigator>
    )
}

export default SettingsStack;
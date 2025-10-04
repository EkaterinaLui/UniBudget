import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AppAdmin from "../AdminApp/AppAdmin";

const Stack = createNativeStackNavigator();

function AppAdminStack ({db, userId}) {
     return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AppAdmin">
        {(props) => <AppAdmin {...props} db={db} userId={userId} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
 export default AppAdminStack;
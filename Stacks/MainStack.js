import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Error from "../Componets/Error";
import CategoryDetails from "../Pages/Category/CategoryDetails";
import CreateCategory from "../Pages/Category/CreateCategory";
import DebtDetails from "../Pages/Debt/DebtDetails";
import AddExpense from "../Pages/Expenses/AddExpenses";
import AddUsers from "../Pages/Group/AddUsers";
import CreateGroup from "../Pages/Group/CreateGroup";
import Group from "../Pages/Group/Group";
import GroupBudget from "../Pages/Group/GroupBudget";
import GroupInfo from "../Pages/Group/GroupInfo";
import UsersDetails from "../Pages/Group/UsersDetails";
import Home from "../Pages/Home";
import Profil from "../Pages/Profil";
import Reports from "../Pages/Reports";
import CreateSaving from "../Pages/Saving/CreateSaving";
import SavingDetails from "../Pages/Saving/SavingDetails";

const Stack = createNativeStackNavigator();

function MainStack({ db, userId }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home">
        {(props) => <Home {...props} db={db} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="Profil">
        {(props) => <Profil {...props} db={db} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="CreateGroup">
        {(props) => <CreateGroup {...props} db={db} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="AddUsers">
        {(props) => <AddUsers {...props} db={db} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="Group">
        {(props) => <Group {...props} db={db} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="CreateCategory">
        {(props) => <CreateCategory {...props} db={db} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="AddExpense">
        {(props) => <AddExpense {...props} db={db} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="GroupInfo">
        {(props) => <GroupInfo {...props} db={db} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="GroupBudget">
        {(props) => <GroupBudget {...props} db={db} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="UsersDetails">
        {(props) => <UsersDetails {...props} db={db} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="CategoryDetails">
        {(props) => <CategoryDetails {...props} db={db} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="Reports">
        {(props) => <Reports {...props} db={db} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="CreateSaving">
        {(props) => <CreateSaving {...props} db={db} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="SavingDetails">
        {(props) => <SavingDetails {...props} db={db} userId={userId} />}
      </Stack.Screen>
       <Stack.Screen name="DebtDetails">
        {(props) => <DebtDetails {...props} db={db} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="ErrorScreen" component={Error} />
    </Stack.Navigator>
  );
}

export default MainStack;

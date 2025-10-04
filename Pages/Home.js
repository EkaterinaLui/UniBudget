import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function Home({ navigation, db, userId }) {
  const [groups, setGroups] = useState([]);
  const [isLoadingGroup, setIsLoadingGroup] = useState(true);
  const [userName, setUserName] = useState("");
  const { colors } = useTheme();

  
  useEffect(() => {
    if (!db || !userId) return;

    const fetchUserName = async () => {
      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserName(userSnap.data().name || "");
        }
      } catch (error) {
        console.log("שגיאה בקריאת שם המשתמש:", error);
      }
    };

    fetchUserName();

    const groupsRef = collection(db, "groups");
    const q = query(groupsRef, where("memberIds", "array-contains", userId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedGroups = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setGroups(fetchedGroups);
        setIsLoadingGroup(false);
      },
      (error) => {
        console.error("שגיאה בטעינת הקבוצות: ", error);
        Alert.alert("שגיאה", "לא הצלחנו לטעון את רשימת הקבוצות");
        setIsLoadingGroup(false);
      }
    );

    return () => unsubscribe();
  }, [db, userId]);

  const renderGroupItem = ({ item }) => (
    <View
      style={[
        styles.groupItem,
        { backgroundColor: colors.tabBackground, borderColor: colors.border},
      ]}
    >
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("Group", { groupId: item.id, userId })
        }
      >
        <Text style={[styles.groupName, { color: colors.text }]}>
          {item.groupName}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "בוקר טוב";
    if (hour >= 12 && hour < 17) return "צהריים טובים";
    if (hour >= 17 && hour < 21) return "ערב טוב";
    return "לילה טוב";
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.greeting, { color: colors.primary }]}>
        {greeting}
        {userName ? `, ${userName}` : ""}
      </Text>

      {isLoadingGroup ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : groups.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Text style={[styles.emptyListText, { color: colors.text }]}>
            אין קבוצות
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("CreateGroup", { userName })}
            activeOpacity={0.8}
            style={styles.createButtonContainer}
          >
            <Ionicons
              name="add-circle-outline"
              size={85}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroupItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.groupsListContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View style={styles.createButtonContainer}>
              <TouchableOpacity
                onPress={() => navigation.navigate("CreateGroup", { userName })}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={85}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 70,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 30,
    alignSelf: "flex-start",
  },
  emptyListContainer: {
    marginTop: 50,
    alignItems: "center",
  },
  emptyListText: {
    fontSize: 18,
  },
  groupsListContent: {
    paddingHorizontal: 0,
  },
  groupItem: {
    width: "100%",
    borderRadius: 30,
    paddingVertical: 5,
    paddingHorizontal: 100,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 3,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 15,
  },
  createButtonContainer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 100,
  },
});

export default Home;

import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";

import PayQueue from "../../Componets/PayQueue";
import ResetBudgetButton from "../../Componets/ReasetBudgetButton";
import DebtSum from "../Debt/DebtSum";
import CategoryCard from "./GroupComponents/CategoryCard";
import MemberCard from "./GroupComponents/MemberCard";
import SavingCard from "./GroupComponents/SavingCard";

import { useCurrency } from "../../Utilities/Currency";

const screenWidth = Dimensions.get("window").width;

const Group = () => {
  const route = useRoute();
  const { groupId, userId } = route.params;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const formatCurrency = useCurrency();

  const [groupData, setGroupData] = useState(null);
  const [membersData, setMembersData] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [temporaryCategories, setTemporaryCategories] = useState([]);
  const [allUsers, setAllUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState([]);

  //  נתוני קבוצה
  useEffect(() => {
    if (!groupId || !db) {
      setError("חסר מזהה קבוצה או חיבור למסד הנתונים.");
      setLoading(false);
      return;
    }

    const groupRef = doc(db, "groups", groupId);
    const expensesRef = collection(db, "groups", groupId, "expenses");
    const categoriesRef = collection(db, "groups", groupId, "categories");

    const unsubGroup = onSnapshot(groupRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGroupData(data);
        setMembersData(data.members || []);
        setIsAdmin(data.adminIds?.includes(userId));
        const memberMap = {};
        (data.members || []).forEach((m) => {
          if (m.uid) {
            memberMap[m.uid] = m.name || "משתמש";
          }
        });
        setAllUsers(memberMap);
        setLoading(false);
      } else {
        setError("הקבוצה לא נמצאה.");
      }
    });

    const unsubExpenses = onSnapshot(expensesRef, (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setExpenses(data);
    });

    const unsubCategories = onSnapshot(categoriesRef, (snapshot) => {
      const allCategories = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

     setCategories(allCategories.filter((cat) => !cat.isTemporary));
     setTemporaryCategories(allCategories.filter((cat) => cat.isTemporary));
    });

    return () => {
      unsubGroup();
      unsubExpenses();
      unsubCategories();
    };
  }, [groupId, userId]);

  //  חיסכון (משפחות)
  useEffect(() => {
    if (groupData?.type !== "family") return;

    const targetRef = collection(db, "groups", groupId, "savings");
    const unsubTarget = onSnapshot(targetRef, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSaving(data);
    });

    return () => unsubTarget();
  }, [groupId, groupData?.type]);

  const savingTargetList = [...saving, { id: "add-target", isAddButton: true }];

  // שגיאה
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text }}>טוען נתונים...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {error}
        </Text>
      </View>
    );
  }

  // חישובים
  const totalBudget = groupData?.totalBudget || 0;
  const spentAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalProgress = totalBudget > 0 ? (spentAmount / totalBudget) * 100 : 0;

  const memberSpending = membersData.reduce((acc, member) => {
    const memberId = member.uid || member;
    const totalSpent = expenses
      .filter((e) => e.userId === memberId)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    acc[memberId] = totalSpent;
    return acc;
  }, {});

  const memberProgress = membersData.reduce((acc, member) => {
    const memberId = member.uid || member;
    const totalSpent = memberSpending[memberId];
    const individualBudget =
      membersData.length > 0 ? totalBudget / membersData.length : 0;
    acc[memberId] =
      individualBudget > 0 ? (totalSpent / individualBudget) * 100 : 0;
    return acc;
  }, {});

  const categoriesWithExpenses = categories.map((cat) => {
    const spentForCategory = expenses
      .filter((e) => e.categoryId === cat.id)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    return { ...cat, spentAmount: spentForCategory };
  });

  const temporaryCategoriesWithExpenses = temporaryCategories.map((cat) => {
    const spentForCategory = expenses
      .filter((e) => e.categoryId === cat.id)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    return { ...cat, spentAmount: spentForCategory };
  });

  const normalCategoryList = [
    ...categoriesWithExpenses,
    { id: "add-button-normal", isAddButton: true, isTemporaryAddButton: false },
  ];
  const temporaryCategoryList = [
    ...temporaryCategoriesWithExpenses,
    { id: "add-button-temp", isAddButton: true, isTemporaryAddButton: true },
  ];

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* כותרת קבוצה */}
        <View
          style={[
            styles.groupHeader,
            { backgroundColor: colors.headerBackground },
          ]}
        >
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("GroupInfo", { groupId, userId })
            }
          >
            <Text style={[styles.groupSubtitle, { color: colors.headerText }]}>
              {groupData?.groupName || "קבוצה ללא שם"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* יתרה חודשית */}
        <TouchableOpacity
          style={[styles.budgetCard, { backgroundColor: colors.card }]}
          onPress={() =>
            navigation.navigate("GroupBudget", { groupId, userId })
          }
        >
          <Text style={[styles.budgetTitle, { color: colors.text }]}>
            יתרה חודשית משותפת
          </Text>
          <Text style={[styles.budgetValue, { color: colors.text }]}>
            {formatCurrency(spentAmount)} / {formatCurrency(totalBudget)}
          </Text>
          <View
            style={[
              styles.progressBar,
              { backgroundColor: colors.progressBackground },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${totalProgress}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
        </TouchableOpacity>

        {/* תור לתשלום */}
        <PayQueue
          membersData={membersData}
          expenses={expenses}
          allUsers={allUsers}
        />

        {/* משתמשים */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          משתמשים:
        </Text>
        <FlatList
          data={[...membersData, { uid: "add-button", isAddButton: true }]}
          renderItem={({ item }) => (
            <MemberCard
              item={item}
              isAdmin={isAdmin}
              navigation={navigation}
              groupId={groupId}
              allUsers={allUsers}
              memberProgress={memberProgress}
              memberSpending={memberSpending}
              totalBudget={totalBudget}
              membersData={membersData}
              colors={colors}
              formatCurrency={formatCurrency}
            />
          )}
          keyExtractor={(item, index) =>
            item.isAddButton
              ? "add-button"
              : item.uid || item.id || `member-${index}`
          }
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.categoryListHorizontal
          ]}
        />

        {/* חובות רק שותפים */}
        {groupData?.type === "partners" && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              חובות בין המשתמשים
            </Text>
            <DebtSum
              groupId={groupId}
              userId={userId}
              membersData={membersData}
              expenses={expenses}
              allUsers={allUsers}
            />
          </>
        )}

        {/* קטגוריות רגילות */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          הוצאות תקציב
        </Text>
        <FlatList
          data={normalCategoryList}
          renderItem={({ item }) => (
            <CategoryCard
              item={item}
              navigation={navigation}
              groupId={groupId}
              userId={userId}
              allUsers={allUsers}
              colors={colors}
              formatCurrency={formatCurrency}
              isAdmin={isAdmin}
            />
          )}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.categoryListHorizontal
          ]}
        />

        {/* קטגוריות מיוחדות */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          תקציבים מיוחדים
        </Text>
        <FlatList
          data={temporaryCategoryList}
          renderItem={({ item }) => (
            <CategoryCard
              item={item}
              navigation={navigation}
              groupId={groupId}
              userId={userId}
              allUsers={allUsers}
              colors={colors}
              formatCurrency={formatCurrency}
              isAdmin={isAdmin}
            />
          )}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.categoryListHorizontal
          ]}
        />

        {/* חיסכון - למשפחה */}
        {groupData?.type === "family" && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              יעדי חיסכון
            </Text>
            <FlatList
              data={savingTargetList}
              renderItem={({ item }) => (
                <SavingCard
                  item={item}
                  navigation={navigation}
                  groupId={groupId}
                  userId={userId}
                  colors={colors}
                  formatCurrency={formatCurrency}
                />
              )}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.categoryListHorizontal
              ]}
            />
          </>
        )}

        {/* איפוס תקציב */}
        {isAdmin && <ResetBudgetButton groupId={groupId} />}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingTop: 15,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
  groupHeader: {
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 20,
    paddingVertical: 15,
  },
  groupSubtitle: {
    fontSize: 24,
    fontWeight: "900",
    paddingVertical: 10,
  },
  budgetCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 15,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  budgetTitle: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: "left",
  },
  budgetValue: {
    fontSize: 16,
    textAlign: "left",
    marginBottom: 6,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  sectionTitle: {
    marginHorizontal: 20,
    marginTop: 25,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "left",
  },
  categoryListHorizontal: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});

export default Group;

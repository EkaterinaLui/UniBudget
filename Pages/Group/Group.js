import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";
import { doc, collection, onSnapshot } from "firebase/firestore";

import PayQueue from "../../Components/PayQueue";
import ResetBudgetButton from "../../Components/ResetBudgetButton";
import DebtSum from "../Debt/DebtSum";
import { currency } from "../../Utilities/Currency";

const screenWidth = Dimensions.get("window").width;

const CircularProgressBar = ({ progress }) => {
  const { colors } = useTheme();
  const size = 60;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const circleProgress = Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset =
    circumference - (circleProgress * circumference) / 100;

  let progressColor = colors.progressNormal;
  if (progress > 100) {
    progressColor = colors.progressDanger;
  } else if (progress >= 85) {
    progressColor = colors.progressWarning;
  }

  return (
    <View style={styles.progressBarContainer}>
      <Svg width={size} height={size}>
        <Circle
          stroke={colors.progressBackground}
          fill="transparent"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={progressColor}
          fill="transparent"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[styles.progressText, { color: progressColor }]}>
        {`${Math.round(progress)}%`}
      </Text>
    </View>
  );
};

const Group = () => {
  const route = useRoute();
  const { groupId, userId } = route.params;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const formatCurrency = currency();

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

      setCategories(allCategories.filter((cat) => !cat.istemporary));
      setTemporaryCategories(allCategories.filter((cat) => cat.istemporary));
    });

    return () => {
      unsubGroup();
      unsubExpenses();
      unsubCategories();
    };
  }, [groupId]);

  useEffect(() => {
    if (groupData?.type !== "family") return;

    const targetRef = collection(db, "groups", groupId, "saving");
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

  const totalBudget = groupData?.totalBudget || 0;
  const spentAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalProgress = totalBudget > 0 ? (spentAmount / totalBudget) * 100 : 0;

  const memberSpending = membersData.reduce((acc, memberId) => {
    const totalSpent = expenses
      .filter((e) => e.userId === memberId)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    acc[memberId] = totalSpent;
    return acc;
  }, {});

  const memberProgress = membersData.reduce((acc, memberId) => {
    const totalSpent = memberSpending[memberId];
    const individualBudget = totalBudget / membersData.length;
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

  // קרטיסיות של משתמשים
  const renderMember = ({ item }) => {
    if (item.isAddButton) {
      if (!isAdmin) return null;
      return (
        <TouchableOpacity
          key="add-member"
          style={[
            styles.addUsers,
            {
              backgroundColor: colors.addCardBackground,
              borderColor: colors.secondary,
            },
          ]}
          onPress={() => navigation.navigate("AddUsers", { groupId })}
        >
          <Ionicons name="person-add" size={32} color={colors.primary} />
          <Text style={[styles.addCategoryText, { color: colors.primary }]}>
            הוספת משתמש
          </Text>
        </TouchableOpacity>
      );
    }

    const memberId = item.uid;
    const progress = memberProgress[memberId] || 0;
    const spent = memberSpending[memberId] || 0;
    const memberName = item.name || allUsers[memberId] || `משתמש (${memberId})`;

    return (
      <TouchableOpacity
        key={memberId}
        style={[
          styles.memberCard,
          {
            backgroundColor: colors.memberCardBackground,
            borderColor: colors.cardBorder,
          },
        ]}
        onPress={() =>
          navigation.navigate("UsersDetails", { groupId, memberId, memberName })
        }
      >
        <CircularProgressBar progress={progress} />
        <Text style={[styles.memberName, { color: colors.text }]}>
          {memberName}
        </Text>
        <Text style={[styles.memberAmount, { color: colors.secondary }]}>
          {formatCurrency(spent)} /{" "}
          {formatCurrency(totalBudget / membersData.length)};
        </Text>
      </TouchableOpacity>
    );
  };

  // כרטיסיות של קטגוריות
  const renderCategoryItem = ({ item }) => {
    if (item.isAddButton && !item.isTemporaryAddButton) {
      if (!isAdmin) return null;
      return (
        <TouchableOpacity
          style={[
            styles.addCategoryCard,
            {
              backgroundColor: colors.addCardBackground,
              borderColor: colors.secondary,
            },
          ]}
          onPress={() =>
            navigation.navigate("CreateCategory", {
              groupId,
              isTemporary: item.isTemporaryAddButton,
            })
          }
        >
          <Ionicons name="add" size={32} color={colors.secondary} />
          <Text style={[styles.addCategoryText, { color: colors.primary }]}>
            הגדרת תקציב לפי ענף
          </Text>
        </TouchableOpacity>
      );
    }

    if (item.isAddButton && item.isTemporaryAddButton) {
      return (
        <TouchableOpacity
          style={[
            styles.addCategoryCard,
            {
              backgroundColor: colors.addCardBackground,
              borderColor: colors.secondary,
            },
          ]}
          onPress={() =>
            navigation.navigate("CreateCategory", {
              groupId,
              isTemporary: true,
            })
          }
        >
          <Ionicons name="add" size={32} color={colors.primary} />
          <Text style={[styles.addCategoryText, { color: colors.primary }]}>
            הגדרת תקציב מיוחד
          </Text>
        </TouchableOpacity>
      );
    }

    // בדיקת תוקף קטגוריה
    const isExpired =
      item.istemporary && item.eventEndDate
        ? (item.eventEndDate.toDate
            ? item.eventEndDate.toDate()
            : item.eventEndDate) <= new Date()
        : false;

      // בדיקת חריגה מהתקציב
    const isOverBudget = item.spentAmount > (item.budget || 0);
    const progress = (item.spentAmount / (item.budget || 1)) * 100;

    return (
      <TouchableOpacity
        style={[
          styles.categoryCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
        onPress={() =>
          navigation.navigate("CategoryDetails", {
            groupId,
            userId,
            categoryId: item.id,
            categoryName: item.name,
            allUsers,
          })
        }
      >
        <Ionicons
          name={item.icon || "folder-outline"}
          size={32}
          color={item.color || colors.primary}
        />
        <Text style={[styles.categoryCardName, { color: colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.categoryCardAmount, { color: colors.secondary }]}>
         {formatCurrency(item.spentAmount)} / {formatCurrency(item.budget)}
        </Text>
        <View
          style={[
            styles.categoryCardProgressBar,
            { backgroundColor: colors.progressBackground },
          ]}
        >
          <View
            style={[
              styles.categoryCardProgressFill,
              {
                width: `${progress}%`,
                backgroundColor: isExpired
                  ? "red"
                  : item.color || colors.primary,
              },
            ]}
          />
        </View>

        {isOverBudget && (
          <Text style={[styles.expiredCat, {color:colors.progressDanger}]}>
            חריגה מהתקציב!
          </Text>
        )}

        {isExpired && (
          <Text style={[styles.expiredCat, { color: colors.danger }]}>
            קטגוריה זו פגה תוקף
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const normalCategoryList = [
    ...categoriesWithExpenses,
    { id: "add-button-normal", isAddButton: true, isTemporaryAddButton: false },
  ];
  const temporaryCategoryList = [
    ...temporaryCategoriesWithExpenses,
    { id: "add-button-temp", isAddButton: true, isTemporaryAddButton: true },
  ];

  // כרטיסיות של חיסכון
  const renderSaving = ({ item }) => {
    if (item.isAddButton) {
      return (
        <TouchableOpacity
          style={[
            styles.addCategoryCard,
            {
              backgroundColor: colors.addCardBackground,
              borderColor: colors.secondary,
            },
          ]}
          onPress={() => navigation.navigate("CreateSaving", { groupId })}
        >
          <Ionicons name="add" size={32} color={colors.primary} />
          <Text style={[styles.addCategoryText, { color: colors.primary }]}>
            צור יעד חיסכון
          </Text>
        </TouchableOpacity>
      );
    }

    const progress =
      item.targetAmount > 0
        ? (item.currentAmount / item.targetAmount) * 100
        : 0;

    return (
      <TouchableOpacity
        style={[
          styles.categoryCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
        onPress={() =>
          navigation.navigate("SavingDetails", {
            groupId,
            savingId: item.id,
            userId,
          })
        }
      >
        <Ionicons name="wallet-outline" size={32} color={colors.primary} />
        <Text style={[styles.categoryCardName, { color: colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.categoryCardAmount, { color: colors.secondary }]}>
          {formatCurrency(item.currentAmount)} / {formatCurrency(item.targetAmount)}
        </Text>
        <View
          style={[
            styles.categoryCardProgressBar,
            { backgroundColor: colors.progressBackground },
          ]}
        >
          <View
            style={[
              styles.categoryCardProgressFill,
              { width: `${progress}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  //return של קומפוננטה
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
            {spentAmount} / {formatCurrency(totalBudget)}
            
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
          renderItem={renderMember}
          keyExtractor={(item, index) =>
            item.isAddButton
              ? "add-button"
              : item.uid || item.id || `member-${index}`
          }
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryListHorizontal}
        />

        {/* חובובת - רק לקבוצות שותפים */}
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

        {/* קטגוריות */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          הוצאות תקציבי
        </Text>
        <FlatList
          data={normalCategoryList}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.uid || item.id}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryListHorizontal}
        />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          תקציבים מיוחדים
        </Text>
        <FlatList
          data={temporaryCategoryList}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryListHorizontal}
        />

        {/* חיסכון - רק לקבוצות משפחה */}

        {groupData?.type === "family" && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {" "}
              יעדי חיסכון
            </Text>
            <FlatList
              data={savingTargetList}
              renderItem={renderSaving}
              keyExtractor={(item) => item.id}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryListHorizontal}
            />
          </>
        )}

        {/* איפוס תקציב (חודש חדש) */}
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
    textAlign: "right",
  },
  budgetValue: {
    fontSize: 16,
    textAlign: "right",
    marginBottom: 6,
  },
  progressBarContainer: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: {
    position: "absolute",
    fontSize: 12,
    fontWeight: "bold",
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
    textAlign: "right",
  },
  memberCard: {
    width: screenWidth * 0.4,
    height: 160,
    borderRadius: 16,
    padding: 15,
    marginRight: 15,
    marginTop: 20,
    marginBottom: 20,
    justifyContent: "space-between",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
    alignItems: "center",
    borderWidth: 1,
  },
  addUsers: {
    width: screenWidth * 0.4,
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    marginRight: 15,
    marginTop: 20,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  memberName: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  memberAmount: {
    fontSize: 12,
    textAlign: "center",
  },
  categoryListHorizontal: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  categoryCard: {
    width: screenWidth * 0.4,
    height: 160,
    borderRadius: 16,
    padding: 15,
    marginRight: 10,
    marginVertical: 10,
    justifyContent: "space-between",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
    borderWidth: 1,
  },
  categoryCardName: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right",
  },
  categoryCardAmount: {
    fontSize: 13,
    textAlign: "right",
  },
  categoryCardProgressBar: {
    height: 8,
    borderRadius: 4,
    width: "100%",
    overflow: "hidden",
  },
  categoryCardProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  expiredCat: {
    color: "red",
    fontWeight: "bold",
    marginVertical: 10,
  },
  addCategoryCard: {
    width: screenWidth * 0.4,
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    marginVertical: 10,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  addCategoryText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});

export default Group;

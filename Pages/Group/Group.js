import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";

import PayQueue from "../../Componets/PayQueue";
import ResetBudgetButton from "../../Componets/ReasetBudgetButton";
import { useCurrency } from "../../Utilities/Currency";
import DebtSum from "../Debt/DebtSum";
import CategoryCard from "./GroupComponents/CategoryCard";
import MemberCard from "./GroupComponents/MemberCard";
import SavingCard from "./GroupComponents/SavingCard";

import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";

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

  const [categoriesRaw, setCategoriesRaw] = useState([]);
  const [allUsers, setAllUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState([]);

  const [normalUI, setNormalUI] = useState([]);
  const [tempUI, setTempUI] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!groupId || !db) {
      setError("חסר מזהה קבוצה או חיבור למסד הנתונים.");
      setLoading(false);
      return;
    }

    const groupRef = doc(db, "groups", groupId);
    const expensesRef = collection(db, "groups", groupId, "expenses");

    const categoriesQuery = query(
      collection(db, "groups", groupId, "categories"),
    );

    const unsubGroup = onSnapshot(
      groupRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGroupData(data);
          setMembersData(data.members || []);
          setIsAdmin(data.adminIds?.includes(userId));

          const memberMap = {};
          (data.members || []).forEach((m) => {
            if (m.uid) memberMap[m.uid] = m.name || "משתמש";
          });
          setAllUsers(memberMap);

          setLoading(false);
        } else {
          setError("הקבוצה לא נמצאה.");
        }
      },
      (err) => {
        console.log("שגיאה בטעינת קבוצה:", err);
        setError("שגיאה בטעינת הקבוצה");
        setLoading(false);
      },
    );

    const unsubExpenses = onSnapshot(
      expensesRef,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setExpenses(data);
      },
      (err) => console.log("שגיאה בטעינת הוצאות:", err),
    );

    const unsubCategories = onSnapshot(
      categoriesQuery,
      (snapshot) => {
        const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCategoriesRaw(all);
      },
      (err) => {
        console.log("שגיאה בטעינת קטגוריות:", err);
        setError("שגיאה בטעינת קטגוריות");
      },
    );

    return () => {
      unsubGroup();
      unsubExpenses();
      unsubCategories();
    };
  }, [groupId, userId]);

  // ---------------------------
  // חיסכון
  // ---------------------------
  useEffect(() => {
    if (groupData?.type !== "family") return;

    const targetRef = collection(db, "groups", groupId, "savings");
    const unsubTarget = onSnapshot(targetRef, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSaving(data);
    });

    return () => unsubTarget();
  }, [groupId, groupData?.type]);

  const savingTargetList = [...saving, { id: "add-target", isAddButton: true }];

  const spentByCategoryId = useMemo(() => {
    const map = {};
    for (const e of expenses) {
      if (!e.categoryId) continue;
      map[e.categoryId] = (map[e.categoryId] || 0) + (e.amount || 0);
    }
    return map;
  }, [expenses]);

  const splitAndSort = (arr, isTemporary) => {
    const filtered = arr.filter((c) => !!c.isTemporary === isTemporary);

    const withOrder = [];
    const noOrder = [];

    for (const c of filtered) {
      const hasOrder = typeof c.order === "number" && !Number.isNaN(c.order);
      const item = {
        ...c,
        hasOrder,
        spentAmount: spentByCategoryId[c.id] || 0,
      };
      if (hasOrder) withOrder.push(item);
      else noOrder.push(item);
    }

    withOrder.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    noOrder.sort((a, b) => {
      const aTime =
        a.createdAt?.toDate?.()?.getTime?.() ??
        (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const bTime =
        b.createdAt?.toDate?.()?.getTime?.() ??
        (b.createdAt ? new Date(b.createdAt).getTime() : 0);

      return aTime - bTime;
    });

    return { withOrder, noOrder };
  };

  useEffect(() => {
    if (isDragging) return;

    const normal = splitAndSort(categoriesRaw, false);
    const temp = splitAndSort(categoriesRaw, true);

    setNormalUI([...normal.withOrder, ...normal.noOrder]);
    setTempUI([...temp.withOrder, ...temp.noOrder]);
  }, [categoriesRaw, spentByCategoryId, isDragging]);

  const saveOrderForOnlyOrdered = async (orderedList) => {
    try {
      const updates = orderedList.map((cat, index) =>
        updateDoc(doc(db, "groups", groupId, "categories", cat.id), {
          order: index,
        }),
      );
      await Promise.all(updates);
    } catch (err) {
      console.log("שגיאה בשמירת סדר קטגוריות:", err);
    }
  };

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

  // ---------------------------
  // חישובים
  // ---------------------------
  const totalBudget = groupData?.totalBudget || 0;
  // הפרדת הוצאות לקטגוריות זמניות ולא זמניות
  const tenporaryIs = categoriesRaw
    .filter((c) => c.isTemporary)
    .map((c) => c.id);
  const expNotIsTemp = expenses.filter(
    (e) => !tenporaryIs.includes(e.categoryId),
  );
  // סכום הוצאות לכל סוג קטגוריה
  const expIsTemp = expenses.filter((e) => tenporaryIs.includes(e.categoryId));
  const spentAmount = expNotIsTemp.reduce((sum, e) => sum + (e.amount || 0), 0);
  const spentAmountIsTemp = expIsTemp.reduce(
    (sum, e) => sum + (e.amount || 0),
    0,
  );
  // חישוב אחוז התקציב הכולל שהוצא - יכול להיות מעל 100% אם הוציאו יותר מהתקציב הכולל
  const totalProgress = totalBudget > 0 ? (spentAmount / totalBudget) * 100 : 0;
  const memberBudgets = groupData?.memberBudgets || {};
  // חישוב כמה כל משתמש הוציא
  const memberSpending = membersData.reduce((acc, member) => {
    const memberId = member.uid || member;
    const totalSpent = expenses
      .filter((e) => e.userId === memberId)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    acc[memberId] = totalSpent;
    return acc;
  }, {});

  // חישוב progress לכל משתמש
  const memberProgress = membersData.reduce((acc, member) => {
    // יכול להיות מעל 100% אם הוציאו יותר מהתקציב האישי שלו
    const memberId = member.uid || member;
    // התקציב האישי של המשתמש - אם לא מוגדר, מחלקים את התקציב הכולל במספר המשתמשים
    const totalSpent = memberSpending[memberId] || 0;
    // תקציב למשתמש (תמיד מספר)
    const fromDB = groupData?.memberBudgets?.[memberId];
    // חישוב גיבוי אם אין תקציב אישי שמור בבסיס נתונים
    const fallback =
      // אם יש תקציב כולל ומידע על משתמשים, מחלקים את התקציב הכולל במספר המשתמשים. אחרת, התקציב האישי הוא 0 כדי למנוע חלוקה באפס.
      totalBudget && Array.isArray(membersData) && membersData.length > 0
        ? Number(totalBudget) / membersData.length
        : 0;
    // אם התקציב האישי שמור בבסיס נתונים, משתמשים בו. אחרת, משתמשים בחלוקה שווה של התקציב הכללי
    const budToUse = Number(fromDB ?? fallback) || 0;
    // חישוב ה-progress - אם התקציב הוא 0, ה-progress הוא 0 כדי למנוע חלוקה באפס. אחרת, מחלקים את הסכום שהוצא בתקציב האישי ומכפילים ב-100 כדי לקבל אחוז.
    acc[memberId] = budToUse > 0 ? (totalSpent / budToUse) * 100 : 0;
    return acc;
  }, {});

  const normalData = [
    ...normalUI,
    { id: "add-button-normal", isAddButton: true, isTemporaryAddButton: false },
  ];

  const tempData = [
    ...tempUI,
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
        <TouchableOpacity
          style={[
            styles.groupHeader,
            { backgroundColor: colors.headerBackground },
          ]}
          onPress={() => navigation.navigate("GroupInfo", { groupId, userId })}
        >
          <Text style={[styles.groupSubtitle, { color: colors.headerText }]}>
            {groupData?.groupName || "קבוצה ללא שם"}
          </Text>
        </TouchableOpacity>

        {/* יתרה חודשית */}
        {/* כרטיס שמציג את התקציב החודשי המשותף, כמה כבר הוצא וכמה נשאר, עם פס התקדמות וניווט לעמוד ניהול התקציב */}
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
          {/* הוצאות מיוחדות */}
          <Text style={[styles.budgetSubtitle, { color: colors.text }]}>
            הוצאות מיוחדות: {formatCurrency(spentAmountIsTemp)}
          </Text>
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
              userId={userId}
              allUsers={allUsers}
              memberProgress={memberProgress}
              memberSpending={memberSpending}
              totalBudget={totalBudget}
              membersData={membersData}
              colors={colors}
              formatCurrency={formatCurrency}
              memberBudgets={memberBudgets}
            />
          )}
          keyExtractor={(item, index) =>
            item.isAddButton
              ? "add-button"
              : item.uid || item.id || `member-${index}`
          }
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categoryListHorizontal]}
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

        <DraggableFlatList
          data={normalData}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryListHorizontal}
          onDragBegin={() => setIsDragging(true)}
          onDragEnd={async ({ data }) => {
            setIsDragging(false);

            const withoutAdd = data.filter((x) => !x.isAddButton);
            const ordered = withoutAdd.filter((x) => x.hasOrder);
            const noOrder = withoutAdd.filter((x) => !x.hasOrder);

            const rebuilt = [...ordered, ...noOrder];
            setNormalUI(rebuilt);

            await saveOrderForOnlyOrdered(ordered);
          }}
          renderItem={({ item, drag, isActive }) => {
            const canDrag = !item.isAddButton && item.hasOrder;

            return (
              <ScaleDecorator>
                <View style={{ opacity: isActive ? 0.85 : 1 }}>
                  <CategoryCard
                    item={item}
                    navigation={navigation}
                    groupId={groupId}
                    userId={userId}
                    allUsers={allUsers}
                    colors={colors}
                    formatCurrency={formatCurrency}
                    isAdmin={isAdmin}
                    onLongPress={canDrag ? drag : undefined}
                    disabled={isActive}
                  />
                </View>
              </ScaleDecorator>
            );
          }}
        />

        {/* קטגוריות מיוחדות */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          תקציבים מיוחדים
        </Text>

        <DraggableFlatList
          data={tempData}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryListHorizontal}
          onDragBegin={() => setIsDragging(true)}
          onDragEnd={async ({ data }) => {
            setIsDragging(false);

            const withoutAdd = data.filter((x) => !x.isAddButton);
            const ordered = withoutAdd.filter((x) => x.hasOrder);
            const noOrder = withoutAdd.filter((x) => !x.hasOrder);

            const rebuilt = [...ordered, ...noOrder];
            setTempUI(rebuilt);

            await saveOrderForOnlyOrdered(ordered);
          }}
          renderItem={({ item, drag, isActive }) => {
            const canDrag = !item.isAddButton && item.hasOrder;

            return (
              <ScaleDecorator>
                <View style={{ opacity: isActive ? 0.85 : 1 }}>
                  <CategoryCard
                    item={item}
                    navigation={navigation}
                    groupId={groupId}
                    userId={userId}
                    allUsers={allUsers}
                    colors={colors}
                    formatCurrency={formatCurrency}
                    isAdmin={isAdmin}
                    onLongPress={canDrag ? drag : undefined}
                    disabled={isActive}
                  />
                </View>
              </ScaleDecorator>
            );
          }}
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
              contentContainerStyle={[styles.categoryListHorizontal]}
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
  budgetSubtitle: {
    marginTop: 8,
    fontSize: 14,
    marginBottom: 12,
    textAlign: "left",
  },
  budgetValue: {
    fontSize: 16,
    marginBottom: 6,
    textAlign: "left",
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

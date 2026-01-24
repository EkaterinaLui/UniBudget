import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";
import { useCurrency } from "../../Utilities/Currency";

const UsersDetails = () => {
  const route = useRoute();
  const { groupId, memberId, memberName } = route.params || {};
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const formatCurrency = useCurrency();

  //הגדרות קבועות למסכים שונים
  const CARD_MARGIN_H = 20;
  const CARD_PADDING_H = 15;

  const chartWidth =
    screenWidth - (CARD_MARGIN_H + CARD_PADDING_H) * 2 - insets.left - insets.right;

  const [memberExpenses, setMemberExpenses] = useState([]);
  const [categories, setCategories] = useState({});

  // טעינת הוצאות לפי משתמש
  useEffect(() => {
    if (!groupId || !memberId) return;

    const expensesQuery = query(
      collection(db, "groups", groupId, "expenses"),
      where("userId", "==", memberId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(expensesQuery, (snapshot) => {
      const expenses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMemberExpenses(expenses);
    });

    return () => unsub();
  }, [groupId, memberId]);

  // טעינת קטגוריות
  useEffect(() => {
    if (!groupId) return;
    const fetchCategories = async () => {
      try {
        const categoriesSnapshot = await getDocs(
          collection(db, "groups", groupId, "categories")
        );
        const catData = {};
        categoriesSnapshot.forEach((doc) => {
          catData[doc.id] = doc.data().name;
        });
        setCategories(catData);
      } catch (error) {
        console.error("שגיאה בטעינת קטגוריות:", error);
      }
    };
    fetchCategories();
  }, [groupId]);

  const totalSpent = memberExpenses.reduce(
    (sum, expense) => sum + (expense.amount || 0),
    0
  );

  // חישוב סיכום לפי קטגוריות
  const categoryTotals = {};
  memberExpenses.forEach((exp) => {
    const catName = categories[exp.categoryId] || "אחר";
    categoryTotals[catName] = (categoryTotals[catName] || 0) + exp.amount;
  });

  const pieData = Object.keys(categoryTotals).map((cat, i) => ({
    name: cat,
    amount: categoryTotals[cat],
    color: ["#FF4D4D", "#4D79FF", "#4DCC73", "#FFD24D", "#999999"][i % 5],
    legendFontColor: colors.userDetailsText,
    legendFontSize: 12,
  }));

  const formatDate = (createdAt) => {
    if (!createdAt) return "";
    let dateObj;
    if (createdAt.toDate) {
      dateObj = createdAt.toDate();
    } else if (createdAt.seconds) {
      dateObj = new Date(createdAt.seconds * 1000);
    } else {
      dateObj = new Date(createdAt);
    }
    return dateObj.toLocaleDateString("he-IL");
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.userDetailsBackground,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 10,
        },
      ]}
    >
      {/* כפתור חזור */}
      <TouchableOpacity
        style={[
          styles.backButton,
          {
            top: insets.top + 10,
            backgroundColor: colors.userDetailsCard,
            shadowColor: colors.userDetailsShadow,
          },
        ]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons
          name="arrow-forward"
          size={24}
          color={colors.userDetailsText}
        />
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.userDetailsTitle }]}>
        {memberName}
      </Text>
      <Text style={[styles.subtitle, { color: colors.userDetailsSubtitle }]}>
        סה״כ הוצאות: {formatCurrency(totalSpent)}
      </Text>

      {/* תרשים עוגה */}
      <View
        style={[
          styles.chartCard,
          {
            backgroundColor: colors.userDetailsCard,
            shadowColor: colors.userDetailsShadow,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.userDetailsTitle }]}>
          פירוט לפי קטגוריות
        </Text>
        {pieData.length > 0 ? (
          <>
           <View style={styles.chartWrapper}>
            <PieChart
              data={pieData.map((c) => ({
                name: c.name,
                population: c.amount,
                color: c.color,
                legendFontColor: colors.userDetailsText,
                legendFontSize: c.legendFontSize,
              }))}
              width={chartWidth}
              height={160}
              chartConfig={{ color: () => "#333" }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="0"
              center={[0, 0]} 
              hasLegend={false}
              />
            </View>
            {pieData.map((c, idx) => (
              <View key={idx} style={styles.categoryRow}>
                <View style={[styles.colorDot, { backgroundColor: c.color }]} />
                <Text
                  style={[styles.categoryText, { color: colors.reportText }]}
                >
                  {c.name}: {formatCurrency(c.amount)} (
                  {totalSpent > 0
                    ? ((c.amount / totalSpent) * 100).toFixed(0)
                    : 0}
                  %)
                </Text>
              </View>
            ))}
          </>
        ) : (
          <Text
            style={{ color: colors.userDetailsSubtitle, textAlign: "center" }}
          >
            אין נתוני הוצאות להצגה
          </Text>
        )}
      </View>

      {/* רשימת הוצאות אחרונות */}
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.reportText, marginTop: 20, marginRight: 20 },
        ]}
      >
        הוצאות אחרונות
      </Text>
      <FlatList
        data={memberExpenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const formattedDate = formatDate(item.createdAt);
          const categoryName = categories[item.categoryId] || "אחר";
          return (
            <View
              style={[
                styles.expenseCard,
                {
                  backgroundColor: colors.userDetailsCard,
                  shadowColor: colors.userDetailsShadow,
                },
              ]}
            >
              <View>
                <Text
                  style={[
                    styles.expenseDescription,
                    { color: colors.userDetailsText },
                  ]}
                >
                  {item.description}
                </Text>
                <Text
                  style={[
                    styles.expenseCategoryDate,
                    { color: colors.userDetailsTextSecondary },
                  ]}
                >
                  {categoryName} | {formattedDate}
                </Text>
              </View>
              <Text
                style={[
                  styles.expenseAmount,
                  { color: colors.userDetailsText },
                ]}
              >
                {formatCurrency(item.amount)}
              </Text>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    borderRadius: 50,
    padding: 8,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  chartWrapper: {
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
},
  chartCard: {
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 15,
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "right",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  expenseCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: "500",
  },
  expenseCategoryDate: {
    fontSize: 12,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default UsersDetails;

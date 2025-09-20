import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { PieChart } from "react-native-chart-kit";
import { currency } from "../../Utilities/Currency";

const screenWidth = Dimensions.get("window").width;

const UsersDetails = () => {
  const route = useRoute();
  const { groupId, memberId, memberName } = route.params;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const formatCurrency = currency()

  const [memberExpenses, setMemberExpenses] = useState([]);
  const [categories, setCategories] = useState({});

  useEffect(() => {
    if (!groupId || !memberId) return;

    const expensesQuery = query(
      collection(db, "groups", groupId, "expenses"),
      where("userId", "==", memberId)
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
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, [groupId]);

  const totalSpent = memberExpenses.reduce(
    (sum, expense) => sum + (expense.amount || 0),
    0
  );

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
        <Ionicons name="arrow-back" size={24} color={colors.userDetailsText} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.userDetailsTitle }]}>
        {memberName}
      </Text>
      <Text style={[styles.subtitle, { color: colors.userDetailsSubtitle }]}>
        סה"כ הוצאה: {formatCurrency(totalSpent)} 
      </Text>

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
          הוצאות לפי קטגוריות
        </Text>
        <PieChart
          data={pieData.map((c) => ({
            name: c.name,
            population: c.amount,
            color: c.color,
            legendFontColor: colors.userDetailsText,
            legendFontSize: c.legendFontSize,
          }))}
          width={screenWidth - 40}
          height={200}
          chartConfig={{
            color: () => "#333",
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          hasLegend={false}
        />
        {pieData.map((c, idx) => (
          <View key={idx} style={styles.categoryRow}>
            <View style={[styles.colorDot, { backgroundColor: c.color }]} />
            <Text style={[styles.categoryText, {color: colors.reportText}]}>
              {c.name}: {formatCurrency(c.amount)}  (
              {((c.amount / totalSpent) * 100).toFixed(0)}%)
            </Text>
          </View>
        ))}
      </View>

      <Text
        style={[styles.sectionTitle, {color: colors.reportText},{ marginTop: 20 }, { marginRight: 20 }]}
      >
        הוצאות
      </Text>
      <FlatList
        data={memberExpenses.slice(0, 5)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const formattedDate = formatDate(item.createdat);
          const categoryName =
            categories[item.categoryId] || "קטגוריה לא ידועה";
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
              <Text style={[styles.expenseAmount, { color: colors.userDetailsText }]}>{formatCurrency(item.amount)} </Text>
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
    backgroundColor: "#f0f2f5",
  },
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 50,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  chartCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
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
    color: "#333",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  expenseCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
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
    color: "#999",
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
});

export default UsersDetails;

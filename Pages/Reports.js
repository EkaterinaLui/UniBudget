import { useTheme } from "@react-navigation/native";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import * as Progress from "react-native-progress";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../firebase";
import { useCurrency } from "../Utilities/Currency";
import { getArchiveId } from "../Utilities/date";

const screenWidth = Dimensions.get("window").width;

const months = [
  "ינאור",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

const currentMonthName = months[new Date().getMonth()];
const currentYearName = new Date().getFullYear();

const Report = () => {
  const user = auth.currentUser;
  const { colors } = useTheme();
  const formatCurrency = useCurrency();

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthName);
  const [selectedYear, setSelectedYear] = useState(currentYearName);
  const [groupPicker, setGroupPicker] = useState(false);
  const [monthPicker, setMonthPicker] = useState(false);
  const [yearPicker, setYearPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const [barData, setBarData] = useState(null);
  const [pieDataCategories, setPieDataCategories] = useState([]);
  const [pieDataBalance, setPieDataBalance] = useState([]);
  const [pieDataUsers, setPieDataUsers] = useState([]);
  const [lineDataUsers, setLineDataUsers] = useState(null);
  const [progressData, setProgessData] = useState(null);

  const chartConfig = {
    backgroundGradientFrom: colors.reportBackground,
    backgroundGradientTo: colors.reportBackground,
    color: (opacity = 1) =>
      `${colors.reportText}${Math.floor(opacity * 255).toString(16)}`,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  // טוען קבוצות
  useEffect(() => {
    const loadGroups = async () => {
      if (!user) return;
      const snapshot = await getDocs(collection(db, "groups"));

      const groupNames = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((group) =>
          group.members?.some((member) => member.uid === user.uid)
        )
        .map((group) => ({
          id: group.id,
          name: group.groupName || "ללא שם",
        }));

      setGroups(groupNames);
      if (groupNames.length > 0 && !selectedGroup) {
        setSelectedGroup(groupNames[0]);
      }
    };
    loadGroups();
  }, [user, selectedGroup]);

  // טוען נתונים לגרפים
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !selectedGroup) return;
      setLoading(true);
      try {
        let allExpenses = [];
        let allCategories = [];
        let allSavings = [];

        const monthIndex = months.indexOf(selectedMonth);
        const year = selectedYear;

        const startOfMonth = new Date(year, monthIndex, 1);
        const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59);

        const groupId = selectedGroup.id;

        let expensesSnap;
        let categoriesSnap;
        let savingsSnap;

        if (
          selectedYear === new Date().getFullYear() &&
          monthIndex === new Date().getMonth()
        ) {
          // חודש נוכחי – טוען ישירות
          const expensesQ = query(
            collection(db, "groups", groupId, "expenses"),
            where("createdAt", ">=", Timestamp.fromDate(startOfMonth)),
            where("createdAt", "<=", Timestamp.fromDate(endOfMonth))
          );
          expensesSnap = await getDocs(expensesQ);
          categoriesSnap = await getDocs(
            collection(db, "groups", groupId, "categories")
          );
          savingsSnap = await getDocs(
            collection(db, "groups", groupId, "saving")
          );
        } else {
          // חודש קודם – טוען מתוך ארכיון
          const archiveId = getArchiveId(selectedYear, monthIndex + 1);
          const archiveRef = doc(db, "groups", groupId, "archive", archiveId);

          expensesSnap = await getDocs(collection(archiveRef, "expenses"));
          categoriesSnap = await getDocs(collection(archiveRef, "categories"));
          savingsSnap = await getDocs(collection(archiveRef, "saving"));
        }

        const groupSnap = await getDoc(doc(db, "groups", groupId));
        const groupData = groupSnap.data();
        const totalBudget = groupData?.totalBudget || 0;

        allExpenses = expensesSnap.docs.map((d) => ({
          ...d.data(),
          groupId,
        }));
        allCategories = categoriesSnap.docs.map((d) => ({
          ...d.data(),
          groupId,
          id: d.id,
        }));
        allSavings = savingsSnap.docs.map((d) => ({
          ...d.data(),
          groupId,
          id: d.id,
        }));

        // ימי החודש
        const days = Array.from({ length: 31 }, (_, i) => i + 1);
        const dailyTotals = days.map((day) =>
          allExpenses
            .filter((e) => e.createdAt?.toDate().getDate() === day)
            .reduce((sum, e) => sum + (e.amount || 0), 0)
        );

        const newBarData = {
          labels: days.filter((d) => d % 5 === 0).map(String),
          datasets: [{ data: dailyTotals }],
        };

        // קטגוריות
        const categoriesTotal = {};
        allExpenses.forEach((e) => {
          if (e.categoryId) {
            categoriesTotal[e.categoryId] =
              (categoriesTotal[e.categoryId] || 0) + (e.amount || 0);
          }
          if (e.savingId) {
            categoriesTotal[e.savingId] =
              (categoriesTotal[e.savingId] || 0) + (e.amount || 0);
          }
        });

        const newPieDataCategories = Object.entries(categoriesTotal).map(
          ([id, value]) => {
            const category = allCategories.find((c) => c.id === id);
            const saving = allSavings.find((s) => s.id === id);

            return {
              name: category?.name
                ? category.name
                : saving?.name
                ? `חיסכון - ${saving.name}`
                : "ללא קטגוריות",
              population: value,
              color:
                category?.color ||
                (saving ? "#2196f3" : `#${Math.floor(Math.random() * 16777215)
                  .toString(16)
                  .padStart(6, "0")}`),
            };
          }
        );

        const totalExpenses = allExpenses.reduce(
          (s, e) => s + (e.amount || 0),
          0
        );
        const profit = Math.max(totalBudget - totalExpenses, 0);

        const newPieDataBalance = [
          ...newPieDataCategories,
          { name: "יתרה", population: profit, color: "#4caf50" },
        ];

        // משתמשים
        const usersTotal = {};
        allExpenses.forEach((e) => {
          usersTotal[e.userId] = (usersTotal[e.userId] || 0) + (e.amount || 0);
        });

        const users = {};
        const usersSnap = await getDocs(collection(db, "users"));
        usersSnap.forEach((doc) => {
          const data = doc.data();
          users[doc.id] = data.name || "ללא שם";
        });

        const newPieDataUsers = Object.entries(usersTotal).map(
          ([userId, value]) => ({
            name: users[userId] || "ללא משתמש",
            population: value,
            color: `#${Math.floor(Math.random() * 16777215)
              .toString(16)
              .padStart(6, "0")}`,
          })
        );

        const dailyExpenseTotals = days.map((day) =>
          allExpenses
            .filter((e) => e.createdAt?.toDate().getDate() === day)
            .reduce((sum, e) => sum + (e.amount || 0), 0)
        );

        const newLineDataUsers = {
          labels: days.filter((d) => d % 5 === 0).map(String),
          datasets: [{ data: dailyExpenseTotals }],
        };

        const rawProgress = totalBudget > 0 ? totalExpenses / totalBudget : 0;
        const progress = Math.min(rawProgress, 1);

        setBarData(newBarData);
        setPieDataCategories(newPieDataCategories);
        setPieDataBalance(newPieDataBalance);
        setPieDataUsers(newPieDataUsers);
        setLineDataUsers(newLineDataUsers);
        setProgessData({ raw: rawProgress, capped: progress });
      } catch (e) {
        console.error("Error loading data:", e);
      }
      setLoading(false);
    };

    fetchData();
  }, [selectedGroup, selectedMonth, selectedYear, user]);


  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.reportBackground }]}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.reportText }]}>
            דוחות
          </Text>
        </View>

        {/* בחירת קבוצה */}
        <View style={styles.selectorContainer}>
          <Text style={[styles.selectorLabel, { color: colors.reportText }]}>
            בחירת קבוצה
          </Text>
          <TouchableOpacity
            style={[
              styles.selector,
              {
                borderColor: colors.reportBorder,
                backgroundColor: colors.reportSelectorBackground,
              },
            ]}
            onPress={() => setGroupPicker(!groupPicker)}
          >
            <Text style={[styles.selectorText, { color: colors.reportText }]}>
              {selectedGroup?.name || "בחר קבוצה"}
            </Text>
          </TouchableOpacity>
          {groupPicker && (
            <View
              style={[
                styles.pickerOptions,
                { borderColor: colors.reportBorder },
              ]}
            >
              {groups.map((group, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedGroup(group);
                    setGroupPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: colors.reportText },
                    ]}
                  >
                    {group.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* בחירת חודש */}
        <View style={styles.selectorContainer}>
          <Text style={[styles.selectorLabel, { color: colors.reportText }]}>
            בחירת חודש
          </Text>
          <TouchableOpacity
            style={[
              styles.selector,
              {
                borderColor: colors.reportBorder,
                backgroundColor: colors.reportSelectorBackground,
              },
            ]}
            onPress={() => setMonthPicker(!monthPicker)}
          >
            <Text style={[styles.selectorText, { color: colors.reportText }]}>
              {selectedMonth}
            </Text>
          </TouchableOpacity>
          {monthPicker && (
            <View
              style={[
                styles.pickerOptions,
                { borderColor: colors.reportBorder },
              ]}
            >
              {months.map((month, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedMonth(month);
                    setMonthPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: colors.reportText },
                    ]}
                  >
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* בחירת שנה */}
        <View style={styles.selectorContainer}>
          <Text style={[styles.selectorLabel, { color: colors.reportText }]}>
            בחירת שנה
          </Text>
          <TouchableOpacity
            style={[
              styles.selector,
              {
                borderColor: colors.reportBorder,
                backgroundColor: colors.reportSelectorBackground,
              },
            ]}
            onPress={() => setYearPicker(!yearPicker)}
          >
            <Text style={[styles.selectorText, { color: colors.reportText }]}>
              {selectedYear}
            </Text>
          </TouchableOpacity>
          {yearPicker && (
            <View
              style={[
                styles.pickerOptions,
                { borderColor: colors.reportBorder },
              ]}
            >
              {[2023, 2024, 2025].map((year) => (
                <TouchableOpacity
                  key={year}
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedYear(year);
                    setYearPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: colors.reportText },
                    ]}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.progressColor} />
        ) : (
          <>
            {/* גרף */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.reportCardBackground,
                  shadowColor: colors.reportShadow,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.reportText }]}>
                הוצאות
              </Text>
              {barData && (
                <>
                  <BarChart
                    data={barData}
                    width={screenWidth - 64}
                    height={220}
                    chartConfig={chartConfig}
                    verticalLabelRotation={30}
                  />
                </>
              )}
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.reportCardBackground,
                  shadowColor: colors.reportShadow,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.reportText }]}>
                התפלגות לפי קטגוריות
              </Text>
              {pieDataCategories.length > 0 && (
                <>
                  <PieChart
                    data={pieDataCategories.map((item) => ({
                      ...item,
                      legendFontColor: "#333",
                      legendFontSize: 12,
                    }))}
                    width={screenWidth - 64}
                    height={180}
                    chartConfig={chartConfig}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft="15"
                    hasLegend={false}
                  />
                  {pieDataCategories.map((item, index) => (
                    <View key={index} style={styles.categoryRow}>
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: item.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          { color: colors.reportText },
                        ]}
                      >
                        {item.name}: {formatCurrency(item.population)} (
                        {(
                          (item.population /
                            pieDataCategories.reduce(
                              (s, i) => s + i.population,
                              0
                            )) *
                          100
                        ).toFixed(0)}
                        %)
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.reportCardBackground,
                  shadowColor: colors.reportShadow,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.reportText }]}>
                תקציב מול הוצאות
              </Text>
              {pieDataBalance.length > 0 && (
                <>
                  <PieChart
                    data={pieDataBalance.map((item) => ({
                      ...item,
                      legendFontColor: "#333",
                      legendFontSize: 12,
                    }))}
                    width={screenWidth - 64}
                    height={180}
                    chartConfig={chartConfig}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft="15"
                    hasLegend={false}
                  />
                  {pieDataBalance.map((item, index) => (
                    <View key={index} style={styles.categoryRow}>
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: item.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          { color: colors.reportText },
                        ]}
                      >
                        {item.name}: {formatCurrency(item.population)}  (
                        {(
                          (item.population /
                            pieDataBalance.reduce(
                              (s, i) => s + i.population,
                              0
                            )) *
                          100
                        ).toFixed(0)}
                        %)
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.reportCardBackground,
                  shadowColor: colors.reportShadow,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.reportText }]}>
                התפלגות לפי משתמשים
              </Text>
              {pieDataUsers.length > 0 && (
                <>
                  <PieChart
                    data={pieDataUsers.map((item) => ({
                      ...item,
                      legendFontColor: "#333",
                      legendFontSize: 12,
                    }))}
                    width={screenWidth - 64}
                    height={180}
                    chartConfig={chartConfig}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft="15"
                    hasLegend={false}
                  />
                  {pieDataUsers.map((item, index) => (
                    <View key={index} style={styles.categoryRow}>
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: item.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          { color: colors.reportText },
                        ]}
                      >
                        {item.name}: {formatCurrency(item.population)}  (
                        {(
                          (item.population /
                            pieDataUsers.reduce(
                              (s, i) => s + i.population,
                              0
                            )) *
                          100
                        ).toFixed(0)}
                        %)
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.reportCardBackground,
                  shadowColor: colors.reportShadow,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.reportText }]}>
                סך הכל הוצאות לפי ימים
              </Text>
              {lineDataUsers && lineDataUsers.datasets[0].data.length > 0 && (
                <LineChart
                  data={lineDataUsers}
                  width={screenWidth - 64}
                  height={180}
                  chartConfig={chartConfig}
                  bezier
                />
              )}
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.reportCardBackground,
                  shadowColor: colors.reportShadow,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.reportText }]}>
                ניצול תקציב
              </Text>
              {progressData !== null && (
                <Progress.Circle
                  size={120}
                  progress={progressData.capped}
                  showsText={true}
                  formatText={() => `${Math.round(progressData.raw * 100)}%`}
                  color={colors.progressColor}
                  thickness={10}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    padding: 16,
    marginTop: 40,
    marginBottom: 73,
  },
  header: {
    alignItems: "center",
    marginVertical: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  selectorContainer: {
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  selector: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  selectorText: {
    fontSize: 16,
    color: "#333",
  },
  pickerOptions: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginTop: 4,
  },
  pickerItem: { padding: 12 },
  pickerItemText: { fontSize: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "right",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    marginRight: 10,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 14,
    color: "#333",
  },
});

export default Report;

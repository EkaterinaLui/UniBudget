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

import { assignUniqueColors } from "../Utilities/chartColors";

const screenWidth = Dimensions.get("window").width;

// דף הדוחות שמציג גרפים וסטטיסטיקות על ההוצאות בקבוצה לפי חודש ושנה נבחרים
// משתמש את הנתונים מה-Firestore כדי לחשב ולהציג את הדוחות בצורה ויזואלית עם גרפים שונים
// מאפשר לבחור קבוצה, חודש ושנה כדי לראות את הדוחות הרלוונטיים לאותה תקופה וקבוצה
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

// חודש ושנה נוכחיים (כברירת מחדל למסך)
const currentMonthName = months[new Date().getMonth()];
const currentYearName = new Date().getFullYear();

// קומפוננטה הראשית של דף הדוחות
const Report = () => {
  // משתמש נוכחי
  const user = auth.currentUser;
  // שימוש בתמות של הניווט כדי לקבל את הצבעים הנוכחיים של האפליקציה
  const { colors } = useTheme();
  // שימוש בהוק של מטבע כדי לעצב את הסכומים בצורה נכונה לפי המטבע הנבחר
  const formatCurrency = useCurrency();
  // סטייטים לניהול נתונים ובחירות של המשתמש
  const [groups, setGroups] = useState([]);
  // הקבוצה שנבחרה כרגע
  const [selectedGroup, setSelectedGroup] = useState(null);
  // בחירת חודש ושנה כברירת מחדל לחודש הנוכחי
  const [selectedMonth, setSelectedMonth] = useState(currentMonthName);
  const [selectedYear, setSelectedYear] = useState(currentYearName);
  // סטייטים לנתונים של הגרפים
  const [groupPicker, setGroupPicker] = useState(false);
  const [monthPicker, setMonthPicker] = useState(false);
  const [yearPicker, setYearPicker] = useState(false);
  //Firestore סטייט לטעינה בזמן שהנתונים נטענים מה
  const [loading, setLoading] = useState(false);
  const [barData, setBarData] = useState(null);
  // נתונים לעוגות ולגרפים השונים
  const [pieDataCategories, setPieDataCategories] = useState([]);
  const [pieDataBalance, setPieDataBalance] = useState([]);
  const [pieDataUsers, setPieDataUsers] = useState([]);
  // נתונים לקו של הוצאות יומיות
  const [lineDataUsers, setLineDataUsers] = useState(null);
  // נתונים לניצול תקציב
  const [progressData, setProgessData] = useState(null);

  // הגדרות גרפים (צבע רקע, צבע טקסט וכו')
  const chartConfig = {
    backgroundGradientFrom: colors.reportBackground,
    backgroundGradientTo: colors.reportBackground,

    // פונקציה שמחזירה צבע עם שקיפות לפי הצבע של הטקסט בדוחות
    color: (opacity = 1) =>
      `${colors.reportText}${Math.floor(opacity * 255).toString(16)}`,
    // צבע לצבעים של העוגות והברים
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  // טעינת קבוצות של המשתמש

  useEffect(() => {
    const loadGroups = async () => {
      if (!user) return;

      // קוראים את כל הקבוצות מ-Firestore
      const snapshot = await getDocs(collection(db, "groups"));

      // לוקחים רק קבוצות שבהן המשתמש נמצא ב-members
      // ואז שומרים רק id + name כדי להשתמש בבורר
      const groupNames = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((group) =>
          group.members?.some((member) => member.uid === user.uid),
        )
        .map((group) => ({
          id: group.id,
          name: group.groupName || "ללא שם",
        }));

      setGroups(groupNames);

      // אם זו הפעם הראשונה ויש קבוצות אבל עוד לא נבחרה קבוצה, נבחר הראשונה כברירת מחדל
      if (groupNames.length > 0 && !selectedGroup) {
        setSelectedGroup(groupNames[0]);
      }
    };

    loadGroups();
  }, [user, selectedGroup]);

  //  טעינת נתונים לגרפים לפי חודש/שנה/קבוצה

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !selectedGroup) return;
      setLoading(true);

      try {
        // נשמור כאן את הכל כדי לחשב גרפים
        let allExpenses = [];
        let allCategories = [];
        let allSavings = [];

        // הופכים את שם החודש לאינדקס (0..11)
        const monthIndex = months.indexOf(selectedMonth);
        const year = selectedYear;

        // גבולות חודש (תחילת החודש עד סוף החודש)
        const startOfMonth = new Date(year, monthIndex, 1);
        const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59);

        const groupId = selectedGroup.id;

        let expensesSnap;
        let categoriesSnap;
        let savingsSnap;
        let totalBudget = 0;

        // בדיקה אם מדובר בחודש הנוכחי
        // אם כן - קוראים את הנתונים ישירות מהקבוצה
        // אם לא - קוראים מהארכיון
        const isCurrentMonth =
          year === new Date().getFullYear() &&
          monthIndex === new Date().getMonth();

        if (isCurrentMonth) {
          // חודש נוכחי - Firestore Live Data
          // יוצרים שאילתה שמביאה רק הוצאות שנוצרו בתוך החודש הנבחר
          // זה חשוב כדי לא להביא את כל ההוצאות של הקבוצה ולחשב עליהן, אלא רק את אלה שרלוונטיות לחודש הנבחר
          // Timestamp השאילתה משתמשת ב
          //  כדי להשוות את תאריך היצירה של ההוצאות עם גבולות החודש
          const expensesQ = query(
            collection(db, "groups", groupId, "expenses"),
            where("createdAt", ">=", Timestamp.fromDate(startOfMonth)),
            where("createdAt", "<=", Timestamp.fromDate(endOfMonth)),
          );

          expensesSnap = await getDocs(expensesQ);

          categoriesSnap = await getDocs(
            collection(db, "groups", groupId, "categories"),
          );

          savingsSnap = await getDocs(
            collection(db, "groups", groupId, "savings"),
          );

          // קריאת התקציב הכולל של הקבוצה
          const groupSnap = await getDoc(doc(db, "groups", groupId));
          const groupData = groupSnap.data();
          totalBudget = groupData?.totalBudget || 0;
        } else {
          // חודש קודם - נתונים מהארכיון

          const archiveId = getArchiveId(year, monthIndex + 1);
          const archiveRef = doc(db, "groups", groupId, "archive", archiveId);

          expensesSnap = await getDocs(collection(archiveRef, "expenses"));
          categoriesSnap = await getDocs(collection(archiveRef, "categories"));
          savingsSnap = await getDocs(collection(archiveRef, "savings"));

          // תקציב שנשמר בארכיון
          const archiveSnap = await getDoc(archiveRef);
          const archiveData = archiveSnap.data();
          totalBudget = archiveData?.totalBudget || 0;
        }

        // ממירים את ה-Snapshots למערכים רגילים כדי שיהיה נוח לעבוד איתם
        allExpenses = expensesSnap.docs.map((d) => ({ ...d.data(), groupId }));
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

        // ימי החודש (את יוצרת 1..31 תמיד)
        // הערה: בחודשים עם 30/28 ימים יהיו פשוט ימים עם 0 הוצאות
        const days = Array.from({ length: 31 }, (_, i) => i + 1);

        // BarChart: סכום הוצאות לכל יום

        const dailyTotals = days.map((day) =>
          allExpenses
            .filter((e) => e.createdAt?.toDate().getDate() === day)
            .reduce((sum, e) => sum + (e.amount || 0), 0),
        );
        // יוצרים נתונים לגרף העמודות עם התגים של הימים והסכומים היומיים
        const newBarData = {
          labels: days.filter((d) => d % 5 === 0).map(String),
          datasets: [{ data: dailyTotals }],
        };

        // PieChart קטגוריות/חיסכון: סכום לכל id

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

        // יוצרים מערך צבעים
        const rawPieCategories = Object.entries(categoriesTotal).map(
          ([id, value]) => {
            const category = allCategories.find((c) => c.id === id);
            const saving = allSavings.find((s) => s.id === id);

            return {
              id,
              // אם זה קטגוריה נשתמש בשם שלה
              // אם זה חיסכון - נוסיף "חיסכון -"
              name: category?.name
                ? category.name
                : saving?.name
                  ? `חיסכון - ${saving.name}`
                  : "ללא קטגוריות",
              population: value,

              // אם לקטגוריה יש צבע שמור - נעדיף אותו
              // אחרת assignUniqueColors יבחר צבע ייחודי
              preferredColor: category?.color || null,
            };
          },
        );

        // נותן צבעים ייחודיים כדי להימנע מצבעים שחוזרים
        const newPieDataCategories = assignUniqueColors(
          rawPieCategories,
          (x) => x.id,
          (x) => x.preferredColor,
        ).map(({ preferredColor, ...rest }) => rest);

        // PieChart "תקציב מול הוצאות": מוסיפים "יתרה"

        const totalExpenses = allExpenses.reduce(
          (s, e) => s + (e.amount || 0),
          0,
        );

        // יתרה לא יכולה להיות שלילית (אם עברנו תקציב - נשים 0)
        const profit = Math.max(totalBudget - totalExpenses, 0);
        // הנתונים לעוגת תקציב מול הוצאות: הוצאות ויתרה
        const newPieDataBalance = [
          ...newPieDataCategories,
          { name: "יתרה", population: profit, color: "#4caf50" },
        ];

        // PieChart משתמשים: סכום הוצאות לכל userId

        const usersTotal = {};
        allExpenses.forEach((e) => {
          usersTotal[e.userId] = (usersTotal[e.userId] || 0) + (e.amount || 0);
        });

        // מביאים שמות משתמשים מה-collection users
        const users = {};
        const usersSnap = await getDocs(collection(db, "users"));
        usersSnap.forEach((docSnap) => {
          const data = docSnap.data();
          users[docSnap.id] = data.name || "ללא שם";
        });

        // יוצרים נתונים לעוגת משתמשים
        const rawPieUsers = Object.entries(usersTotal).map(
          ([userId, value]) => ({
            id: userId,
            name: users[userId] || "ללא משתמש",
            population: value,
          }),
        );

        // צבעים ייחודיים למשתמשים
        const newPieDataUsers = assignUniqueColors(rawPieUsers, (x) => x.id);

        // LineChart: סכום הוצאות לכל יום (קו)
        const dailyExpenseTotals = days.map((day) =>
          allExpenses
            .filter((e) => e.createdAt?.toDate().getDate() === day)
            .reduce((sum, e) => sum + (e.amount || 0), 0),
        );
        // יוצרים נתונים לגרף הקו עם התגים של הימים והסכומים היומיים
        const newLineDataUsers = {
          labels: days.filter((d) => d % 5 === 0).map(String),
          datasets: [{ data: dailyExpenseTotals }],
        };

        // ניצול תקציב: יחס הוצאות/תקציב
        // raw יכול להיות מעל 1 (לדוגמה 1.4 = 140%)

        const rawProgress = totalBudget > 0 ? totalExpenses / totalBudget : 0;
        const progress = Math.min(rawProgress, 1);

        // שמירת נתונים ל-state כדי להציג UI
        // חשוב לעשות את כל החישובים לפני שמעדכנים את הסטייטים כדי למנוע רינדורים מיותרים
        setBarData(newBarData);
        setPieDataCategories(newPieDataCategories);
        setPieDataBalance(newPieDataBalance);
        setPieDataUsers(newPieDataUsers);
        setLineDataUsers(newLineDataUsers);
        setProgessData({ raw: rawProgress, capped: progress });
      } catch (e) {
        console.error("Error loading data:", e);
      }
      // בסוף הטעינה, גם אם הייתה שגיאה, נסיר את ה-
      // Loading כדי לא להיתקע על המסך
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

          {/* אופציות של קבוצות */}
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

        {/* טעינה / תוכן */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.progressColor} />
        ) : (
          <>
            {/* גרף עמודות - הוצאות */}
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
                <BarChart
                  data={barData}
                  width={screenWidth - 64}
                  height={220}
                  chartConfig={chartConfig}
                  verticalLabelRotation={30}
                />
              )}
            </View>

            {/* עוגה - קטגוריות */}
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

                  {/* רשימת קטגוריות + צבע */}
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
                              0,
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

            {/* עוגה - תקציב מול הוצאות */}
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
                        {item.name}: {formatCurrency(item.population)} (
                        {(
                          (item.population /
                            pieDataBalance.reduce(
                              (s, i) => s + i.population,
                              0,
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

            {/* עוגה - משתמשים */}
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
                        {item.name}: {formatCurrency(item.population)} (
                        {(
                          (item.population /
                            pieDataUsers.reduce(
                              (s, i) => s + i.population,
                              0,
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

            {/* גרף קו - סך הוצאות לפי ימים */}
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

            {/* ניצול תקציב */}
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
                  // מציגים את האחוז האמיתי (גם אם מעל 100%)
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
    borderRadius: 8,
  },
  selectorText: {
    fontSize: 16,
  },
  pickerOptions: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
  },
  pickerItem: { padding: 12 },
  pickerItemText: { fontSize: 16 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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
  },
});

export default Report;

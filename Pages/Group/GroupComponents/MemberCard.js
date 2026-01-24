import { Ionicons } from "@expo/vector-icons";
import { Dimensions, StyleSheet, Text, TouchableOpacity } from "react-native";
import CircularProgressBar from "./CircularProgressBar";

const screenWidth = Dimensions.get("window").width;

const MemberCard = ({
  item,
  isAdmin,
  navigation,
  groupId,
  userId,
  allUsers,
  memberProgress,
  memberSpending,
  totalBudget,
  membersData,
  colors,
  formatCurrency,
  memberBudgets,
}) => {
  // כרטיס "הוספת משתמש"
  if (item?.isAddButton) {
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
        onPress={() => navigation.navigate("AddUsers", { groupId, userId })}
      >
        <Ionicons name="person-add" size={32} color={colors.primary} />
        <Text style={[styles.addCategoryText, { color: colors.primary }]}>
          הוספת משתמש
        </Text>
      </TouchableOpacity>
    );
  }

  const memberId = item?.uid;

  // progress אמיתי (יכול להיות מעל 100)
  const progressRaw = memberProgress?.[memberId] ?? 0;

  // לציור בלבד - לא יותר מ-100
  const progressForCircle = Math.min(Math.max(progressRaw, 0), 100);

  const spent = memberSpending?.[memberId] ?? 0;
  const memberName = item?.name || allUsers?.[memberId] || `משתמש (${memberId})`;

  // תקציב למשתמש (תמיד מספר)
  let memberBudget = 0;

  if (memberBudgets?.[memberId] !== undefined && memberBudgets?.[memberId] !== null) {
    // אם בבסיס נתונים שמור תקציב אישי
    memberBudget = Number(memberBudgets[memberId]) || 0;
  } else if (totalBudget && Array.isArray(membersData) && membersData.length > 0) {
    // אם לא - חלוקה של תקציב כללי לפי כל המשתמשים
    memberBudget = Number(totalBudget) / membersData.length;
  }

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
      <CircularProgressBar
        progress={progressForCircle}
        label={`${Math.round(progressRaw)}%`}
      />

      <Text style={[styles.memberName, { color: colors.text }]}>
        {memberName}
      </Text>

      <Text style={[styles.memberAmount, { color: colors.secondary }]}>
        {formatCurrency(spent)} / {formatCurrency(memberBudget)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  memberCard: {
    width: screenWidth * 0.4,
    height: 160,
    borderRadius: 16,
    padding: 15,
    marginRight: 15,
    marginVertical: 20,
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
    marginRight: 15,
    marginVertical: 20,
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
  addCategoryText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});

export default MemberCard;

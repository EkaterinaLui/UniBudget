import React from "react";
import { Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CircularProgressBar from "./CircularProgressBar";

const screenWidth = Dimensions.get("window").width;

const MemberCard = ({
  item,
  isAdmin,
  navigation,
  groupId,
  allUsers,
  memberProgress,
  memberSpending,
  totalBudget,
  membersData,
  colors,
  formatCurrency,
}) => {
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
        {formatCurrency(totalBudget / membersData.length)}
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

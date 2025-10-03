import { Ionicons } from "@expo/vector-icons";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const screenWidth = Dimensions.get("window").width;

const CategoryCard = ({
  item,
  navigation,
  groupId,
  userId,
  allUsers,
  colors,
  formatCurrency,
  isAdmin,
}) => {
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
          navigation.navigate("CreateCategory", { groupId, isTemporary: true })
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
    item.isTemporary && item.eventEndDate
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

      {/* הוצאות באחוזים לפי קטדוריה */}
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
              backgroundColor: isExpired ? "red" : item.color || colors.primary,
            },
          ]}
        />
      </View>

      {isOverBudget && (
        <Text style={[styles.expiredCat, { color: colors.progressDanger }]}>
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

const styles = StyleSheet.create({
  categoryCard: {
    width: screenWidth * 0.4,
    height: 160,
    borderRadius: 16,
    padding: 15,
    marginRight: 15,
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
    textAlign: "left",
  },
  categoryCardAmount: {
    fontSize: 13,
    textAlign: "left",
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
    fontWeight: "bold",
    marginVertical: 5,
  },
  addCategoryCard: {
    width: screenWidth * 0.4,
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
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

export default CategoryCard;

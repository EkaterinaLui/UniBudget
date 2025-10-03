import { Ionicons } from "@expo/vector-icons";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";


const screenWidth = Dimensions.get("window").width;

const SavingCard = ({
  item,
  navigation,
  groupId,
  userId,
  colors,
  formatCurrency,
}) => {
  if (item.isAddButton) {
    return (
      <TouchableOpacity
        style={[styles.addCard, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate("CreateSaving", { groupId })}
      >
        <Ionicons name="add-circle-outline" size={40} color={colors.primary} />
        <Text style={[styles.addText, { color: colors.primary }]}>
          הוסף יעד
        </Text>
      </TouchableOpacity>
    );
  }

  const progress =
    item.targetAmount > 0 ? (item.currentAmount / item.targetAmount) * 100 : 0;
  let progressColor = colors.danger;
  if (progress >= 80) progressColor = colors.success || "green";
  else if (progress >= 50) progressColor = colors.warning || "orange";

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card, shadowColor: colors.shadow },
      ]}
      onPress={() =>
        navigation.navigate("SavingDetails", {
          groupId,
          savingId: item.id,
          userId,
        })
      }
    >
      <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
      <Text style={[styles.amount, { color: colors.secondary }]}>
        {formatCurrency(item.currentAmount)} /{" "}
        {formatCurrency(item.targetAmount)}
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
            { width: `${progress}%`, backgroundColor: progressColor },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: progressColor }]}>
        {Math.round(progress)}%
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: screenWidth * 0.4,
    height: 160,
    borderRadius: 16,
    padding: 15,
    marginRight: 15,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "space-between",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  name: {
   fontSize: 16,
    fontWeight: "bold",
    textAlign: "left",
  },
  amount: {
    fontSize: 13,
    textAlign: "left",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    width: "100%",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  progressText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
  },
  addCard: {
    width: screenWidth * 0.4,
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  addText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});

export default SavingCard;

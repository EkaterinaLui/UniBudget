import { useTheme } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

const CircularProgressBar = ({ progress }) => {
  const { colors } = useTheme();
  const size = 70;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const percentage = Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let progressColor = colors.progressNormal;
  if (percentage > 100) {
    progressColor = colors.progressDanger;
  } else if (percentage >= 85) {
    progressColor = colors.progressWarning;
  }

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* רקע */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.progressBackground}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* אחוז */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[styles.text, { color: progressColor }]}>{`${Math.round(
        percentage
      )}%`}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    position: "absolute",
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default CircularProgressBar;

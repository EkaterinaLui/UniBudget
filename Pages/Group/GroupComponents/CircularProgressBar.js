// CircularProgressBar.js
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export default function CircularProgressBar({
  progress = 0,   // 0..100 לציור בלבד
  label,          // טקסט מרכזי, יכול להיות "135%"
  size = 64,
  strokeWidth = 8,
  colors,
}) {
  // ערך בטוח לציור
  const safeProgress = Math.max(0, Math.min(Number(progress) || 0, 100));

  // חישובי ציור
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - safeProgress / 100);

  //  בחירת צבע לפי אחוזים
  let fillColor = colors?.primary ?? "#2F80ED"; 

  if (safeProgress > 50 && safeProgress <= 70) {
    fillColor = "#F2C94C"; // צהוב
  } else if (safeProgress > 70 && safeProgress <= 95) {
    fillColor = "#F2994A"; // כתום
  } else if (safeProgress >= 96) {
    fillColor = "#EB5757"; // אדום
  }

  const trackColor = colors?.progressBackground ?? "rgba(0,0,0,0.12)";
  const textColor = colors?.text ?? "#111";

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* רקע */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* התקדמות */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* טקסט במרכז – תמיד הערך האמיתי */}
      <View style={styles.centerTextWrap} pointerEvents="none">
        <Text style={[styles.centerText, { color: textColor }]}>
          {label ?? `${Math.round(safeProgress)}%`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  centerTextWrap: {
    position: "absolute",
    inset: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  centerText: {
    fontSize: 12,
    fontWeight: "800",
  },
});

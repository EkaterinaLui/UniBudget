import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";
import Svg, { Circle } from "react-native-svg";

const ProgressBar = ({ progress }) => {
    const { colors } = useTheme();
    const size = 60;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    const circleProgress = Math.min(Math.max(progress, 0), 100);
    const strokeDashoffset =
        circumference - (circleProgress * circumference) / 100;

    let progressColor = colors.progressNormal;
    if (progress > 100) {
        progressColor = colors.progressDanger;
    } else if (progress >= 85) {
        progressColor = colors.progressWarning;
    }

    return (
        <View style={styles.container}>
            <Svg width={size} height={size}>
                <Circle
                    stroke={colors.progressBackground}
                    fill="transparent"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                />
                <Circle
                    stroke={progressColor}
                    fill="transparent"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
            <Text style={[styles.progressText, { color: progressColor }]}>
                {`${Math.round(progress)}%`}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 60,
        height: 60,
        justifyContent: "center",
        alignItems: "center"
    },
    progressText: {
        position: "absolute",
        fontSize: 12,
        fontWeight: "bold"
    },
});

export default ProgressBar;
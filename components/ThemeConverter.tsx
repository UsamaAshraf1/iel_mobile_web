import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch, // fallback if you prefer native switch
  Animated,
  StyleSheet,
  Easing,
} from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme"; // your existing hook

// Optional: if you want to persist theme choice
// import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ThemeToggle() {
  const systemColorScheme = useColorScheme(); // "light" | "dark" | null

  // null = follow system, "light" or "dark" = manual override
  const [manualTheme, setManualTheme] = useState(null);
  const effectiveTheme = manualTheme || systemColorScheme || "light";

  // Animation value (0 = light / sun, 1 = dark / moon)
  const translateX = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Animate when theme changes
    Animated.timing(translateX, {
      toValue: effectiveTheme === "dark" ? 1 : 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Optional: save preference
    // AsyncStorage.setItem("preferredTheme", effectiveTheme);
  }, [effectiveTheme]);

  const toggleTheme = () => {
    const newTheme = effectiveTheme === "dark" ? "light" : "dark";
    setManualTheme(newTheme);
  };

  // Interpolate background & ball position
  const backgroundColor = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: ["#000000", "#4B5563"], // black → gray (like your web example)
  });

  const ballTranslateX = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 36], // slide from left (sun) to right (moon)
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={toggleTheme}
      style={styles.container}
    >
      {/* <Text
        style={[
          styles.label,
          { color: effectiveTheme === "dark" ? "#E0E0E0" : "#0B1B0C" },
        ]}
      >
        Dark Mode
      </Text> */}

      {/* Custom Toggle Switch */}
      <View style={styles.toggleWrapper}>
        <Animated.View
          style={[
            styles.track,
            {
              backgroundColor: backgroundColor,
            },
          ]}
        >
          {/* Icons */}
          <Text style={styles.iconLeft}>☀️</Text>
          <Text style={styles.iconRight}>☾</Text>

          {/* Sliding Ball */}
          <Animated.View
            style={[
              styles.ball,
              {
                transform: [{ translateX: ballTranslateX }],
              },
            ]}
          />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 80, // adjust as needed
    paddingVertical: 8,
  },
  label: {
    fontFamily: "SfRegular",
    fontSize: 16,
    fontWeight: "500",
    marginRight: 12,
  },
  toggleWrapper: {
    width: 74,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
  },
  track: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    position: "relative",
  },
  iconLeft: {
    fontSize: 18,
    color: "#FFD700", // gold for sun
  },
  iconRight: {
    fontSize: 18,
    color: "#E0E0E0", // light gray for moon
  },
  ball: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
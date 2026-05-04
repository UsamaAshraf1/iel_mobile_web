// DigitalScroll.tsx
import React, { useState, useRef, useEffect } from "react";
import { View, Animated, Text, StyleProp, TextStyle, ViewStyle } from "react-native";

type DigitScrollProps = {
  value: string | number;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  digitHeight?: number;
};

const DigitScroll: React.FC<DigitScrollProps> = ({
  value,
  style,
  containerStyle,
  digitHeight = 24,
}) => {
  const [displayValue, setDisplayValue] = useState(String(value));
  const animValues = useRef<Animated.Value[]>([]).current;

  // Clean value and split into characters
  const cleanValue = String(value).replace(/,/g, ""); // Remove commas for animation logic if needed
  const digits = String(value).split("");               // Keep original (with commas if passed)
  const prevDigits = displayValue.split("");

  // Initialize animation values
  useEffect(() => {
    while (animValues.length < digits.length) {
      animValues.push(new Animated.Value(0));
    }
    // Clean up extra if length decreased
    if (animValues.length > digits.length) {
      animValues.splice(digits.length);
    }
  }, [digits.length]);

  useEffect(() => {
    if (String(value) === displayValue) return;

    const animations: Animated.CompositeAnimation[] = [];

    digits.forEach((newDigit, index) => {
      const oldDigit = prevDigits[index];
      if (newDigit !== oldDigit && !isNaN(Number(newDigit))) {
        const anim = animValues[index];

        const sequence = Animated.sequence([
          Animated.timing(anim, {
            toValue: -digitHeight,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: digitHeight,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }),
        ]);

        animations.push(sequence);
      }
    });

    if (animations.length > 0) {
      Animated.parallel(animations).start(() => {
        setDisplayValue(String(value));
      });
    } else {
      setDisplayValue(String(value));
    }
  }, [value]);

  // Dynamic width for each character
  const getWidth = (char: string): number => {
    if (char === ".") return 9;      // Dot - very narrow
    if (char === ",") return 9;      // Comma - even narrower
    return 9;                       // Normal digits (adjust 10-12 based on your font)
  };

  return (
    <View style={[{ flexDirection: "row", alignItems: "center" }, containerStyle]}>
      {digits.map((digit, index) => {
        const anim = animValues[index] || new Animated.Value(0);

        return (
          <View
            key={index}
            style={{
              overflow: "hidden",
              height: digitHeight,
              width: getWidth(digit),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Animated.Text
              style={[
                style,
                {
                  transform: [{ translateY: anim }],
                  fontVariant: ["tabular-nums"],
                  includeFontPadding: false,     // ← Removes extra padding
                  textAlign: "center",
                  lineHeight: digitHeight,       // Tight vertical control
                },
              ]}
            >
              {digit}
            </Animated.Text>
          </View>
        );
      })}
    </View>
  );
};

export default DigitScroll;
import React from "react";
import { Text, View } from "react-native";

// Helper to interpolate between two hex colors (linearly, based on progress 0-1)
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const rgbToHex = (r, g, b) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const interpolateColor = (color1, color2, progress) => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return color1;

  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * progress);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * progress);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * progress);

  return rgbToHex(r, g, b);
};

// GradientText Component
const GradientText = ({ text, startColor, endColor, style }) => {
  const characters = text.split(""); // Split into chars for smooth gradient
  const totalChars = characters.length;

  return (
    <Text style={style}>
      {characters.map((char, index) => {
        if (char === " ") {
          return <Text key={index}> </Text>; // Preserve spaces without color
        }
        const progress = index / (totalChars - 1); // 0 to 1 across the text
        const gradientColor = interpolateColor(startColor, endColor, progress);
        return (
          <Text key={index} style={{ color: gradientColor }}>
            {char}
          </Text>
        );
      })}
    </Text>
  );
};
export default GradientText;

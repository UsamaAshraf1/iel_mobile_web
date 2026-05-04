// toastConfig.tsx
import { useColorScheme } from "react-native";
import { BaseToast, ErrorToast, InfoToast } from "react-native-toast-message";
import { useTheme } from "@/hooks/ThemeContext";

export const useToastConfig = () => {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();

  const backgroundColor = isDark ? "#1C1C1E" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const borderColor = isDark ? "#1C1C1E" : "#FFFFFF";
  const successColor = isDark ? "#1C1C1E" : "#ECFDF3";
  const errorColor = isDark ? "#1C1C1E" : "#FFFFFF";

  return {
    success: (props: any) => (
      <BaseToast
        {...props}
        style={{
          borderLeftWidth: 6,
          backgroundColor: successColor,
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{
          fontSize: 16,
          fontWeight: "600",
          color: textColor,
        }}
        text2Style={{
          fontSize: 14,
        }}
      />
    ),
    error: (props: any) => (
      <ErrorToast
        {...props}
        style={{
          borderLeftWidth: 6,
          borderLeftColor: "#FF3B30",
          backgroundColor: errorColor,
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{
          fontSize: 16,
          fontWeight: "600",
          color: textColor,
        }}
        text2Style={{
          fontSize: 14,
        }}
      />
    ),
    info: (props: any) => (
      <InfoToast
        {...props}
        style={{
          borderLeftColor: "#007AFF",
          backgroundColor,
          borderWidth: 1,
          borderColor,
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{
          fontSize: 16,
          fontWeight: "600",
          color: textColor,
        }}
        text2Style={{
          fontSize: 14,
          color: isDark ? "#E0E0E0" : "#666",
        }}
      />
    ),
  };
};

// OrderProcessingScreen.tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useTheme } from "@/hooks/ThemeContext";

type ProcessingStep = "verifying" | "connecting" | "executing" | "done";

export default function OrderProcessingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();

  const { order, symbol, ShareNumber, selectedorderType, triggerPrice } =
    useLocalSearchParams<{
      order: string;
      symbol: string;
      ShareNumber: string;
      selectedorderType: string;
      triggerPrice: string;
    }>();

  const [currentStep, setCurrentStep] = useState<ProcessingStep>("verifying");

  const steps: { key: ProcessingStep; label: string }[] = [
    { key: "verifying", label: "Verifying order details" },
    { key: "connecting", label: "Connecting to exchange" },
    { key: "executing", label: "Executing transaction" },
  ];

  useEffect(() => {
    let mounted = true;
    let timeoutIds: NodeJS.Timeout[] = [];

    const advanceStep = () => {
      if (!mounted) return;

      setCurrentStep((prev) => {
        if (prev === "verifying") return "connecting";
        if (prev === "connecting") return "executing";
        if (prev === "executing") {
          // Auto-complete after reaching executing
          setTimeout(() => {
            if (mounted) {
              router.replace({
                pathname: "/OrderPlacement",
                params: {
                  status: "success",
                  order,
                  symbol,
                  ShareNumber,
                  selectedorderType,
                  triggerPrice,
                },
              });
            }
          }, 1200); // small delay to show "done" state
          return "done";
        }
        return prev;
      });
    };

    // Schedule steps (~2 seconds each)
    timeoutIds.push(setTimeout(advanceStep, 1800)); // verifying → connecting
    timeoutIds.push(setTimeout(advanceStep, 3800)); // connecting → executing
    timeoutIds.push(setTimeout(advanceStep, 5800)); // executing → done

    return () => {
      mounted = false;
      timeoutIds.forEach(clearTimeout);
    };
  }, [router, symbol]);

  const getStepStatus = (stepKey: ProcessingStep) => {
    const currentIdx = steps.findIndex((s) => s.key === currentStep);
    const stepIdx = steps.findIndex((s) => s.key === stepKey);

    if (currentIdx > stepIdx) return "completed";
    if (currentIdx === stepIdx) return "active";
    return "pending";
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "" : "#FFF",
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.circle}>
          {currentStep === "done" ? (
            <Text style={styles.checkmark}>✓</Text>
          ) : (
            <ActivityIndicator size="large" color="#53BA83" />
          )}
        </View>

        <Text
          style={[
            styles.title,
            {
              color: isDark ? "#FFFFFF" : "#0B1B0C",
            },
          ]}
        >
          {currentStep === "done" ? "Order Placed!" : "Processing Order"}
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color: isDark ? "#8A8A8A" : "#6B7280",
            },
          ]}
        >
          {currentStep === "done" ? "Redirecting..." : "Placing your order..."}
        </Text>

        <View style={styles.stepsContainer}>
          {steps.map((step) => {
            const status = getStepStatus(step.key);
            return (
              <View key={step.key} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepIndicator,
                    status === "active" && styles.active,
                    status === "completed" && styles.completed,
                    status === "pending" && styles.pending,
                  ]}
                >
                  {status === "completed" && (
                    <Text style={styles.checkSmall}>✓</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    (status === "active" || status === "completed") &&
                      styles.stepActiveLabel,
                    { color: isDark ? "#8A8A8A" : "#6B7280" },
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  checkmark: {
    fontSize: 60,
    color: "#53BA83",
    fontWeight: "bold",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",

    marginBottom: 8,
    fontFamily: "SfRegular",
  },
  subtitle: {
    fontSize: 16,

    textAlign: "center",
    marginBottom: 48,
  },
  stepsContainer: {
    width: "100%",
    gap: 24,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  stepIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  pending: {
    borderColor: "#D1D5DB",
    backgroundColor: "#F3F4F6",
  },
  active: {
    borderColor: "#53BA83",
    backgroundColor: "#DCFCE7",
  },
  completed: {
    backgroundColor: "#53BA83",
    borderColor: "#53BA83",
  },
  checkSmall: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  stepLabel: {
    fontSize: 16,

    fontWeight: "500",
  },
  stepActiveLabel: {
    color: "#0B1B0C",
    fontWeight: "600",
  },
});

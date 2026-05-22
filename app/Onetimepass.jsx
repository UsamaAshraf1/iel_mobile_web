import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "../hooks/ThemeContext";
import { supabase } from "../supabaseConfig";
import { useLocalSearchParams } from "expo-router";
import StompService from "../Services/webSocketConnection";
import { useToastConfig } from "../Services/toastConfig";
import Toast from "react-native-toast-message";
// import { useColorScheme } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const pinLength = 4;
const isCompactHeight = screenHeight < 700;
const horizontalPadding = isCompactHeight ? 20 : 24;
const keypadGap = isCompactHeight ? 10 : 14;
const keySize = Math.min(
  isCompactHeight ? 64 : 78,
  Math.floor((screenWidth - horizontalPadding * 2 - keypadGap * 2) / 3),
);
const pinBoxSize = Math.min(
  isCompactHeight ? 48 : 58,
  Math.floor((screenWidth - horizontalPadding * 2 - 36) / pinLength),
);

export default function PinCodeScreen() {
  const params = useLocalSearchParams();

  const router = useRouter();
  const toastConfig = useToastConfig();
  const colorScheme = useColorScheme();

  const isDark = colorScheme === "dark";

  const [pin, setPin] = useState([]);
  const [user, setUser] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [loadingClient, setLoadingClient] = useState(true);
  const [verifyingPin, setVerifyingPin] = useState(false);

  const {
    orderPayload,
    order,
    symbol,
    ShareNumber,
    selectedorderType,
    trigger,
  } = params;

  const scaleAnims = useRef(
    [...Array(pinLength)].map(() => new Animated.Value(1)),
  ).current;

  const colors = {
    background: isDark ? "#000000" : "#FFFFFF",
    title: isDark ? "#E0E0E0" : "#0B1B0C",
    muted: isDark ? "#8A8A8A" : "#444B44",
    surface: isDark ? "#222222" : "#F9F9F9",
    softSurface: isDark ? "#FFFFFF14" : "#F4F4F4",
    border: isDark ? "#FFFFFF14" : "#E8E8E8",
    keyText: isDark ? "#FFFFFF" : "#0B1B0C",
    accent: "#53BA83",
  };

  const fetchUserAndClientCode = useCallback(async () => {
    try {
      setLoadingClient(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      setUser(user);

      if (!user?.id) return;

      const { data, error } = await supabase
        .from("ClientCode")
        .select("*")
        .eq("userId", user.id)
        .maybeSingle();

      if (error) throw error;

      setClientData(data);
    } catch (err) {
      console.error("Fetch client code error:", err);
      Alert.alert("Error", "Unable to get your client code.");
    } finally {
      setLoadingClient(false);
    }
  }, []);

  useEffect(() => {
    fetchUserAndClientCode();
  }, [fetchUserAndClientCode]);

  const authenticatePinCode = async (pinValue) => {
    const clientCode = clientData?.cliendCode;

    if (!clientCode) {
      Alert.alert("Error", "Client code not found.");
      setPin([]);
      return;
    }

    try {
      setVerifyingPin(true);

      const response = await fetch(
        "https://trade.iel.net.pk:1219/iel/authenticatePinCodeRequest",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: clientCode,
            pin: pinValue,
          }),
        },
      );

      const result = await response.json();

      if (result?.responseCode === 200) {
        // router.replace("/Market");
        const parsedPayload = JSON.parse(orderPayload);

        try {
          // Place order after successful PIN verification
          StompService.placeNewOrder(parsedPayload);

          router.replace({
            pathname: "/OrderProcessing",
            params: {
              order,
              symbol,
              ShareNumber,
              selectedorderType,
              triggerPrice: trigger,
            },
          });
        } catch (err) {
          console.error("Order placement error:", err);

          Alert.alert(
            "Order Failed",
            "PIN verified but order could not be placed.",
          );
        }
        return;
      }

      // Alert.alert(
      //   "Invalid PIN",
      //   result?.responseMessage || "Please enter the correct PIN code.",
      // );
      Toast.show({
        type: "error",
        text1: "Invalid PIN",
        text2: "Please enter the correct PIN code.",
      });
      setPin([]);
    } catch (err) {
      console.error("Authenticate PIN error:", err);
      Alert.alert("Error", "Unable to verify PIN. Please try again.");
      setPin([]);
    } finally {
      setVerifyingPin(false);
    }
  };

  const handlePress = (num) => {
    if (pin.length >= pinLength || verifyingPin || loadingClient) return;

    const updatedPin = [...pin, num];
    setPin(updatedPin);

    Animated.sequence([
      Animated.timing(scaleAnims[updatedPin.length - 1], {
        toValue: 1.12,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[updatedPin.length - 1], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (updatedPin.length === pinLength) {
      authenticatePinCode(updatedPin.join(""));
    }
  };

  const handleDelete = () => {
    if (pin.length === 0 || verifyingPin) return;

    const updatedPin = [...pin];
    updatedPin.pop();
    setPin(updatedPin);
  };

  const renderButton = (value, onPress, customStyle = {}) => (
    <TouchableOpacity
      style={[
        styles.keyButton,
        {
          width: keySize,
          height: keySize,
          backgroundColor: colors.softSurface,
          borderColor: colors.border,
          opacity: verifyingPin || loadingClient ? 0.6 : 1,
        },
        customStyle,
      ]}
      onPress={onPress}
      disabled={verifyingPin || loadingClient}
      activeOpacity={0.72}
    >
      <Text style={[styles.keyText, { color: colors.keyText }]}>{value}</Text>
    </TouchableOpacity>
  );

  const keypadItems = [1, 2, 3, 4, 5, 6, 7, 8, 9, "blank", 0, "delete"];

  const getKeySpacing = (index) => ({
    marginRight: index % 3 === 2 ? 0 : keypadGap,
    marginBottom: index < 9 ? keypadGap : 0,
  });

  return (
    <>
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: colors.background,
            width: 460,
            minHeight: screenHeight,
          },
        ]}
      >
        <KeyboardAvoidingView
          style={[styles.keyboardView, { backgroundColor: colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <LinearGradient
            colors={
              isDark
                ? ["#53BA8329", "transparent"]
                : ["#53BA831F", "transparent"]
            }
            pointerEvents="none"
            style={styles.topGlow}
          />
          <LinearGradient
            colors={
              isDark
                ? ["transparent", "#3FB9501F"]
                : ["transparent", "#53BA8314"]
            }
            pointerEvents="none"
            style={styles.bottomGlow}
          />

          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.backButton, { marginTop: 20 }]}
              onPress={() => router.back()}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={isDark ? "#FFFFFF" : "#0B1B0C"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.copyBlock}>
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.title,
                    fontSize: isCompactHeight ? 22 : 24,
                    lineHeight: isCompactHeight ? 28 : 31,
                  },
                ]}
              >
                Enter your PIN code
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  {
                    color: colors.muted,
                    marginTop: isCompactHeight ? 6 : 10,
                    lineHeight: isCompactHeight ? 19 : 21,
                  },
                ]}
              >
                Confirm your 4-digit passcode to continue securely.
              </Text>

              {/* {(loadingClient || verifyingPin) && (
                <ActivityIndicator
                  size="small"
                  color={colors.accent}
                  style={{ marginTop: 14 }}
                />
              )} */}
            </View>

            <View
              style={[
                styles.pinContainer,
                { marginTop: isCompactHeight ? 22 : 32 },
              ]}
            >
              {[0, 1, 2, 3].map((index) => {
                const filled = pin[index] !== undefined;
                const active = index === pin.length;

                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.pinBox,
                      {
                        width: pinBoxSize,
                        height: pinBoxSize + 4,
                        backgroundColor: colors.surface,
                        borderColor:
                          filled || active ? colors.accent : colors.border,
                        transform: [{ scale: scaleAnims[index] }],
                      },
                      filled && styles.activePinBox,
                    ]}
                  >
                    {filled ? (
                      <View
                        style={[styles.dot, { backgroundColor: colors.accent }]}
                      />
                    ) : active ? (
                      <View
                        style={[
                          styles.cursor,
                          { backgroundColor: colors.accent },
                        ]}
                      />
                    ) : null}
                  </Animated.View>
                );
              })}
            </View>
          </View>

          <View style={[styles.keypad, { width: keySize * 3 + keypadGap * 2 }]}>
            {keypadItems.map((item, index) => {
              const spacing = getKeySpacing(index);

              if (item === "blank") {
                return (
                  <View
                    key="blank"
                    style={[{ width: keySize, height: keySize }, spacing]}
                  />
                );
              }

              if (item === "delete") {
                return (
                  <TouchableOpacity
                    key="delete"
                    style={[
                      styles.keyButton,
                      {
                        width: keySize,
                        height: keySize,
                        backgroundColor: colors.softSurface,
                        borderColor: colors.border,
                        opacity: verifyingPin || loadingClient ? 0.6 : 1,
                      },
                      spacing,
                    ]}
                    onPress={handleDelete}
                    disabled={verifyingPin || loadingClient}
                    activeOpacity={0.72}
                  >
                    <Ionicons
                      name="backspace-outline"
                      size={24}
                      color={pin.length ? colors.keyText : colors.muted}
                    />
                  </TouchableOpacity>
                );
              }

              return renderButton(item, () => handlePress(item), spacing);
            })}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <Toast position="bottom" config={toastConfig} />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    overflow: "hidden",
  },
  keyboardView: {
    flex: 1,
    width: "100%",
    minHeight: screenHeight,
    paddingHorizontal: horizontalPadding,
    paddingTop: Platform.OS === "android" ? (isCompactHeight ? 10 : 18) : 0,
    paddingBottom: isCompactHeight ? 12 : 28,
  },
  topGlow: {
    position: "absolute",
    top: -120,
    right: -95,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  bottomGlow: {
    position: "absolute",
    bottom: -140,
    left: -110,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  header: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
    paddingBottom: isCompactHeight ? 8 : 10,
    marginTop: 20,
    maxHeight: 180,
  },
  copyBlock: {
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
  },
  iconRing: {
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: "SfRegular",
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "SfRegular",
    textAlign: "center",
  },
  pinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  pinBox: {
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  activePinBox: {
    shadowColor: "#53BA83",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cursor: {
    width: 2,
    height: 24,
    borderRadius: 8,
  },
  keypad: {
    width: "100%",
    maxWidth: 330,
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  keyButton: {
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  keyText: {
    fontSize: 30,
    fontFamily: "SfRegular",
    fontWeight: "500",
    lineHeight: 36,
  },
});

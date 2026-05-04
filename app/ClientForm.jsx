import { Image } from "expo-image";
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Text,
  KeyboardAvoidingView,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { View } from "react-native";
import Toast from "react-native-toast-message";
import { useColorScheme } from "@/hooks/useColorScheme";
// import { LinearGradient } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import StompService from "../Services/webSocketConnection";
import { supabase } from "../supabaseConfig";
// import bcryptjs from "bcryptjs";
import * as CryptoJS from "crypto-js"; // npm install crypto-js
import { getEncryptionKey } from "../Services/encryptionkey";
import { useToastConfig } from "../Services/toastConfig";
// import { SafeAreaView } from "react-native/types_generated/index";
import { useTheme } from "../hooks/ThemeContext";
export default function ClientForm() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const toastConfig = useToastConfig();

  const { symbol, order, prev } = useLocalSearchParams();
  console.log("previous Link is: ", prev);

  const router = useRouter();

  const [ClientCode, setClientCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;

      setUser(user);
    } catch (err) {
      // Alert.alert("Error", err.message);
      console.log("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  //   const ConnectWebSocket = async () => {
  //     await StompService.connect(ClientCode, password);
  //   };
  const isFormValid =
    ClientCode.trim().length > 0 && password.trim().length > 0;

  const handleContinue = async () => {
    if (!isFormValid) {
      Toast.show({
        type: "error",
        text1: "Missing fields",
        text2: "Please enter both Client Code and Password",
      });
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User not authenticated. Please log in again.");
      return;
    }

    setLoading(true);

    try {
      await StompService.connect(ClientCode, password);

      Toast.show({
        type: "success",
        text1: "Connected",
        text2: "WebSocket connection established",
      });

      // const salt = await bcryptjs.genSalt(10); // or 12–14 in 2026
      // const hashedPassword = await bcryptjs.hash(password, salt);

      // const derivedKey = await getEncryptionKey(user.id); // ← new
      // const encryptedPassword = CryptoJS.AES.encrypt(
      //   password,
      //   derivedKey
      // ).toString();

      // ✅ ENCRYPT password (AES-256-GCM) using user session as key source
      // const sessionKey = await supabase.auth.getSession();
      // const derivedKey = CryptoJS.PBKDF2(
      //   `${user.id}_${sessionKey.data.session?.access_token}`, // Unique per user+session
      //   "salty2026-secret", // Fixed salt (or use device UUID)
      //   { keySize: 256 / 32, iterations: 10000 }
      // ).toString();

      // Encrypt: password → ciphertext (store this in DB)
      // const encryptedPassword = CryptoJS.AES.encrypt(
      //   password,
      //   derivedKey
      // ).toString();

      const { error: upsertError } = await supabase.from("ClientCode").upsert({
        userId: user.id,
        cliendCode: ClientCode,
        Password: password,
      });

      //   const { error: updateError } = await supabase.auth.updateUser({
      //     data: {
      //       ...user.user.user_metadata,
      //       status: "linked",
      //     },
      //   });

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          status: "linked",
          account: true,
        })
        .eq("id", user.id);

      if (upsertError) {
        console.error("Save credentials error:", upsertError);
        throw new Error("Failed to save credentials");
      } else if (profileError) {
        throw new Error("Failed to Update Profile Status");
      }

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Brokerage account linked successfully",
      });
      setClientCode("");
      setPassword("");
      if (prev === "open_account") {
        router.back();
        router.back();
      } else {
        router.back();
      }

      // router.push(`/Stockbuy?symbol=${symbol}&order=${order}&prev=ClientForm`);
    } catch (err) {
      console.error("Connection / save failed:", err);

      Toast.show({
        type: "error",
        text1: "Failed to link account",
        text2: err.message || "Connection failed – check credentials",
      });

      // Optional: you can disconnect here if StompService has .disconnect()
      // await StompService.disconnect?.();
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: isDark ? "#000" : "#fff",

        // minHeight: "190vh",
        // paddingBottom:200,
      }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : -100}
    >
      <ScrollView
        style={{
          backgroundColor: isDark ? "" : "#fff",
        }}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled" // ← dismiss keyboard on tap outside input
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Image
            source={require("../assets/icons/brokerage_account.png")}
            style={{ width: 200, height: 200 }}
          />
        </View>
        <View style={styles.titleContainer}>
          <Text
            type="title"
            style={{
              fontFamily: "SfRegular",
              fontSize: 24,
              fontWeight: "700",
            }}
          >
            <Text
              style={{
                color: isDark ? "#E0E0E0" : "#0B1B0C",
              }}
            >
              Set Up Your Brokerage Account
            </Text>
          </Text>
        </View>

        <Text
          type="subtitle"
          style={[
            styles.subtitle,
            {
              color: isDark ? "#8A8A8A" : "#444B44",
            },
          ]}
        >
          Link your brokerage account to deposit funds, place trades, and manage
          your investments, securely and with full control.
        </Text>

        <LinearGradient
          colors={
            isDark
              ? ["rgba(83, 186, 131, 0.2)", "rgba(63, 185, 80, 0.3)"]
              : ["#53BA830D", "#53BA831A"]
          }
          style={{
            borderWidth: 0.64,
            borderColor: "#53BA8333",
            padding: 16,
            marginTop: 12,
            borderRadius: 12,
          }}
        >
          <Text
            style={{ color: isDark ? "#8A8A8A" : "#4A5565" }}
          >
            ✉️ An email has been sent to your registered email address with your
            Client Code and a password for setup.
          </Text>
        </LinearGradient>
        <View style={styles.formContainer}>
          <View style={[styles.inputContainer]}>
            <ThemedText
              style={[
                styles.label,
                {
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                },
              ]}
            >
              ClientCode
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor:
                    isDark ? "#FFFFFF14" : "#F4F4F4",
                  padding: 12,
                },
              ]}
              value={ClientCode}
              onChangeText={setClientCode}
              placeholder="Enter your Client Code here"
              placeholderTextColor="#666"
              autoCapitalize="none"
            />
          </View>

          <View
            style={[
              styles.inputContainer,
              // {
              //   backgroundColor:
              //     isDark ? "#FFFFFF14" : "#F4F4F4",
              // },
            ]}
          >
            <ThemedText
              style={[
                styles.label,
                {
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                },
              ]}
            >
              Password
            </ThemedText>
            {/* <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password here"
            placeholderTextColor="#666"
            secureTextEntry
            autoCapitalize="none"
          /> */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor:
                  isDark ? "#FFFFFF14" : "#F4F4F4",
                paddingHorizontal: 12,
              }}
            >
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password here"
                placeholderTextColor="#666"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ marginLeft: 10 }}
              >
                <Image
                  source={
                    showPassword
                      ? require("../assets/icons/hide_icon.jpg")
                      : isDark
                        ? require("../assets/icons/dark_view_pass.png")
                        : require("../assets/icons/view_icon.png")
                  }
                  style={{ width: 22, height: 15 }} // Adjust size and color as needed
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 18,
            borderRadius: 12,
            backgroundColor: "#53BA83",
            marginTop: 50,
            marginBottom: 200,
            width: "100%",
            opacity: 1,
          }}
          onPress={handleContinue}
        >
          <Text
            style={{
              fontFamily: "SfRegular",
              fontWeight: "600",
              fontSize: 17,
              lineHeight: 25,
              color: "#FFFFFF",
            }}
          >
            {loading ? "Sending Request" : "Continue"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <Toast position="bottom" config={toastConfig} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // maindiv: {
  //   flex: 1,
  //   // backgroundColor: "#fff",
  //   // paddingBottom: 200,
  // },
  contentContainer: {
    flexGrow: 1,
    alignItems: "center",
    // justifyContent: "center",
    marginTop: 50,
    marginHorizontal: 33,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // backgroundColor: "#fff",
  },
  titleContainer: {
    alignItems: "center",
  },
  formContainer: {
    gap: 16,
    marginTop: 18,
    // paddingVertical: 20,
    borderRadius: 10,
    width: "100%",
    maxWidth: 400,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "SfRegular",
    fontWeight: "400",
  },
  inputContainer: {
    borderRadius: 8,
    paddingVertical: 4,
    gap: 6,
  },
  label: {
    fontSize: 14,

    fontFamily: "SfRegular",
    fontWeight: "500",
  },
  input: {
    backgroundColor: "transparent",
    borderWidth: 0,
    fontSize: 16,
    fontFamily: "OutfitLight",
    color: "#929292",
    fontWeight: "400",
    // padding: 10,
  },
  loginButton: {
    backgroundColor: "#58BA83",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    width: "100%",
    position: "absolute",
    bottom: 100,
  },
});

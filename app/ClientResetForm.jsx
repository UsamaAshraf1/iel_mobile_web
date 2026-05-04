import { Image } from "expo-image";
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import Toast from "react-native-toast-message";
import { useColorScheme } from "@/hooks/useColorScheme";
import { LinearGradient } from "expo-linear-gradient";
import StompService from "../Services/webSocketConnection";
import { supabase } from "../supabaseConfig";
import * as CryptoJS from "crypto-js";
import { getEncryptionKey } from "../Services/encryptionkey";
import { useToastConfig } from "../Services/toastConfig";
import { useTheme } from "../hooks/ThemeContext";

export default function ClientResetForm() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const toastConfig = useToastConfig();

  const router = useRouter();

  const [clientCode, setClientCode] = useState(""); // Will be pre-filled from DB
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [clientData, setClientData] = useState(null);

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
      console.log("Error fetching user:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientCredentials = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("ClientCode")
        .select("*")
        .eq("userId", user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setClientData(data);
        setClientCode(data.cliendCode || data.clientCode || ""); // handle possible typo
      } else {
        Toast.show({
          type: "error",
          text1: "No linked account",
          text2: "Please link your brokerage account first",
        });
        router.back();
      }
    } catch (err) {
      console.error("Fetch client credentials error:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Could not load account info",
      });
    }
  }, [user?.id, router]);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchClientCredentials();
    }
  }, [user?.id, fetchClientCredentials]);

  function byteaToString(byteaStr) {
    if (!byteaStr || !byteaStr.startsWith("\\x")) {
      return null;
    }
    const hex = byteaStr.slice(2);
    const bytes = new Uint8Array(
      hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)),
    );
    return new TextDecoder("utf-8").decode(bytes);
  }
  const isFormValid =
    clientCode.trim().length > 0 &&
    currentPassword.trim().length > 0 &&
    newPassword.trim().length > 0 &&
    confirmNewPassword.trim().length > 0;

  const handleUpdatePassword = async () => {
    if (!isFormValid) {
      Toast.show({
        type: "error",
        text1: "Missing fields",
        text2: "Please fill all fields",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Toast.show({
        type: "error",
        text1: "Passwords don't match",
        text2: "New password and confirmation must be the same",
      });
      return;
    }

    if (!user?.id || !clientData?.Password) {
      Alert.alert("Error", "No credentials found. Please link account again.");
      return;
    }

    setLoading(true);

    try {
      // 1. Derive key and decrypt stored (old) password
      // const derivedKey = await getEncryptionKey(user.id);
      // const bytes = CryptoJS.AES.decrypt(clientData.Password, derivedKey);
      // const storedPlainPassword = bytes.toString(CryptoJS.enc.Utf8);
      const storedPlainPassword = byteaToString(clientData.Password);

      if (!storedPlainPassword || storedPlainPassword !== currentPassword) {
        // throw new Error("Current password is incorrect");
        Toast.show({
          type: "error",
          text1: "Current Password",
          text2: "Current password is incorrect",
        });
      }

      // 2. Test connection with current credentials (optional but recommended)
      //   await StompService.connect(clientCode, currentPassword);
      //   Toast.show({
      //     type: "success",
      //     text1: "Connected",
      //     text2: "Verified old credentials",
      //   });

      // 3. Encrypt the NEW password
      // const newEncryptedPassword = CryptoJS.AES.encrypt(
      //   newPassword,
      //   derivedKey
      // ).toString();

      // 4. Update only the password field (keep clientCode/userId)
      const { error: updateError } = await supabase
        .from("ClientCode")
        .update({
          Password: newPassword,
        })
        .eq("userId", user.id);

      if (updateError) throw updateError;

      // Optional: Update profile status if needed
      // await supabase
      //   .from("profiles")
      //   .update({ account: true }) // or any flag
      //   .eq("id", user.id);

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Brokerage password updated successfully",
      });

      // Clear fields and go back
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      router.back();
    } catch (err) {
      console.error("Update failed:", err);
      Toast.show({
        type: "error",
        text1: "Update failed",
        text2: err.message || "Check current password or try again",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#53BA83" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={[
          styles.maindiv,
          { backgroundColor: isDark ? "#000" : "#fff" },
        ]}
        contentContainerStyle={styles.contentContainer}
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
            style={{ width: 180, height: 180 }}
          />
        </View>

        <View style={styles.titleContainer}>
          <ThemedText
            style={{
              fontFamily: "SfRegular",
              fontSize: 24,
              fontWeight: "700",
              color: isDark ? "#fff" : "",
            }}
          >
            Update Brokerage Password
          </ThemedText>
        </View>

        {/* <Text
          style={[
            styles.subtitle,
            { color: isDark ? "#8A8A8A" : "#444B44" },
          ]}
        >
          Enter your current password and set a new one for your brokerage
          account.
        </Text> */}

        {/* Client Code (pre-filled, read-only) */}
        <View style={styles.formContainer}>
          {/* Current Password */}
          <View style={styles.inputContainer}>
            <ThemedText
              style={[
                styles.label,
                { color: isDark ? "#E0E0E0" : "#0B1B0C" },
              ]}
            >
              Current Password
            </ThemedText>
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
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#666"
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                <Image
                  source={
                    showCurrent
                      ? require("../assets/icons/hide_icon.jpg")
                      : isDark
                        ? require("../assets/icons/dark_view_pass.png")
                        : require("../assets/icons/view_icon.png")
                  }
                  style={{ width: 22, height: 15 }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputContainer}>
            <ThemedText
              style={[
                styles.label,
                { color: isDark ? "#E0E0E0" : "#0B1B0C" },
              ]}
            >
              New Password
            </ThemedText>
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
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#666"
                secureTextEntry={!showNew}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <Image
                  source={
                    showNew
                      ? require("../assets/icons/hide_icon.jpg")
                      : isDark
                        ? require("../assets/icons/dark_view_pass.png")
                        : require("../assets/icons/view_icon.png")
                  }
                  style={{ width: 22, height: 15 }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm New Password */}
          <View style={styles.inputContainer}>
            <ThemedText
              style={[
                styles.label,
                { color: isDark ? "#E0E0E0" : "#0B1B0C" },
              ]}
            >
              Confirm New Password
            </ThemedText>
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
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder="Re-enter new password"
                placeholderTextColor="#666"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Image
                  source={
                    showConfirm
                      ? require("../assets/icons/hide_icon.jpg")
                      : isDark
                        ? require("../assets/icons/dark_view_pass.png")
                        : require("../assets/icons/view_icon.png")
                  }
                  style={{ width: 22, height: 15 }}
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
            marginTop: 40,
            width: "100%",
          }}
          onPress={handleUpdatePassword}
          disabled={loading}
        >
          <Text
            style={{
              fontFamily: "SfRegular",
              fontWeight: "600",
              fontSize: 17,
              color: "#FFFFFF",
            }}
          >
            {loading ? "Updating..." : "Update Password"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <Toast position="bottom" config={toastConfig} />
    </>
  );
}

// Keep your existing styles (add if needed)
const styles = StyleSheet.create({
  maindiv: { flex: 1, paddingBottom: 200 },
  contentContainer: {
    flexGrow: 1,
    alignItems: "center",
    marginTop: 40,
    marginHorizontal: 33,
  },
  titleContainer: {
    alignItems: "center",
    marginVertical: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  formContainer: { gap: 20, width: "100%", maxWidth: 400 },
  inputContainer: { gap: 6 },
  label: { fontSize: 14, fontWeight: "500" },
  input: { fontSize: 16, color: "#929292", flex: 1 },
});

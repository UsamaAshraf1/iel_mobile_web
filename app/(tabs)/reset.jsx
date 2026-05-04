import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { View } from "react-native";

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();

  const handleLogin = () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      return;
    }
    if (newPassword !== confirmPassword) {
      console.log("Passwords do not match");
      alert("Passwords do not match");
      return;
    }
    console.log("Reset password attempt with:", { email, newPassword });
    if (email === "usama@gmail.com") {
      // Navigate to Market page on successful reset
      router.push("/Market"); // 'Market' should match your stack navigator screen name
    } else {
      console.log("Invalid email");
      alert("Invalid email");
    }
  };

  const isFormValid = newPassword.trim() && confirmPassword.trim();

  return (
    <>
      <View style={styles.backwarddiv}>
        <Image
          source={require("../../assets/move_backward.png")}
          style={{ width: 20, height: 20, marginTop: 2, marginRight: 2 }}
        />{" "}
      </View>
      <View style={styles.maindiv}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText
            type="title"
            style={{
              fontFamily: "OutfitSemiBold",
              fontWeight: "600",
              fontSize: 24,
            }}
          >
            Choose a New Password
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.formContainer}>
          <ThemedText type="subtitle" style={styles.subtitle}>
            Please enter a new password. Make sure passwords in both fields
            match.
          </ThemedText>
          <ThemedView style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter a new password"
              secureTextEntry
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry
              autoCapitalize="none"
            />
          </ThemedView>

          <TouchableOpacity
            style={[
              styles.loginButton,
              { backgroundColor: isFormValid ? "#58BA83" : "#cccccc" },
            ]}
            onPress={handleLogin}
            disabled={!isFormValid}
          >
            <ThemedText type="defaultSemiBold" style={styles.loginButtonText}>
              Reset Password
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backwarddiv: {
    backgroundColor: "#fff",
    paddingStart: 28,
    paddingTop: 24,
  },
  maindiv: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    paddingTop: 25,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  titleContainer: {
    alignItems: "center",
  },
  formContainer: {
    gap: 16,
    marginTop: 20,
    padding: 20,
    borderRadius: 10,
    width: "100%",
    maxWidth: 400,
  },
  subtitle: {
    fontSize: 16,
    color: "#8A8A8A",
    textAlign: "center",
    fontFamily: "OutfitMedium",
  },
  inputContainer: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    fontFamily: "OutfitLight",
  },
  loginButton: {
    padding: 16,
    borderRadius: 40,
    alignItems: "center",
    marginTop: 40,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "OutfitBold",
    fontWeight: "800",
  },
  footerContainer: {
    alignItems: "flex-end",
  },
  forgotPasswordText: {
    color: "#58BA83",
    fontFamily: "OutfitMedium",
  },
  register: {
    color: "#58BA83",
  },
  footerLogin: {
    marginTop: 20,
  },
  checkboxText: {
    fontSize: 14,
    color: "#333",
    fontFamily: "OutfitRegular",
  },
});

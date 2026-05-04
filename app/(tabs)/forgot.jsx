import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Text,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseConfig";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { View } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useTheme } from "../../hooks/ThemeContext";

export default function ResetPasswordScreen() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleResetPassword = async () => {
    if (!email.trim()) {
      // Prevent submission if email is empty or only whitespace
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://iel-password-reset.vercel.app/",
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "Check your email for the password reset link!");
        // Optionally navigate back or to a confirmation screen
        // router.push("/login");
      }
    } catch (err) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.backwarddiv,
          {
            backgroundColor: isDark ? "" : "#fff",
          },
        ]}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        {isDark ? (
          <Image
            source={require("../../assets/icons/white_back_icon.png")}
            style={{ width: 8, height: 12, marginTop: 32, marginRight: 2 }}
          />
        ) : (
          <Image
            source={require("../../assets/move_backward.png")}
            style={{ width: 20, height: 20, marginTop: 32, marginRight: 2 }}
          />
        )}
      </TouchableOpacity>
      <View
        style={[
          styles.maindiv,
          {
            backgroundColor: isDark ? "" : "#fff",
          },
        ]}
      >
        <View style={styles.titleContainer}>
          <Text
            type="title"
            style={{
              fontFamily: "SfRegular",
              fontWeight: "600",
              fontSize: 24,
              color: isDark ? "#E0E0E0" : "",
            }}
          >
            Forgot Password
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text type="subtitle" style={styles.subtitle}>
            We’ll send an email with instructions to reset your password.
          </Text>
          <View style={[styles.inputContainer]}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor:
                    isDark ? "#FFFFFF14" : "#f9f9f9",
                },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              autoCapitalize="none"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.loginButton,
              { backgroundColor: email.trim() ? "#58BA83" : "#cccccc" },
            ]}
            onPress={handleResetPassword}
            disabled={!email.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText type="defaultSemiBold" style={styles.loginButtonText}>
                Send Email
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backwarddiv: {
    // backgroundColor: "#fff",
    paddingStart: 28,
    paddingTop: 24,
  },
  maindiv: {
    flex: 1,
    alignItems: "center",
    // backgroundColor: "#fff",
    paddingTop: 25,
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
    fontFamily: "SfRegular",
  },
  inputContainer: {
    gap: 8,
  },
  input: {
    // borderWidth: 1,
    // borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: "SfRegular",
    color: "#929292",
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
    fontFamily: "SfRegular",
    fontWeight: "800",
  },
  footerContainer: {
    alignItems: "flex-end",
  },
  forgotPasswordText: {
    color: "#58BA83",
    fontFamily: "SfRegular",
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
    fontFamily: "SfRegular",
  },
});

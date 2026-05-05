import { Image } from "expo-image";
import {
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { View } from "react-native";
import { supabase } from "../../supabaseConfig.ts";
import GradientText from "../../components/GradientText.jsx";
import { useColorScheme } from "@/hooks/useColorScheme";
import Toast from "react-native-toast-message";
import { useToastConfig } from "../../Services/toastConfig.tsx";
import { useTheme } from "../../hooks/ThemeContext.tsx";

export default function SignupScreen() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const toastConfig = useToastConfig();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profiles, setProfiles] = useState([]);

  const router = useRouter();
  // Validation states
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Simple but practical email regex (catches most real-world cases)
  const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim());
  };

  const fetchProfiles = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.from("profiles").select("email");

      if (error) throw error;

      setProfiles(data);
    } catch (err) {
      console.error("Error fetching decliners:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const emailAlreadyExists = (emailToCheck) => {
    return profiles.some(
      (profile) =>
        profile.email?.toLowerCase() === emailToCheck.trim().toLowerCase(),
    );
  };
  // console.log(profiles);
  const validateForm = () => {
    let isValid = true;
    setEmailError("");
    setPasswordError("");

    if (!email.trim()) {
      setEmailError("Email is required");
      Toast.show({
        type: "error",
        text1: "Email Required",
        text2: "Please enter your email address",
      });
      isValid = false;
    } else if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address");
      Toast.show({
        type: "error",
        text1: "Invalid Email",
        text2: "Please check your email format",
      });
      isValid = false;
    } else if (emailAlreadyExists(email)) {
      setEmailError("This email is already registered");
      Toast.show({
        type: "error",
        text1: "Email Already Exist",
        text2: "Please use a different email address",
      });
      isValid = false;
    } else if (!password) {
      setPasswordError("Password is required");
      Toast.show({
        type: "error",
        text1: "Password Required",
        text2: "Please enter a password",
      });
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      Toast.show({
        type: "error",
        text1: "Password Too Short",
        text2: "Minimum 6 characters required",
      });
      isValid = false;
    }

    return isValid;
  };

  const handleGetStarted = () => {
    if (!validateForm()) return;
    router.push({
      pathname: "/onboarding",
      params: { email, password },
    });
  };

  return (
    <>
      {/* KeyboardAvoidingView makes the content push up when the keyboard appears
      (iOS + Android). ScrollView stays inside. */}
      {/* <KeyboardAvoidingView
        // style={{ flex: 1 }}
        // behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -90}
      > */}
      <ScrollView
        // contentContainerStyle={[
        //   styles.scrollContainer,
        //   {
        //     backgroundColor: isDark ? "" : "#fff",
        //   },
        // ]}

        style={[
          styles.scrollContainer,
          {
            backgroundColor: isDark ? "" : "#fff",
          },
        ]}
        // keyboardShouldPersistTaps="handled"
      >
        {/* ----------------------  Header  ---------------------- */}
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
              Your financial future,
            </Text>
            {"\n"}
            <GradientText
              text=" simplified"
              startColor="#265242"
              endColor="#53BA83"
              style={styles.marketdata}
            />
          </Text>
        </View>

        {/* ----------------------  Form  ---------------------- */}
        <View style={styles.formContainer}>
          <Text
            type="subtitle"
            style={[
              styles.subtitle,
              {
                color: isDark ? "#8A8A8A" : "#444B44",
              },
            ]}
          >
            {/* Invest with clarity and confidence. Sign up to unlock expert
              insights and smarter strategies. */}
            Join thousands who trust IEL to make smarter investment decisions.
            Start building wealth with Pakistan's most reliable brokerage
            platform
          </Text>

          {/* Email */}
          <View style={[styles.inputContainer]}>
            <Text
              style={[
                styles.label,
                {
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                },
              ]}
            >
              Email
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor:
                    isDark ? "#FFFFFF14" : "#F4F4F4",
                  padding: 12,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter Email"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View style={[styles.inputContainer]}>
            <Text
              style={[
                styles.label,
                {
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                },
              ]}
            >
              Password
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor:
                  isDark ? "#FFFFFF14" : "#F4F4F4",
                padding: 12,
              }}
            >
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
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
                      ? require("../../assets/icons/hide_icon.jpg")
                      : isDark
                        ? require("../../assets/icons/dark_view_pass.png")
                        : require("../../assets/icons/view_icon.png")
                  }
                  style={{ width: 22, height: 15 }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* “Already a user?” link */}
        </View>
      </ScrollView>

      {/* ---------------------------------------------------------
         2. Sticky Footer – always at the bottom of the screen
         --------------------------------------------------------- */}
      <View style={styles.stickyFooter}>
        <View style={styles.footeralready}>
          <ThemedText
            style={[
              styles.checkboxText,
              {
                color: isDark ? "#8A8A8A" : "#444B44",
              },
            ]}
          >
            Already a user?{" "}
            <ThemedText
              type="link"
              onPress={() => router.push("/login")}
              style={styles.termsText}
            >
              Sign in
            </ThemedText>
          </ThemedText>
        </View>
        <Pressable
          style={[styles.signUpButton, loading && styles.signUpButtonDisabled]}
          onPress={handleGetStarted}
          disabled={loading}
        >
          <ThemedText type="defaultSemiBold" style={styles.signUpButtonText}>
            {loading ? "Signing Up..." : "Get Started"}
          </ThemedText>
        </Pressable>
      </View>
      {/* </KeyboardAvoidingView> */}
      <Toast position="bottom" config={toastConfig} />
    </>
  );
}

/* ==============================================================
   STYLES
   ============================================================== */
const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 33,
    paddingBottom: 20, // space above the sticky footer
  },

  titleContainer: {
    // alignItems: "center",
    textAlign: "left",
    marginTop: 100,
  },

  formContainer: {
    gap: 16,
    marginTop: 18,
    paddingVertical: 20,
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
    // paddingHorizontal: 12,
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
    fontSize: 14,
    fontFamily: "SfRegular",
    fontWeight: "400",
    color: "#929292",
  },

  footeralready: {
    alignItems: "center",
    marginTop: 20,
  },

  checkboxText: {
    fontSize: 14,

    fontFamily: "SfRegular",
  },

  termsText: {
    fontFamily: "SfRegular",
    textDecorationLine: "underline",
    color: "#444B44",
  },

  /* -------------------  Sticky Footer  ------------------- */
  stickyFooter: {
    position: "absolute",
    bottom: 70,
    left: 0,
    right: 0,
    paddingHorizontal: 33,
    paddingBottom: 34, // safe-area on iPhone X+
  },

  signUpButton: {
    backgroundColor: "#58BA83",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 6,
  },

  signUpButtonDisabled: {
    backgroundColor: "#ccc",
  },

  signUpButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "SfRegular",
    fontWeight: "600",
  },

  /* (Optional) a second button – just uncomment & style */
  // signUpButtonSecondary: { ... }
});

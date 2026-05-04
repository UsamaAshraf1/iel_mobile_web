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
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { View } from "react-native";
import { supabase } from "../../supabaseConfig";
import GradientText from "../../components/GradientText";
import Toast from "react-native-toast-message";
import { useColorScheme } from "@/hooks/useColorScheme";
// import ToastC
import { useToastConfig } from "../../Services/toastConfig";
import { useTheme } from "../../hooks/ThemeContext";

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const toastConfig = useToastConfig();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const checkSession = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      router.replace("/Market");
    }
    return session;
  }, [router]);

  useEffect(() => {
    const initCheck = async () => {
      setLoading(true);
      await checkSession();
      setLoading(false);
    };
    initCheck();
  }, [checkSession]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkSession();
    setRefreshing(false);
  }, [checkSession]);

  const handleLogin = async () => {
    console.log("Login attempt with:", { email, password });
    if (!email || !password) {
      // Alert.alert("Error", "Please fill in all fields");
      Toast.show({
        type: "error",
        text1: "Empty Fields",
        text2: "Please fill in all fields",
      });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      console.error("Login error:", error);
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: "Invalid Email or Password",
      });
      // Alert.alert("Error", error.message || "Login failed");
    } else if (data.user) {
      Toast.show({
        type: "success",
        text1: "Login Success",
        text2: "success message",
      });
      console.log("Login success:", data.user);
      // Alert.alert("Success", "Logged in successfully");
      router.push("/Market"); // Navigate to Market page on successful login
    }
  };

  // if ( !refreshing) {
  //   return (
  //     <View
  //       style={[
  //         styles.loaderContainer,
  //         {
  //           backgroundColor: isDark ? "" : "#fff",
  //         },
  //       ]}
  //     >
  //       <ActivityIndicator size="large" color="#58BA83" />
  //     </View>
  //   );
  // }

  const ShowToast = () => {
    Toast.show({
      type: "success",
      text1: "Login Success",
      text2: "success message",
    });
  };

  return (
    <>
      {/* <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -90}
      > */}
      <ScrollView
        style={[
          styles.maindiv,
          {
            backgroundColor: isDark ? "" : "#fff",
          },
        ]}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
            {/* <Text style={styles.marketdata}> Market Data</Text> */}
            <GradientText
              text=" simplified"
              startColor="#265242"
              endColor="#53BA83"
              style={styles.marketdata}
            />
          </Text>
        </View>

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
          <View style={[styles.inputContainer]}>
            <ThemedText
              style={[
                styles.label,
                {
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                },
              ]}
            >
              Email
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
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email here"
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
                      ? require("../../assets/icons/hide_icon.jpg")
                      : isDark
                        ? require("../../assets/icons/dark_view_pass.png")
                        : require("../../assets/icons/view_icon.png")
                  }
                  style={{ width: 22, height: 15 }} // Adjust size and color as needed
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.footerContainer}>
            <Text
              type="link"
              onPress={() => router.push("/forgot")}
              style={[
                styles.forgotPasswordText,
                {
                  color: isDark ? "#8A8A8A" : "#444B44",
                },
              ]}
            >
              Forgot Password
            </Text>
          </View>
        </View>

        <View style={styles.footerLogin}>
          <ThemedText
            style={[
              styles.checkboxText,
              {
                color: isDark ? "#8A8A8A" : "#444B44",
              },
            ]}
          >
            Don’t have an account?{" "}
            <ThemedText
              type="link"
              onPress={() => router.push("/signup")}
              style={[
                styles.register,
                {
                  color: isDark ? "#8A8A8A" : "#444B44",
                },
              ]}
            >
              Register
            </ThemedText>
          </ThemedText>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <ThemedText type="defaultSemiBold" style={styles.loginButtonText}>
            Get Started
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
      {/* </KeyboardAvoidingView> */}
      <Toast position="bottom" config={toastConfig} />
    </>
  );
}

const styles = StyleSheet.create({
  maindiv: {
    flex: 1,
    // backgroundColor: "#fff",
  },
  contentContainer: {
    flexGrow: 1,
    // alignItems: "center",
    // justifyContent: "center",
    marginTop: 80,
    marginHorizontal: 33,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // backgroundColor: "#fff",
  },
  titleContainer: {
    // alignItems: "left",
    textAlign: "left",
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

    // textAlign: "center",
    fontFamily: "SfRegular",
    fontWeight: "400",
  },
  inputContainer: {
    borderRadius: 8,
    // padding:7 12,
    paddingVertical: 4,
    // paddingHorizontal: 12,
    gap: 6,
    // shadowColor: "#000",
    // shadowOffset: {
    //   width: 0,
    //   height: 1,
    // },
    // shadowOpacity: 0.22,
    // shadowRadius: 2.22,
    // elevation: 3,
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
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "SfRegular",
    fontWeight: "600",
  },
  footerContainer: {
    alignItems: "flex-end",
  },
  forgotPasswordText: {
    // color: "#58BA83",
    fontFamily: "SfRegular",

    fontSize: 14,
    textDecorationLine: "underline",
    fontWeight: "400",
  },
  register: {
    // color: "#58BA83",

    textDecorationLine: "underline",
  },
  footerLogin: {
    position: "absolute",
    bottom: 165,
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    textAlign: "center",
  },
  checkboxText: {
    fontSize: 16,

    fontFamily: "SfRegular",
  },
  // marketdata: {
  //   color: "linear-gradient(90deg, #265242 0%, #53BA83 100%) !important",
  // },
});

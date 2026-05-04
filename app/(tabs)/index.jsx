import React from "react";
import {
  View,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
export default function SplashScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../../assets/images/new_splash.png")}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Logo and Text */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/new_icon.png")} // Replace with your actual logo path
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Buttons Container */}
        <View style={styles.buttonContainer}>
          {/* Login Button */}
          <TouchableOpacity style={styles.loginButton} onPress={()=>router.push("/login")}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          {/* Register Button */}
          <TouchableOpacity style={styles.registerButton} onPress={()=>router.push("/signup")}>
            <Text style={styles.registerButtonText}>
              New to Investment?{" "}
              <Text style={styles.registerLink}>Register here.</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "space-between", // Push logo to top, buttons to bottom
  },

  // Logo Section
  logoContainer: {
    alignItems: "center",
    marginTop: 80, // Adjust based on your design
  },
  logo: {
    width: 280,
    height: 90,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 2,
  },

  // Buttons Section
  buttonContainer: {
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  loginButton: {
    backgroundColor: "#53BA83", // Green color from your design
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loginButtonText: {
    fontFamily: "SfRegular",
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  registerButton: {
    borderWidth: 1,
    borderColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontFamily: "SfRegular",
    fontSize: 16,
    fontWeight: "600",
  },
});

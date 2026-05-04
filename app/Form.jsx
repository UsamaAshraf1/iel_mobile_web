import { Image } from "expo-image";
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { View } from "react-native";

export default function FormScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    console.log("Submit with:", { name, phone });
    setIsLoading(true);
    try {
      const response = await fetch('https://iel-digital-mgoau.ondigitalocean.app/api/contact/free-account/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          name: name
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Success:', data);
        // Navigate to Market page on successful submission
        // router.push("/Market");
        alert("Form Submited");
      } else {
        console.log('Error:', response.statusText);
        alert("Failed to submit. Please try again.");
      }
    } catch (error) {
      console.error('Error:', error);
      alert("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.maindiv}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Free Account</ThemedText>
      </ThemedView>

      <ThemedView style={styles.formContainer}>
        <ThemedView style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Name"
            autoCapitalize="words"
          />
        </ThemedView>

        <ThemedView style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone"
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        </ThemedView>

        <TouchableOpacity style={styles.loginButton} onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="defaultSemiBold" style={styles.loginButtonText}>
              Send
            </ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  maindiv: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
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
  },
  loginButton: {
    backgroundColor: "#58BA83",
    padding: 16,
    borderRadius: 40,
    alignItems: "center",
    marginTop: 40,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  footerContainer: {
    alignItems: "flex-end",
  },
  forgotPasswordText: {
    color: "#58BA83",
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
  },
});
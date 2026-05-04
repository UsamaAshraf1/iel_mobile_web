import { Image } from "expo-image";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Text,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import CheckBox from "expo-checkbox"; // Correct Expo import

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { supabase } from "../../supabaseConfig";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useTheme } from "../../hooks/ThemeContext";

export default function OnboardingNewData() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dobDate, setDobDate] = useState(null);
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const { email: prevEmail, password: prevPassword } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (prevEmail) setEmail(prevEmail);
    if (prevPassword) setPassword(prevPassword);
  }, [prevEmail, prevPassword]);

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || dobDate;
    setDatePickerVisibility(Platform.OS === "ios");

    if (currentDate) {
      setDobDate(currentDate);
      setDob(currentDate.toLocaleDateString("en-GB")); // DD/MM/YYYY
    }
  };

  const handleSignUp = async () => {
    if (!isChecked) {
      Alert.alert("Error", "Please accept the Terms and Conditions");
      return;
    }
    if (!firstName || !lastName || !phone || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dobDate,
          // date_of_birth: "12-2-2006",
          phone_number: phone,
          status: "unlinked",
        },
      },
    });

    if (authError) {
      console.error("Signup error:", authError);
      Alert.alert("Error", authError.message || "Signup failed");
      setLoading(false);
      return;
    }
    console.log(authData);
    console.log(authData?.user);
    if (authData.user) {
      // const { error: profileError } = await supabase.from("profiles").insert({
      //   id: authData.user.id,
      //   full_name: `${firstName} ${lastName}`,
      //   username: `${firstName} ${lastName}`,
      //   // date_of_birth: dobDate.toISOString().split("T")[0],
      //   date_of_birth: "12-2-2000",
      //   phone_number: phone,
      //   email: email,
      //   block: false,
      // });
      const profileData = {
        id: authData.user.id,
        full_name: `${firstName} ${lastName}`,
        username: email,
        date_of_birth: dobDate,
        // date_of_birth: "12-2-2006",
        phone_number: phone,
        email: email,
        block: false,
        status: "unlinked",
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileData, {
          onConflict: "id", // tells Postgres to use the "id" column (primary key) for conflict detection
        });

      if (profileError) {
        console.error("Profile insert error:", profileError);
        // Alert.alert("Error", "Signup successful, but profile save failed");
      } else {
        console.log("Profile saved successfully");
      }
    }

    setLoading(false);
    router.push("/login");
  };

  const today = new Date();
  const eighteenYearsAgo = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate(),
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        style={[
          styles.maindiv,
          {
            backgroundColor: isDark ? "" : "#fff",
          },
        ]}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleContainer}>
          <ThemedText
            type="title"
            style={{
              fontFamily: "SfRegular",
              fontSize: 24,
              fontWeight: "700",
            }}
          >
            <Text
              style={{ color: isDark ? "#E0E0E0" : "#0B1B0C" }}
            >
              Please Tell us about yourself
            </Text>
          </ThemedText>
        </View>

        <View style={styles.formContainer}>
          {/* First Name */}
          <View style={[styles.inputContainer]}>
            <Text
              style={[
                styles.label,
                {
                  color: isDark ? "#E0E0E0" : "#444B44",
                },
              ]}
            >
              First Name
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
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First Name"
              placeholderTextColor="#666"
              autoCapitalize="words"
            />
          </View>

          {/* Last Name */}
          <View style={[styles.inputContainer]}>
            <Text
              style={[
                styles.label,
                {
                  color: isDark ? "#E0E0E0" : "#444B44",
                },
              ]}
            >
              Last Name
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
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last Name"
              placeholderTextColor="#666"
              autoCapitalize="words"
            />
          </View>

          {/* Date of Birth */}
          <View style={[styles.inputContainer]}>
            <Text
              style={[
                styles.label,
                {
                  color: isDark ? "#E0E0E0" : "#444B44",
                },
              ]}
            >
              Date of birth
            </Text>
            <Pressable onPress={showDatePicker} style={styles.dateInputWrapper}>
              <TextInput
                // style={styles.input}
                style={[
                  styles.input,
                  {
                    backgroundColor:
                      isDark ? "#FFFFFF14" : "#F4F4F4",
                    padding: 12,
                  },
                ]}
                value={dob}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#666"
                editable={false}
                pointerEvents="none"
              />
            </Pressable>

            {isDatePickerVisible && (
              <DateTimePicker
                value={dobDate || eighteenYearsAgo}
                mode="date"
                // display={Platform.OS === "ios" ? "spinner" : "default"}
                display="default"
                onChange={onDateChange}
                maximumDate={eighteenYearsAgo}
              />
            )}
          </View>

          {/* Phone Number */}
          <View
            style={[
              styles.inputContainer,
              // {
              //   backgroundColor:
              //     isDark ? "#FFFFFF14" : "#F4F4F4",
              // },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isDark ? "#E0E0E0" : "#444B44",
                },
              ]}
            >
              Phone Number
            </Text>
            <TextInput
              // style={styles.input}
              style={[
                styles.input,
                {
                  backgroundColor:
                    isDark ? "#FFFFFF14" : "#F4F4F4",
                  padding: 12,
                },
              ]}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. +1234567890"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
            />
          </View>

          {/* Checkbox - Fixed Import */}
          <View style={styles.checkboxRow}>
            <CheckBox
              value={isChecked}
              onValueChange={setIsChecked}
              color={isChecked ? "#58BA83" : undefined}
            />
            <Text
              style={[
                styles.checkboxLabel,
                {
                  color: isDark ? "#8A8A8A" : "",
                },
              ]}
            >
              I have read and accept{" "}
              <Text
                type="link"
                onPress={() => console.log("Terms & Conditions pressed")}
                style={styles.termsText}
              >
                Terms & Conditions
              </Text>
            </Text>
          </View>

          {/* Sign Up Button */}
          <Pressable
            style={[
              styles.signUpButton,
              loading && styles.signUpButtonDisabled,
            ]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <ThemedText type="defaultSemiBold" style={styles.signUpButtonText}>
              {loading ? "Signing Up..." : "Get Started"}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  maindiv: {
    flex: 1,
    // backgroundColor: "#fff",
    paddingHorizontal: 33,
  },
  titleContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  formContainer: {
    gap: 16,
    marginTop: 18,
    paddingVertical: 20,
    borderRadius: 10,
    width: "100%",
    maxWidth: 400,
  },
  inputContainer: {
    borderRadius: 8,
    // padding: 12,
    paddingVertical: 4,
    gap: 6,
  },
  label: {
    fontSize: 14,
    color: "#0B1B0C",
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
  dateInputWrapper: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 4,
  },
  checkboxLabel: {
    marginLeft: 12,
    fontSize: 14,
    fontFamily: "SfRegular",
    flex: 1,
  },
  termsText: {
    fontFamily: "SfRegular",
    textDecorationLine: "underline",
    color: "#444B44",
  },
  signUpButton: {
    backgroundColor: "#58BA83",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    width: "100%",
    marginTop: 10,
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
});

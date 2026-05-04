import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { supabase } from "../supabaseConfig";
import { useColorScheme } from "@/hooks/useColorScheme";
import Toast from "react-native-toast-message";
import { useToastConfig } from "../Services/toastConfig";
import ThemedText from "@/components/ThemedText";
import { useTheme } from "../hooks/ThemeContext";
export default function OpenAccount() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const toastConfig = useToastConfig();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [profileuser, setprofileUser] = useState(null);

  const router = useRouter();

  // Fetch current user from Supabase
  const fetchUser = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;

      setUser(user);
      setName(user?.user_metadata?.first_name || "");
      setPhone(user?.user_metadata?.phone_number || "");
    } catch (err) {
      setError(err.message);
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileUser = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*") // Explicitly select all fields to ensure "all data"
        .eq("id", user?.id)
        .maybeSingle(); // Use .maybeSingle() instead of .single() – returns data=null on zero rows, no error

      if (error) {
        console.error("Error fetching profile:", error);
        // Optionally: Create a default profile if not found
        if (error.code === "PGRST116") {
          await supabase
            .from("profiles")
            .insert({ id: user?.id /* default fields */ });
          // Retry fetch
          return fetchProfileUser();
        }
      } else {
        setprofileUser(data ?? null); // Fallback to null if missing
        console.log("Profile fetched:", data);
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
    }
  }, [user?.id]);

  // Call fetchProfileUser after userId is set
  useEffect(() => {
    if (user?.id) {
      fetchProfileUser();
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUser();
  }, []);

  const submitAccountRequest = async () => {
    if (!name || !phone) {
      Alert.alert("Missing Information", "Name and phone number are required.");
      return false;
    }

    try {
      // Step 1: Call external API
      const response = await fetch(
        "https://ielapis.u2ventures.io/api/contact/free-account/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to submit request");
      }

      // Step 2: Update user status in Supabase
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user?.id) throw new Error("User not authenticated");

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...authUser.user.user_metadata,
          status: "awaiting_approval",
        },
      });

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          status: "awaiting_approval",
        })
        .eq("id", user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
        throw profileError;
      }

      if (updateError) throw updateError;
      await fetchUser();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const handleContinue = async () => {
    if (submitting) return;

    setSubmitting(true);

    const result = await submitAccountRequest();

    if (result.success) {
      Toast.show({
        type: "success",
        text1: "Open Account",
        text2: "Open Account Request Send Successfully",
      });
      fetchUser();
    } else {
      Toast.show({
        type: "error",
        text1: "Open Account",
        text2: "Open Account Request Failed",
      });
    }

    setSubmitting(false);
  };

  console.log(profileuser?.status);
  return (
    <>
      <ScrollView
        style={[
          styles.scrollView,
          {
            backgroundColor: isDark ? "" : "#fff",
          },
        ]}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? "" : "#fff",
            },
          ]}
        >
          {/* Back Button */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity onPress={() => router.back()}>
              <Image
                source={
                  isDark
                    ? require("../assets/icons/white_back_icon.png")
                    : require("../assets/icons/back_icon.png")
                }
                style={{ width: 8, height: 12 }}
              />
            </TouchableOpacity>
          </View>
          {profileuser?.status === "awaiting_approval" && (
            // <View
            //   style={{
            //     backgroundColor:
            //       isDark ? "#FFFFFF14" : "#F8F9FA",
            //     marginTop: 10,
            //     borderWidth: 1,
            //     borderColor: "#E8E8E8",
            //     borderRadius: 16,
            //     marginBottom: 10,
            //   }}
            // >
            //   <Text
            //     style={{
            //       fontFamily: "SfRegular",
            //       fontWeight: "600",
            //       fontSize: 22,
            //       lineHeight: 26,
            //       textAlign: "center",
            //       paddingVertical: 10,
            //       color: isDark ? "#E0E0E0" : "",
            //     }}
            //   >
            //     Account Open Request Already Submited
            //   </Text>
            // </View>
            <>
              <LinearGradient
                colors={["#53BA83", "#3FB950"]}
                style={{
                  borderRadius: 24,
                  alignItems: "center",
                  textAlign: "center",
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                  borderWidth: 1,
                  borderColor: "#E8E8E8",
                  padding: 33,
                  marginTop: 50,
                }}
              >
                <Image
                  source={require("../assets/icons/open_account_main.png")}
                  style={{ width: 200, height: 160 }}
                />
                <Text
                  style={{
                    fontFamily: "SfRegular",
                    fontWeight: "700",
                    fontSize: 28,
                    lineHeight: 33,
                    color: "#FFFFFF",
                    marginTop: 28,
                    textAlign: "center",
                  }}
                >
                  Your brokerage account request is under process.
                </Text>

                <Text
                  style={{
                    fontFamily: "SfRegular",
                    fontWeight: "500",
                    fontSize: 14,
                    lineHeight: 21,
                    color: "#FFFFFF",
                    marginTop: 10,
                  }}
                >
                  Visit again soon to check your status
                </Text>
              </LinearGradient>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: 20,
                }}
              >
                <Text
                  style={[
                    {
                      color: isDark ? "#8A8A8A" : "#444B44",
                      fontFamily: "SfRegular",
                      fontWeight: "400",
                      fontSize: 13,
                      lineHeight: 20,
                    },
                  ]}
                >
                  Already Have a{" "}
                </Text>
                <Text
                  onPress={() => router.push("/ClientForm?prev=open_account")}
                  style={[
                    {
                      color: isDark ? "#8A8A8A" : "#444B44",
                      textDecorationLine: "underline",
                      fontFamily: "SfRegular",
                      fontWeight: "400",
                      fontSize: 13,
                      lineHeight: 20,
                    },
                  ]}
                >
                  Brokerage Account
                </Text>
              </View>
            </>
          )}

          {profileuser?.status === "need_credentials" && (
            <>
              <LinearGradient
                colors={["#53BA83", "#3FB950"]}
                style={{
                  borderRadius: 24,
                  alignItems: "center",
                  textAlign: "center",
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                  borderWidth: 1,
                  borderColor: "#E8E8E8",
                  padding: 33,
                  marginTop: 50,
                }}
              >
                <Image
                  source={require("../assets/icons/open_account_main.png")}
                  style={{ width: 200, height: 160 }}
                />
                <Text
                  style={{
                    fontFamily: "SfRegular",
                    fontWeight: "700",
                    fontSize: 28,
                    lineHeight: 33,
                    color: "#FFFFFF",
                    marginTop: 28,
                    textAlign: "center",
                  }}
                >
                  Congrats! Your brokerage account is all ready to setup.
                </Text>

                <Text
                  style={{
                    fontFamily: "SfRegular",
                    fontWeight: "500",
                    fontSize: 14,
                    lineHeight: 21,
                    color: "#FFFFFF",
                    marginTop: 10,
                  }}
                >
                  Start Your investing journey now!
                </Text>

                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    paddingVertical: 18,
                    borderRadius: 16,
                    backgroundColor: "#FFFFFF",
                    marginTop: 28,
                    width: "100%",
                    opacity: submitting ? 0.7 : 1,
                  }}
                  onPress={() => router.push("/ClientForm?prev=open_account")}
                >
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "600",
                      fontSize: 17,
                      lineHeight: 25,
                      color: "#40B951",
                    }}
                  >
                    Continue Setup
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </>
          )}

          {profileuser?.status === "unlinked" && (
            <>
              {/* Main Banner */}
              <LinearGradient
                colors={["#53BA83", "#3FB950"]}
                style={{
                  borderRadius: 24,
                  alignItems: "center",
                  textAlign: "center",
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                  borderWidth: 1,
                  borderColor: "#E8E8E8",
                  padding: 33,
                }}
              >
                <Image
                  source={require("../assets/icons/open_account_main.png")}
                  style={{ width: 200, height: 160 }}
                />
                <Text
                  style={{
                    fontFamily: "SfRegular",
                    fontWeight: "700",
                    fontSize: 28,
                    lineHeight: 33,
                    color: "#FFFFFF",
                    marginTop: 28,
                    textAlign: "center",
                  }}
                >
                  Open your Trading Account to start investing in stocks
                </Text>

                <Text
                  style={{
                    fontFamily: "SfRegular",
                    fontWeight: "500",
                    fontSize: 14,
                    lineHeight: 21,
                    color: "#FFFFFF",
                    marginTop: 10,
                  }}
                >
                  Build your financial future
                </Text>
              </LinearGradient>

              {/* Steps */}
              <View style={{ marginTop: 24 }}>
                {/* Step 1 */}
                <LinearGradient
                  colors={["#53BA830D", "#3FB9500D"]}
                  style={{
                    padding: 21,
                    borderWidth: 1,
                    borderColor: "#53BA831A",
                    borderRadius: 16,
                    flexDirection: "row",
                  }}
                >
                  <Image
                    source={require("../assets/icons/open_account_1.png")}
                    style={{ width: 44, height: 44 }}
                  />
                  <View style={{ marginLeft: 12 }}>
                    <Text
                      style={{
                        fontFamily: "SfRegular",
                        fontWeight: "600",
                        fontSize: 16,
                        lineHeight: 24,
                        color: isDark ? "#E0E0E0" : "#0B1B0C",
                      }}
                    >
                      STEP 1:
                    </Text>
                    <Text
                      style={{
                        fontFamily: "SfRegular",
                        fontWeight: "400",
                        fontSize: 14,
                        lineHeight: 19,
                        color: isDark ? "#E0E0E0" : "#5A5A5A",
                        marginTop: 3,
                      }}
                    >
                      Reach out to customer representative {"\n"}at 0333 1234567
                      and start your {"\n"}application process.
                    </Text>
                  </View>
                </LinearGradient>

                {/* Step 2 */}
                <LinearGradient
                  colors={["#726AFF0D", "#5B54E80D"]}
                  style={{
                    padding: 21,
                    borderWidth: 1,
                    borderColor: "#726AFF1A",
                    borderRadius: 16,
                    flexDirection: "row",
                    marginTop: 12,
                  }}
                >
                  <Image
                    source={require("../assets/icons/portfolio_no_account_2.png")}
                    style={{ width: 44, height: 44 }}
                  />
                  <View style={{ marginLeft: 12 }}>
                    <Text
                      style={{
                        fontFamily: "SfRegular",
                        fontWeight: "600",
                        fontSize: 16,
                        lineHeight: 24,
                        color: isDark ? "#E0E0E0" : "#0B1B0C",
                      }}
                    >
                      STEP 2:
                    </Text>
                    <Text
                      style={{
                        fontFamily: "SfRegular",
                        fontWeight: "400",
                        fontSize: 14,
                        lineHeight: 19,
                        color: isDark ? "#E0E0E0" : "#5A5A5A",
                        marginTop: 3,
                      }}
                    >
                      Provide documents such as CNIC, {"\n"}Income Statement,
                      Income Proof
                    </Text>
                  </View>
                </LinearGradient>

                {/* Step 3 */}
                <LinearGradient
                  colors={["#FFD54F0D", "#FFA7260D"]}
                  style={{
                    padding: 21,
                    borderWidth: 1,
                    borderColor: "#FFD54F1A",
                    borderRadius: 16,
                    flexDirection: "row",
                    marginTop: 12,
                  }}
                >
                  <Image
                    source={require("../assets/icons/portfolio_no_account_3.png")}
                    style={{ width: 44, height: 44 }}
                  />
                  <View style={{ marginLeft: 12 }}>
                    <Text
                      style={{
                        fontFamily: "SfRegular",
                        fontWeight: "600",
                        fontSize: 16,
                        lineHeight: 24,
                        color: isDark ? "#E0E0E0" : "#0B1B0C",
                      }}
                    >
                      STEP 3:
                    </Text>
                    <Text
                      style={{
                        fontFamily: "SfRegular",
                        fontWeight: "400",
                        fontSize: 14,
                        lineHeight: 19,
                        color: isDark ? "#E0E0E0" : "#5A5A5A",
                        marginTop: 3,
                      }}
                    >
                      Submission and Approval
                    </Text>
                  </View>
                </LinearGradient>

                {/* Fee Note */}
                <View
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 17,
                    borderWidth: 1,
                    borderColor: "#E8E8E8",
                    borderRadius: 16,
                    flexDirection: "row",
                    marginTop: 12,
                    backgroundColor:
                      isDark ? "#FFFFFF14" : "#F8F9FA",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "400",
                      fontSize: 13,
                      lineHeight: 19,
                      color: isDark ? "#8A8A8A" : "#5A5A5A",
                    }}
                  >
                    *An account opening fee of Rs. 469.00 will be deducted from
                    the deposited amount.
                  </Text>
                </View>

                {/* Continue Button – Only for unlinked users */}
                {user?.user_metadata?.status === "unlinked" &&
                profileuser?.status === "unlinked" ? (
                  <View>
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        paddingVertical: 18,
                        borderRadius: 12,
                        backgroundColor: submitting ? "#A0DAB9" : "#53BA83",
                        marginTop: 28,
                        width: "100%",
                        opacity: submitting ? 0.7 : 1,
                      }}
                      onPress={handleContinue}
                      disabled={submitting}
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
                        {submitting ? "Submitting..." : "Continue"}
                      </Text>
                    </TouchableOpacity>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        marginTop: 6,
                      }}
                    >
                      <Text
                        style={[
                          {
                            color:
                              isDark ? "#8A8A8A" : "#444B44",
                            fontFamily: "SfRegular",
                            fontWeight: "400",
                            fontSize: 13,
                            lineHeight: 20,
                          },
                        ]}
                      >
                        Already Have a{" "}
                      </Text>
                      <Text
                        onPress={() =>
                          router.push("/ClientForm?prev=open_account")
                        }
                        style={[
                          {
                            color:
                              isDark ? "#8A8A8A" : "#444B44",
                            textDecorationLine: "underline",
                            fontFamily: "SfRegular",
                            fontWeight: "400",
                            fontSize: 13,
                            lineHeight: 20,
                          },
                        ]}
                      >
                        Brokerage Account
                      </Text>
                    </View>
                  </View>
                ) : (
                  ""
                )}

                {/* Optional: Show current status (debug) */}
                {/* <Text style={{ marginTop: 10, textAlign: "center", color: "#666", fontFamily: "SfRegular" }}>
            Current Status: {user?.user_metadata?.status || "unknown"}
          </Text> */}
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <Toast position="bottom" config={toastConfig} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#fff",
    paddingTop: 30,
    marginHorizontal: 24,
    marginBottom: 100,
  },
  scrollView: {
    flex: 1,
    // backgroundColor: "#fff",
  },
});

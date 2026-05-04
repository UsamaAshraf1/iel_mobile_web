import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useFocusEffect } from "expo-router";

const { width: screenWidth } = Dimensions.get("window");
import { supabase } from "../../supabaseConfig";
import { LinearGradient } from "expo-linear-gradient";
// import ThemeToggle from "@/components/ThemeConverter";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from '@/hooks/ThemeContext';

export default function More() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(""); // Profile picture URL

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ClientData, setClientData] = useState([]);

  console.log(user);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(user);
      setAvatarUrl(user?.user_metadata?.first_name || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const fetchClientCode = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("ClientCode")
        .select("*")
        .eq("userId", user?.id)
        .maybeSingle();
      console.log(data);
      setClientData(data);
    } catch (err) {
      console.error("Fetch Client Code error:", err);
    }
  }, [user?.id]);

  // useEffect(() => {
  //   if (user?.id) {
  //     fetchClientCode();
  //   }
  // }, [user?.id]);
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchClientCode();
      }
    }, [user?.id, fetchClientCode]),
  );
  return (
    <ScrollView
      style={[
        styles.scrollView,
        {
          backgroundColor: isDark ? "" : "#fff",
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? "" : "#fff",
          },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {avatarUrl ? (
              <>
                {/* // <Image */}
                {/* //   source={{ uri: avatarUrl }}
            //   style={{ width: 64, height: 64, borderRadius: 100 }}
            // /> */}
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "100%",
                    backgroundColor: "#D9E7FF",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#1B58C1",
                      fontSize: 22,
                      fontWeight: "500",
                      letterSpacing: 0.5,
                    }}
                  >
                    {/* {avatarUrl} */}
                    {getInitials(avatarUrl)}
                  </Text>
                </View>
              </>
            ) : (
              <Image
                source={require("../../assets/default_avatar.png")}
                style={{ width: 64, height: 64, borderRadius: 100 }}
              />
            )}

            <View style={{ marginLeft: 16 }}>
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  fontSize: 20,
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  lineHeight: 30,
                }}
              >
                {user?.user_metadata?.first_name}
              </Text>
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontWeight: "400",
                  fontSize: 13,
                  color: "#8A8A8A",
                  lineHeight: 20,
                }}
              >
                {ClientData?.cliendCode ? "Client Code: " : ""}
                {ClientData?.cliendCode ? ClientData?.cliendCode : user?.email}
                {/* {user?.email} */}
              </Text>
              {/* <View style={{ flexDirection: "row" }}>
              <Text
                style={{
                  backgroundColor: "#53BA831A",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  fontSize: 11,
                  color: "#53BA83",
                }}
              >
                Premium
              </Text>
              <Text
                style={{
                  backgroundColor: "#FFA5001A",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  fontSize: 11,
                  color: "#FFA500",
                  marginLeft: 8,
                }}
              >
                Verified
              </Text>
            </View> */}
            </View>
          </View>
        </View>
        <View
          style={{ flexDirection: "row", marginTop: 24, alignItems: "center" }}
        >
          <View
            style={{
              width: 4,
              height: 4,
              backgroundColor: "#53BA83",
              borderRadius: 100,
            }}
          ></View>
          <Text
            style={{
              fontFamily: "SfRegular",
              fontWeight: "600",
              fontSize: 12,
              lineHeight: 18,
              color: "#8A8A8A",
              marginLeft: 8,
            }}
          >
            Account
          </Text>
        </View>

        <TouchableOpacity
          style={{
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 17,
            borderWidth: 1,
            borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
            borderRadius: 14,
            backgroundColor: isDark ? "#222222" : "",
          }}
          onPress={() => router.push("/AccountDetail")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image
              source={require("../../assets/icons/account_detail.png")}
              style={{ width: 42, height: 42 }}
            />
            <View style={{ marginLeft: 14 }}>
              <Text
                style={{
                  fontWeight: "600",
                  fontFamily: "SfRegular",
                  fontSize: 15,
                  // color: "#0B1B0C",
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  lineHeight: 22,
                }}
              >
                Account Details
              </Text>
              <Text
                style={{
                  fontWeight: "400",
                  fontFamily: "SfRegular",
                  fontSize: 12,
                  color: "#8A8A8A",
                  lineHeight: 18,
                }}
              >
                Personal information & settings
              </Text>
            </View>
          </View>
          <Image
            source={require("../../assets/icons/move_farward.png")}
            style={{ width: 18, height: 18 }}
          />
        </TouchableOpacity>

         <TouchableOpacity
          style={{
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 17,
            borderWidth: 1,
            borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
            borderRadius: 14,
            backgroundColor: isDark ? "#222222" : "",
          }}
          onPress={() => router.push("/RaastId")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image
              source={require("../../assets/icons/raast_icon.png")}
              style={{ width: 42, height: 42 }}
            />
            <View style={{ marginLeft: 14 }}>
              <Text
                style={{
                  fontWeight: "600",
                  fontFamily: "SfRegular",
                  fontSize: 15,
                  // color: "#0B1B0C",
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  lineHeight: 22,
                }}
              >
                Get Raast IBAN
              </Text>
              <Text
                style={{
                  fontWeight: "400",
                  fontFamily: "SfRegular",
                  fontSize: 12,
                  color: "#8A8A8A",
                  lineHeight: 18,
                }}
              >
                raast iban generate
              </Text>
            </View>
          </View>
          <Image
            source={require("../../assets/icons/move_farward.png")}
            style={{ width: 18, height: 18 }}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 17,
            borderWidth: 1,
            borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
            borderRadius: 14,
            backgroundColor: isDark ? "#222222" : "",
          }}
          onPress={() => router.push("/Notification")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image
              source={require("../../assets/icons/notification.png")}
              style={{ width: 42, height: 42 }}
            />
            <View style={{ marginLeft: 14 }}>
              <Text
                style={{
                  fontWeight: "600",
                  fontFamily: "SfRegular",
                  fontSize: 15,
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  lineHeight: 22,
                }}
              >
                Notifications
              </Text>
              <Text
                style={{
                  fontWeight: "400",
                  fontFamily: "SfRegular",
                  fontSize: 12,
                  color: "#8A8A8A",
                  lineHeight: 18,
                }}
              >
                Manage your alerts
              </Text>
            </View>
          </View>
          <Image
            source={require("../../assets/icons/move_farward.png")}
            style={{ width: 18, height: 18 }}
          />
        </TouchableOpacity>
        {/* <TouchableOpacity
          style={{
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 17,
            borderWidth: 1,
            borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
            borderRadius: 14,
            backgroundColor: isDark ? "#222222" : "",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image
              source={require("../../assets/icons/security.png")}
              style={{ width: 42, height: 42 }}
            />
            <View style={{ marginLeft: 14 }}>
              <Text
                style={{
                  fontWeight: "600",
                  fontFamily: "SfRegular",
                  fontSize: 15,
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  lineHeight: 22,
                }}
              >
                Security
              </Text>
              <Text
                style={{
                  fontWeight: "400",
                  fontFamily: "SfRegular",
                  fontSize: 12,
                  color: "#8A8A8A",
                  lineHeight: 18,
                }}
              >
                Password & authentication
              </Text>
            </View>
          </View>
          <Image
            source={require("../../assets/icons/move_farward.png")}
            style={{ width: 18, height: 18 }}
          />
        </TouchableOpacity> */}

        {/* <View
          style={{ flexDirection: "row", marginTop: 24, alignItems: "center" }}
        >
          <View
            style={{
              width: 4,
              height: 4,
              backgroundColor: "#53BA83",
              borderRadius: 100,
            }}
          ></View>
          <Text
            style={{
              fontFamily: "SfRegular",
              fontWeight: "600",
              fontSize: 12,
              lineHeight: 18,
              color: "#8A8A8A",
              marginLeft: 8,
            }}
          >
            Financial
          </Text>
        </View>

        <TouchableOpacity
          style={{
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 17,
            borderWidth: 1,
            borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
            borderRadius: 14,
            backgroundColor: isDark ? "#222222" : "",
          }}
          // onPress={() => router.push("/AccountDetail")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image
              source={require("../../assets/icons/payment.png")}
              style={{ width: 42, height: 42 }}
            />
            <View style={{ marginLeft: 14 }}>
              <Text
                style={{
                  fontWeight: "600",
                  fontFamily: "SfRegular",
                  fontSize: 15,
                  // color: "#0B1B0C",
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  lineHeight: 22,
                }}
              >
                Payment Methods
              </Text>
              <Text
                style={{
                  fontWeight: "400",
                  fontFamily: "SfRegular",
                  fontSize: 12,
                  color: "#8A8A8A",
                  lineHeight: 18,
                }}
              >
                Manage your payment options
              </Text>
            </View>
          </View>
          <Image
            source={require("../../assets/icons/move_farward.png")}
            style={{ width: 18, height: 18 }}
          />
        </TouchableOpacity> */}

        <View
          style={{ flexDirection: "row", marginTop: 24, alignItems: "center" }}
        >
          <View
            style={{
              width: 4,
              height: 4,
              backgroundColor: "#53BA83",
              borderRadius: 100,
            }}
          ></View>
          <Text
            style={{
              fontFamily: "SfRegular",
              fontWeight: "600",
              fontSize: 12,
              lineHeight: 18,
              color: "#8A8A8A",
              marginLeft: 8,
            }}
          >
            Legal & Support
          </Text>
        </View>

        <TouchableOpacity
          style={{
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 17,
            borderWidth: 1,
            borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
            borderRadius: 14,
            backgroundColor: isDark ? "#222222" : "",
          }}
          onPress={() => router.push("/Privacy")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image
              source={require("../../assets/icons/privacy_new.png")}
              style={{ width: 42, height: 42 }}
            />
            <View style={{ marginLeft: 14 }}>
              <Text
                style={{
                  fontWeight: "600",
                  fontFamily: "SfRegular",
                  fontSize: 15,
                  // color: "#0B1B0C",
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  lineHeight: 22,
                }}
              >
                Privacy Policy
              </Text>
              <Text
                style={{
                  fontWeight: "400",
                  fontFamily: "SfRegular",
                  fontSize: 12,
                  color: "#8A8A8A",
                  lineHeight: 18,
                }}
              >
                How we protect your data
              </Text>
            </View>
          </View>
          <Image
            source={require("../../assets/icons/move_farward.png")}
            style={{ width: 18, height: 18 }}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 17,
            borderWidth: 1,
            borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
            borderRadius: 14,
            backgroundColor: isDark ? "#222222" : "",
          }}
          onPress={() => router.push("/Terms")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image
              source={require("../../assets/icons/terms.png")}
              style={{ width: 42, height: 42 }}
            />
            <View style={{ marginLeft: 14 }}>
              <Text
                style={{
                  fontWeight: "600",
                  fontFamily: "SfRegular",
                  fontSize: 15,
                  // color: "#0B1B0C",
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  lineHeight: 22,
                }}
              >
                Terms & Conditions
              </Text>
              <Text
                style={{
                  fontWeight: "400",
                  fontFamily: "SfRegular",
                  fontSize: 12,
                  color: "#8A8A8A",
                  lineHeight: 18,
                }}
              >
                User agreement & policies
              </Text>
            </View>
          </View>
          <Image
            source={require("../../assets/icons/move_farward.png")}
            style={{ width: 18, height: 18 }}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 17,
            borderWidth: 1,
            borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
            borderRadius: 14,
            backgroundColor: isDark ? "#222222" : "",
          }}
          onPress={() => router.push("/Help")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image
              source={require("../../assets/icons/help.png")}
              style={{ width: 42, height: 42 }}
            />
            <View style={{ marginLeft: 14 }}>
              <Text
                style={{
                  fontWeight: "600",
                  fontFamily: "SfRegular",
                  fontSize: 15,
                  // color: "#0B1B0C",
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  lineHeight: 22,
                }}
              >
                Help & Support
              </Text>
              <Text
                style={{
                  fontWeight: "400",
                  fontFamily: "SfRegular",
                  fontSize: 12,
                  color: "#8A8A8A",
                  lineHeight: 18,
                }}
              >
                FAQs and contact us
              </Text>
            </View>
          </View>
          <Image
            source={require("../../assets/icons/move_farward.png")}
            style={{ width: 18, height: 18 }}
          />
        </TouchableOpacity>

        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 17,
            borderWidth: 1,
            borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
            borderRadius: 14,
            backgroundColor: isDark ? "#222222" : "",
          }}
        >
          <ThemeToggle />
        </View>

        <TouchableOpacity onPress={handleLogout}>
          {isDark ? (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                marginTop: 24,
                backgroundColor: "red",
                padding: 17,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#FF6B6B33",
                backgroundColor: "#FF6B6B33",
              }}
            >
              <Image
                source={require("../../assets/icons/sign_out_dark.png")}
                style={{ width: 18, height: 18 }}
              />{" "}
              <Text
                style={{
                  marginLeft: 4,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  fontSize: 15,
                  lineHeight: 22,
                  color: "#FF6B6B",
                }}
              >
                Sign Out
              </Text>
            </View>
          ) : (
            <LinearGradient
              colors={["#FFE5E5", "#FFF0F0"]}
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                marginTop: 24,
                backgroundColor: "red",
                padding: 17,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#E0000033",
              }}
            >
              <Image
                source={
                  isDark
                    ? require("../../assets/icons/sign_out_dark.png")
                    : require("../../assets/icons/logout_icon.png")
                }
                style={{ width: 18, height: 18 }}
              />{" "}
              <Text
                style={{
                  marginLeft: 4,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  fontSize: 15,
                  lineHeight: 22,
                  color: isDark ? "#FF6B6B" : "#E00000",
                }}
              >
                Sign Out
              </Text>
            </LinearGradient>
          )}
        </TouchableOpacity>

        {/* <View style={{ paddingHorizontal: 24 }}>
          <Text style={styles.headerTitle}>More</Text>{" "}
        </View> */}

        {/* <View
        style={{
          borderWidth: 1,
          borderColor: "#F0F0F0",
          backgroundColor: "#ffffff",
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 16,
          elevation: 8,
          marginHorizontal: 24,
          marginTop: 27,
        }}
      >
        <View style={{ padding: 16 }}>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#E6E6E6",
            }}
            onPress={() => router.push("/AccountDetail")}
          >
            <View style={{ flexDirection: "row" }}>
              <Image
                source={require("../../assets/account.png")}
                style={{ width: 20, height: 20, marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  fontFamily: "OutfitMedium",
                }}
              >
                Account Details
              </Text>
            </View>
            <Image
              source={require("../../assets/new_farward.png")}
              style={{ width: 20, height: 20 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#E6E6E6",
              marginTop: 32,
            }}
            onPress={() => router.push("/Privacy")}
          >
            <View style={{ flexDirection: "row" }}>
              <Image
                source={require("../../assets/privacy.png")}
                style={{ width: 20, height: 20, marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  fontFamily: "OutfitMedium",
                }}
              >
                Privacy Policy
              </Text>
            </View>
            <Image
              source={require("../../assets/new_farward.png")}
              style={{ width: 20, height: 20 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#E6E6E6",
              marginTop: 32,
            }}
            onPress={() => router.push("/Terms")}
          >
            <View style={{ flexDirection: "row" }}>
              <Image
                source={require("../../assets/terms.png")}
                style={{ width: 20, height: 20, marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  fontFamily: "OutfitMedium",
                }}
              >
                Terms and Conditions
              </Text>
            </View>
            <Image
              source={require("../../assets/new_farward.png")}
              style={{ width: 20, height: 20 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 12,

              marginTop: 32,
            }}
            onPress={() => router.push("/Help")}
          >
            <View style={{ flexDirection: "row" }}>
              <Image
                source={require("../../assets/help.png")}
                style={{ width: 20, height: 20, marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  fontFamily: "OutfitMedium",
                }}
              >
                Help
              </Text>
            </View>
            <Image
              source={require("../../assets/new_farward.png")}
              style={{ width: 20, height: 20 }}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: "#F0F0F0",
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 16,
          elevation: 8,
          marginHorizontal: 24,
          marginTop: 24,
          backgroundColor: "#F9F9F9",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <View>
            <Text>View IELTrade Research {"\n"}Report for FY2024.</Text>
            <View
              style={{
                backgroundColor: "#58BA83",
                borderRadius: 20,
                marginTop: 12,
                width: 127,
                height: 38,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: "#FFFFFF",
                  fontFamily: "OutfitSemiBold",
                }}
              >
                Open Trading
              </Text>
            </View>
          </View>
          <View>
            <Image
              source={require("../../assets/tranding_img.png")}
              style={{ width: 72, height: 72 }}
            />
          </View>
        </View>
      </View>

      <View
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          // marginTop: 140,
          // paddingBottom: 50,
          position: "absolute",
          bottom: 40,
          left: 0, // Added: Pins left edge to 0 for full-width spanning
          right: 0,
        }}
      >
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            backgroundColor: "#E3442D",
            borderRadius: 20,
            marginTop: 12,
            width: 100,
            height: 42,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: "#FFFFFF",
              fontFamily: "OutfitSemiBold",
            }}
          >
            Logout
          </Text>
        </TouchableOpacity>
        <Text
          style={{
            marginTop: 12,
            fontSize: 16,
            fontfamily: "OutfitRegular",
            fontWeight: "400",
            color: "#6E6E6E",
          }}
        >
          App version: 2.21.200
        </Text>
      </View> */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 5,
          }}
        >
          <Text
            style={{
              marginTop: 12,
              fontSize: 16,
              fontfamily: "OutfitRegular",
              fontWeight: "400",
              color: "#6E6E6E",
            }}
          >
            App version: 1.1.4
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#fff",
    paddingTop: 50, // Adjust for status bar
    marginHorizontal: 24,
    marginBottom: 100,
  },

  scrollView: {
    flex: 1,
    // backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    fontFamily: "OutfitSemiBold",
  },
});

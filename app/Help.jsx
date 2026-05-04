import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import {useTheme} from "../hooks/ThemeContext"

const { width: screenWidth } = Dimensions.get("window");
import { useColorScheme } from "@/hooks/useColorScheme";

export default function Help() {
  const colorScheme = useColorScheme();
    const { isDark } = useTheme();

  const router = useRouter();
  const [expanded, setExpanded] = useState({});

  const faqs = [
    {
      question: "How do I open a trading account?",
      answer:
        'To open a trading account, tap "Open Account" from the portfolio section. Complete the KYC verification by providing your CNIC, bank details, and selfie verification. The process typically takes 24-48 hours.',
    },
    {
      question: "What documents do I need for KYC?",
      answer:
        "For KYC, you need to provide your CNIC, bank details, and selfie verification.",
    },

    {
      question: "Is there a minimum deposit required?",
      answer:
        "For KYC, you need to provide your CNIC, bank details, and selfie verification.",
    },
  ];

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
            alignItems: "center",
            paddingVertical: 12,
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            {isDark ? (
              <Image
                source={
                  isDark
                    ? require("../assets/white_back_icon.png")
                    : require("../assets/move_backward.png")
                }
                style={{
                  width: 8,
                  height: 12,
                }}
              />
            ) : (
              <Image
                source={require("../assets/icons/back_icon.png")}
                style={{ width: 8, height: 12 }}
              />
            )}
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontFamily: "SfRegular",
                fontWeight: "600",
                fontSize: 24,
                color: isDark ? "#E0E0E0" : "#0B1B0C",
                textAlign: "center",
              }}
            >
              Help & Support
            </Text>

            <Text
              style={{
                fontFamily: "SfRegular",
                fontWeight: "400",
                fontSize: 12,
                color: "#8A8A8A",
                textAlign: "center",
                marginTop: 4,
              }}
            >
              We're here to help you
            </Text>
          </View>
          <View style={{ width: 8 }} />{" "}
        </View>

        {/* <View>
          <TextInput
            style={styles.searchBar}
            placeholder="Search"
            placeholderTextColor="#8A8A8A"
            accessible={true}
            accessibilityElementsHidden={false}
            accessibilityLabel="Search stocks or indices"
          />
        </View> */}

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
            Contact Us
          </Text>
        </View>
        <View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
            }}
          >
            {/* <View
              style={{
                padding: 17,
                flexDirection: "column",
                justifyContent: "center",
                alignContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#E8E8E8",
                borderRadius: 14,
                width: "48%",
                height: 148,
              }}
            >
              <Image
                source={require("../assets/icons/chat.png")}
                style={{ width: 48, height: 48 }}
              />
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 10,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  fontSize: 14,
                  lineHeight: 21,
                  color: "#0B1B0C",
                }}
              >
                Live Chat
              </Text>
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontSize: 11,
                  fontWeight: "400",
                  lineHeight: 16,
                  color: "#8A8A8A",
                }}
              >
                Chat with our {"\n"} support team
              </Text>
            </View> */}
            <View
              style={{
                padding: 17,
                flexDirection: "column",
                justifyContent: "center",
                alignContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
                borderRadius: 14,
                width: "48%",
                height: 148,
                backgroundColor: isDark ? "#222222" : "",
              }}
            >
              <Image
                source={require("../assets/icons/email.png")}
                style={{ width: 48, height: 48 }}
              />
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 10,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  fontSize: 14,
                  lineHeight: 21,
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                }}
              >
                Email Support
              </Text>
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontSize: 11,
                  fontWeight: "400",
                  lineHeight: 16,
                  color: "#8A8A8A",
                  textAlign: "center",
                }}
              >
                support@investmentapp.com
              </Text>
            </View>
            <View
              style={{
                padding: 17,
                flexDirection: "column",
                justifyContent: "center",
                alignContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
                borderRadius: 14,
                width: "48%",
                height: 148,
                backgroundColor: isDark ? "#222222" : "",
              }}
            >
              <Image
                source={require("../assets/icons/call.png")}
                style={{ width: 48, height: 48 }}
              />
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 10,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  fontSize: 14,
                  lineHeight: 21,
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                }}
              >
                Call Us
              </Text>
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontSize: 11,
                  fontWeight: "400",
                  lineHeight: 16,
                  color: "#8A8A8A",
                }}
              >
                +92 300 1234567
              </Text>
            </View>
          </View>

          {/* <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <View
              style={{
                padding: 17,
                flexDirection: "column",
                justifyContent: "center",
                alignContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#E8E8E8",
                borderRadius: 14,
                width: "48%",
                height: 148,
              }}
            >
              <Image
                source={require("../assets/icons/email.png")}
                style={{ width: 48, height: 48 }}
              />
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 10,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  fontSize: 14,
                  lineHeight: 21,
                  color: "#0B1B0C",
                }}
              >
                Email Support
              </Text>
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontSize: 11,
                  fontWeight: "400",
                  lineHeight: 16,
                  color: "#8A8A8A",
                }}
              >
                support@investmentapp.com
              </Text>
            </View>

            <View
              style={{
                padding: 17,
                flexDirection: "column",
                justifyContent: "center",
                alignContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#E8E8E8",
                borderRadius: 14,
                width: "48%",
                height: 148,
              }}
            >
              <Image
                source={require("../assets/icons/video.png")}
                style={{ width: 48, height: 48 }}
              />
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 10,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  fontSize: 14,
                  lineHeight: 21,
                  color: "#0B1B0C",
                }}
              >
                Video Tutorial
              </Text>
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontSize: 11,
                  fontWeight: "400",
                  lineHeight: 16,
                  color: "#8A8A8A",
                }}
              >
                Watch how-to guides
              </Text>
            </View>
          </View> */}
        </View>

        <View style={{ marginTop: 32 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{}}>
              <Image
                source={require("../assets/icons/get_started.png")}
                style={{ width: 28, height: 28 }}
              />
            </View>
            <Text
              style={{
                fontFamily: "SfRegular",
                fontWeight: "600",
                fontSize: 15,
                lineHeight: 22,
                color: isDark ? "#E0E0E0" : "#0B1B0C",
                marginLeft: 8,
              }}
            >
              Getting Started
            </Text>
          </View>
          {faqs.map((faq, index) => (
            <View key={index} style={{ marginTop: 12 }}>
              <TouchableOpacity
                onPress={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [index]: !prev[index],
                  }))
                }
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
                  borderRadius: 14,
                  backgroundColor: isDark ? "#222222" : "",
                }}
              >
                <Text
                  style={{
                    fontFamily: "SfRegular",
                    fontWeight: "600",
                    fontSize: 13,
                    lineHeight: 20,
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                  }}
                >
                  {faq.question}
                </Text>
                <Image
                  source={
                    expanded[index]
                      ? require("../assets/icons/open_dropdown.png")
                      : require("../assets/icons/close_dropdown.png")
                  }
                  style={{
                    width: 20,
                    height: 20,
                    tintColor: "#8A8A8A",
                  }}
                />
              </TouchableOpacity>
              <View
                style={{
                  height: expanded[index] ? null : 0,
                  overflow: "hidden",
                }}
              >
                <Text
                  style={{
                    fontFamily: "SfRegular",
                    fontWeight: "400",
                    fontSize: 12,
                    lineHeight: 18,
                    color: "#5A5A5A",
                    paddingVertical: 12,
                    paddingHorizontal: 4,
                  }}
                >
                  {faq.answer}
                </Text>
              </View>
            </View>
          ))}
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
    marginBottom: 200,
  },

  scrollView: {
    flex: 1,
    // backgroundColor: "#fff",
  },
  searchBar: {
    marginTop: 10,
    height: 41,
    borderWidth: 1,
    borderColor: "#ECECEC",
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    backgroundColor: "#F4F4F4",
    fontFamily: "SfRegular",
    color: "black",
    marginRight: 4,
  },
});

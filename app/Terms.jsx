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

const { width: screenWidth } = Dimensions.get("window");

export default function Terms() {
  const router = useRouter();
  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <View
          style={{
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TouchableOpacity onPress={() => router.push("/More")}>
            <Image
              source={require("../assets/move_backward.png")}
              style={{ width: 24, height: 24, marginRight: 2, marginTop: 1 }}
            />{" "}
          </TouchableOpacity>
          {/* <Text style={styles.headerTitle}>Terms and Conditions</Text>{" "} */}
        </View>

        <View style={{ marginTop: 27, paddingHorizontal: 24 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "600",
              fontFamily: "OutfitSemiBold",
              color: "#000000",
            }}
          >
            Terms and Conditions
          </Text>
          <Text
            style={{
              marginTop: 8,
              color: "#9E9E9E",
              fontSize: 16,
              fontWeight: "400",
              fontFamily: "OutfitRegular",
            }}
          >
            Updated on January 21, 2025 | 2 mint read
          </Text>

          <Text
            style={{
              marginTop: 24,
              color: "#000000",
              fontWeight: "600",
              fontSize: 18,
              fontFamily: "OutfitSemiBold",
            }}
          >
            Introduction
          </Text>

          <Text
            style={{
              marginTop: 16,
              fontWeight: "400",
              color: "#8A8A8A",
              fontSize: 14,
              fontFamily: "OutfitRegular",
            }}
          >
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum. {"\n"} {"\n"}{" "}
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum. {"\n"} {"\n"}{" "}
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum.{"\n"} {"\n"}{" "}
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 50, // Adjust for status bar
    paddingBottom: 20,
  },

  scrollView: {
    backgroundColor: "#fff",
    flex: 1,
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

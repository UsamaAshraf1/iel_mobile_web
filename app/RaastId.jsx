"use client";

import React, { useState,useEffect,useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
// import * as Clipboard from "expo-clipboard";
import { useTheme } from "../hooks/ThemeContext";
import { supabase } from "../supabaseConfig";

export default function RaastScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  const [clientCode, setClientCode] = useState("");
  const [result, setResult] = useState(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(user);
    } catch (err) {
      console.log(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchClientCode = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("ClientCode")
        .select("*")
        .eq("userId", user?.id)
        .maybeSingle();
      console.log(data);
      setClientCode(data?.cliendCode || "");
    } catch (err) {
      console.error("Fetch Client Code error:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchClientCode();
    }
  }, [user?.id]);

  const handleSubmit = () => {
    // Mock response (replace with API later)
    setResult({
      name: "MUHAMMAD AKIF",
      cnic: "4200098245047",
      iban: "PK87CDCP5180019900000001",
    });
  };

  const handleCopy = async () => {
    console.log("Copying IBAN:");
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "" : "#fff" }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          // style={{ width: "10%" }}
        >
          <Image
            source={
              isDark
                ? require("../assets/icons/white_back_icon.png")
                : require("../assets/icons/back_icon.png")
            }
            style={{ width: 8, height: 12 }}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.title,
            {
              color: isDark ? "#E0E0E0" : "#0B1B0C",
            },
          ]}
        >
          Raast
        </Text>
        <View></View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.heading}>Enter Client Code</Text>

        <TextInput
          value={clientCode}
          onChangeText={setClientCode}
          placeholder="Enter Code"
          placeholderTextColor="#666"
          style={[
            styles.input,
            {
              backgroundColor: isDark ? "#FFFFFF14" : "#F4F4F4",
              paddingHorizontal: 12,
              paddingVertical: 16,
              borderRadius: 8,
            },
          ]}
        />

        {/* <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Submit</Text>
        </TouchableOpacity> */}

        <TouchableOpacity
          style={{
            backgroundColor: "#53BA83",
            borderRadius: 12,
            marginTop: 12,
            width: "100%",
            height: 60,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
          }}
          onPress={handleSubmit}
        >
          <Text
            style={{
              fontSize: 18,
              color: "white",
              fontWeight: "600",
              fontFamily: "SfRegular",
            }}
          >
            Submit
          </Text>
        </TouchableOpacity>

        <Text style={styles.infoText}>
          Enter the client code provided to you and click submit to retrieve the
          Raast ID.
        </Text>

        {/* Result Section */}
        {result && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>Generating Raast ID for</Text>

            <Text style={styles.name}>{result.name}</Text>
            <Text style={styles.cnic}>{result.cnic}</Text>

            {/* IBAN Card */}
            <View style={styles.card}>
              <Text style={styles.iban}>{result.iban}</Text>

              <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                <Text style={styles.copyText}>Copy</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#fff",
    paddingTop: 50,
    paddingHorizontal: 24,
    // paddingBottom: 200,
    minHeight: "120vh",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    justifyContent: "space-between",
  },

  title: {
    fontFamily: "SfRegular",
    fontWeight: "600",
    fontSize: 24,
    textAlign: "center",
  },

  // headerTitle: {
  //   color: "#fff",
  //   fontSize: 20,
  //   fontWeight: "600",
  // },

  content: {
    flex: 1,
    paddingVertical: 20,
  },

  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 20,
  },

  input: {
    backgroundColor: "transparent",
    borderWidth: 0,
    fontSize: 16,
    fontFamily: "OutfitLight",
    color: "#929292",
    fontWeight: "400",
  },

  button: {
    backgroundColor: "#1C88B5",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  infoText: {
    marginTop: 15,
    color: "#8A8A8A",
    fontSize: 14,
  },

  resultContainer: {
    marginTop: 30,
    alignItems: "center",
  },

  resultText: {
    color: "#00C087",
    fontSize: 16,
  },

  name: {
    color: "#00C087",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 5,
  },

  cnic: {
    color: "#00C087",
    fontSize: 16,
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#eee",
    padding: 20,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },

  iban: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },

  copyBtn: {
    borderWidth: 1,
    borderColor: "#999",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },

  copyText: {
    fontSize: 14,
  },

  footer: {
    backgroundColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  footerText: {
    color: "#555",
  },

  footerLink: {
    color: "#555",
    textDecorationLine: "underline",
  },
});

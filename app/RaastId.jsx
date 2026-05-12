// "use client";

// import React, { useState,useEffect,useCallback } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   Image,
// } from "react-native";
// import { useRouter } from "expo-router";
// // import * as Clipboard from "expo-clipboard";
// import { useTheme } from "../hooks/ThemeContext";
// import { supabase } from "../supabaseConfig";

// export default function RaastScreen() {
//   const router = useRouter();
//   const { isDark } = useTheme();

//   const [clientCode, setClientCode] = useState("");
//   const [result, setResult] = useState(null);

//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const fetchUser = async () => {
//     try {
//       setLoading(true);
//       const {
//         data: { user },
//         error,
//       } = await supabase.auth.getUser();
//       if (error) throw error;
//       setUser(user);
//     } catch (err) {
//       console.log(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchUser();
//   }, []);

//   const fetchClientCode = useCallback(async () => {
//     try {
//       const { data, error } = await supabase
//         .from("ClientCode")
//         .select("*")
//         .eq("userId", user?.id)
//         .maybeSingle();
//       console.log(data);
//       setClientCode(data?.cliendCode || "");
//     } catch (err) {
//       console.error("Fetch Client Code error:", err);
//     }
//   }, [user?.id]);

//   useEffect(() => {
//     if (user?.id) {
//       fetchClientCode();
//     }
//   }, [user?.id]);

//   const handleSubmit = () => {
//     // Mock response (replace with API later)
//     setResult({
//       name: "MUHAMMAD AKIF",
//       cnic: "4200098245047",
//       iban: "PK87CDCP5180019900000001",
//     });
//   };

//   const handleCopy = async () => {
//     console.log("Copying IBAN:");
//   };

//   return (
//     <View style={[styles.container, { backgroundColor: isDark ? "" : "#fff" }]}>
//       <View style={styles.header}>
//         <TouchableOpacity
//           onPress={() => router.back()}
//           // style={{ width: "10%" }}
//         >
//           <Image
//             source={
//               isDark
//                 ? require("../assets/icons/white_back_icon.png")
//                 : require("../assets/icons/back_icon.png")
//             }
//             style={{ width: 8, height: 12 }}
//           />
//         </TouchableOpacity>
//         <Text
//           style={[
//             styles.title,
//             {
//               color: isDark ? "#E0E0E0" : "#0B1B0C",
//             },
//           ]}
//         >
//           Raast
//         </Text>
//         <View></View>
//       </View>

//       {/* Content */}
//       <View style={styles.content}>
//         <Text style={styles.heading}>Enter Client Code</Text>

//         <TextInput
//           value={clientCode}
//           onChangeText={setClientCode}
//           placeholder="Enter Code"
//           placeholderTextColor="#666"
//           style={[
//             styles.input,
//             {
//               backgroundColor: isDark ? "#FFFFFF14" : "#F4F4F4",
//               paddingHorizontal: 12,
//               paddingVertical: 16,
//               borderRadius: 8,
//             },
//           ]}
//         />

//         {/* <TouchableOpacity style={styles.button} onPress={handleSubmit}>
//           <Text style={styles.buttonText}>Submit</Text>
//         </TouchableOpacity> */}

//         <TouchableOpacity
//           style={{
//             backgroundColor: "#53BA83",
//             borderRadius: 12,
//             marginTop: 12,
//             width: "100%",
//             height: 60,
//             alignItems: "center",
//             flexDirection: "row",
//             justifyContent: "center",
//           }}
//           onPress={handleSubmit}
//         >
//           <Text
//             style={{
//               fontSize: 18,
//               color: "white",
//               fontWeight: "600",
//               fontFamily: "SfRegular",
//             }}
//           >
//             Submit
//           </Text>
//         </TouchableOpacity>

//         <Text style={styles.infoText}>
//           Enter the client code provided to you and click submit to retrieve the
//           Raast ID.
//         </Text>

//         {/* Result Section */}
//         {result && (
//           <View style={styles.resultContainer}>
//             <Text style={styles.resultText}>Generating Raast ID for</Text>

//             <Text style={styles.name}>{result.name}</Text>
//             <Text style={styles.cnic}>{result.cnic}</Text>

//             {/* IBAN Card */}
//             <View style={styles.card}>
//               <Text style={styles.iban}>{result.iban}</Text>

//               <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
//                 <Text style={styles.copyText}>Copy</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         )}
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     // backgroundColor: "#fff",
//     paddingTop: 50,
//     paddingHorizontal: 24,
//     // paddingBottom: 200,
//     minHeight: "120vh",
//   },

//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 12,
//     justifyContent: "space-between",
//   },

//   title: {
//     fontFamily: "SfRegular",
//     fontWeight: "600",
//     fontSize: 24,
//     textAlign: "center",
//   },

//   // headerTitle: {
//   //   color: "#fff",
//   //   fontSize: 20,
//   //   fontWeight: "600",
//   // },

//   content: {
//     flex: 1,
//     paddingVertical: 20,
//   },

//   heading: {
//     fontSize: 28,
//     fontWeight: "700",
//     color: "#fff",
//     marginBottom: 20,
//   },

//   input: {
//     backgroundColor: "transparent",
//     borderWidth: 0,
//     fontSize: 16,
//     fontFamily: "OutfitLight",
//     color: "#929292",
//     fontWeight: "400",
//   },

//   button: {
//     backgroundColor: "#1C88B5",
//     padding: 16,
//     borderRadius: 10,
//     alignItems: "center",
//   },

//   buttonText: {
//     color: "#fff",
//     fontSize: 18,
//     fontWeight: "600",
//   },

//   infoText: {
//     marginTop: 15,
//     color: "#8A8A8A",
//     fontSize: 14,
//   },

//   resultContainer: {
//     marginTop: 30,
//     alignItems: "center",
//   },

//   resultText: {
//     color: "#00C087",
//     fontSize: 16,
//   },

//   name: {
//     color: "#00C087",
//     fontSize: 20,
//     fontWeight: "700",
//     marginTop: 5,
//   },

//   cnic: {
//     color: "#00C087",
//     fontSize: 16,
//     marginBottom: 20,
//   },

//   card: {
//     backgroundColor: "#eee",
//     padding: 20,
//     borderRadius: 12,
//     width: "100%",
//     alignItems: "center",
//   },

//   iban: {
//     fontSize: 18,
//     fontWeight: "600",
//     marginBottom: 10,
//   },

//   copyBtn: {
//     borderWidth: 1,
//     borderColor: "#999",
//     paddingHorizontal: 20,
//     paddingVertical: 8,
//     borderRadius: 6,
//   },

//   copyText: {
//     fontSize: 14,
//   },

//   footer: {
//     backgroundColor: "#eee",
//     flexDirection: "row",
//     justifyContent: "space-between",
//     padding: 15,
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//   },

//   footerText: {
//     color: "#555",
//   },

//   footerLink: {
//     color: "#555",
//     textDecorationLine: "underline",
//   },
// });

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../supabaseConfig";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import { useToastConfig } from "../Services/toastConfig";
import { useTheme } from "../hooks/ThemeContext";

export default function RaastScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const toastConfig = useToastConfig();

  const [clientCode, setClientCode] = useState("");
  const [result, setResult] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRaastSaved, setIsRaastSaved] = useState(false);

  const setRaastResult = (data) => {
    setResult({
      name: data.clientname,
      iban: data.raastiban,
      clientCode: data.clientcode,
      folioNumber: data.folionumber,
    });
  };

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

  const getRaastRecordByClientCode = async (code) => {
    if (!code?.trim()) return null;

    const { data, error } = await supabase
      .from("raastids")
      .select("*")
      .eq("clientcode", code.trim())
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return data;
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

      if (error) throw error;

      if (data?.cliendCode) {
        setClientCode(data.cliendCode);

        const existingRaastRecord = await getRaastRecordByClientCode(
          data.cliendCode,
        );

        if (existingRaastRecord) {
          setRaastResult(existingRaastRecord);
          setIsRaastSaved(true);
        }
      }
    } catch (err) {
      console.error("Fetch Client Code error:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchClientCode();
    }
  }, [user?.id, fetchClientCode]);

  const handleClientCodeChange = (value) => {
    setClientCode(value);
    setResult(null);
    setIsRaastSaved(false);
  };

  const handleSubmit = async () => {
    if (!clientCode?.trim()) {
      Alert.alert("Required", "Please enter client code.");
      return;
    }

    console.log("Submitting client code:", clientCode);

    try {
      setLoading(true);

      const response = await fetch(
        `http://113.203.232.204:9089/api/generatePaymentId/${clientCode}`,
        {
          method: "GET",
          headers: {
            authKey: "E6AA2EAE24FFB9FCE1762EB5844E1",
          },
        },
      );

      const data = await response.json();

      if (!response.ok || data?.responseCode !== "00") {
        throw new Error(data?.errorRemarks || "Failed to generate Raast ID");
      }

      const raastInfo = {
        folionumber: data.folioNumber,
        clientname: data.clientName,
        clientcode: data.clientCode,
        raastiban: data.raastIBAN,
      };

      const { error: insertError } = await supabase
        .from("raastids")
        .insert([raastInfo]);

      if (insertError) throw insertError;

      setRaastResult(raastInfo);
      setClientCode(data.clientCode || clientCode);
      setIsRaastSaved(true);

      Toast.show({
        type: "success",
        text1: "Raast ID Generated",
        text2: "Raast details saved successfully.",
      });
    } catch (err) {
      console.error("Generate Raast ID error:", err);

      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.iban) return;

    try {
      await Clipboard.setStringAsync(result.iban);

      Toast.show({
        type: "success",
        text1: "Copied to Clipboard",
        text2: "IBAN copied to clipboard.",
      });
    } catch (err) {
      console.error("Copy IBAN error:", err);

      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Unable to copy IBAN.",
      });
    }
  };

  return (
    <>
      <View
        style={[styles.container, { backgroundColor: isDark ? "" : "#fff" }]}
      >
        <View style={styles.header}>
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

          <Text
            style={[styles.title, { color: isDark ? "#E0E0E0" : "#0B1B0C" }]}
          >
            Raast
          </Text>

          <View />
        </View>

        <View style={styles.content}>
          <Text
            style={[styles.heading, { color: isDark ? "#fff" : "#0B1B0C" }]}
          >
            Enter Client Code
          </Text>

          <TextInput
            value={clientCode}
            onChangeText={handleClientCodeChange}
            placeholder="Enter Code"
            placeholderTextColor="#666"
            editable={!loading && !isRaastSaved}
            style={[
              styles.input,
              {
                backgroundColor: isDark ? "#FFFFFF14" : "#F4F4F4",
              },
            ]}
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              { opacity: loading || isRaastSaved ? 0.7 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={loading || isRaastSaved}
          >
            <Text style={styles.submitButtonText}>
              {isRaastSaved
                ? "Already Generated"
                : loading
                  ? "Please wait..."
                  : "Submit"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.infoText}>
            Enter the client code provided to you and click submit to retrieve
            the Raast ID.
          </Text>

          {result && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>Raast ID generated for</Text>

              <Text style={styles.name}>{result.name}</Text>

              <View style={[styles.detailsBox, { marginTop: 10 }]}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Client Code</Text>
                  <Text style={styles.detailValue}>{result.clientCode}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Folio Number</Text>
                  <Text style={styles.detailValue}>{result.folioNumber}</Text>
                </View>
              </View>

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

      <Toast position="bottom" config={toastConfig} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 24,
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

  content: {
    flex: 1,
    paddingVertical: 20,
  },

  heading: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
  },

  input: {
    borderWidth: 0,
    fontSize: 16,
    fontFamily: "OutfitLight",
    color: "#929292",
    fontWeight: "400",
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 8,
  },

  submitButton: {
    backgroundColor: "#53BA83",
    borderRadius: 12,
    marginTop: 12,
    width: "100%",
    height: 60,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },

  submitButtonText: {
    fontSize: 18,
    color: "white",
    fontWeight: "600",
    fontFamily: "SfRegular",
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

  detailsBox: {
    width: "100%",
    backgroundColor: "#F4F4F4",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  detailLabel: {
    color: "#777",
    fontSize: 14,
    fontWeight: "500",
  },

  detailValue: {
    color: "#0B1B0C",
    fontSize: 14,
    fontWeight: "700",
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
    textAlign: "center",
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
});

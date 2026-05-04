import { useState, useEffect, useCallback, useRef } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { BaseUrl } from "../constants/baseUrl";
import { useColorScheme } from "@/hooks/useColorScheme";
import StompService from "../Services/webSocketConnection";
import { supabase } from "../supabaseConfig";
import * as CryptoJS from "crypto-js";
import { getEncryptionKey } from "../Services/encryptionkey";
import Toast from "react-native-toast-message";
import { useToastConfig } from "../Services/toastConfig";
import { useTheme } from "../hooks/ThemeContext";
import { Svg, Path } from "react-native-svg";

export default function Stockbuy() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const toastConfig = useToastConfig();

  const { symbol, order, prev, NumberOfShares } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState(order);
  const [selectedOrderType, setselectedOrderType] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [NumberofStocks, setNumberofStocks] = useState(NumberOfShares || "1");
  const [LimitPrice, setLimitPrice] = useState("");
  // const [StopLossPrice, setStopLossPrice] = useState("");
  const [SocketCloseData, setSocketCloseData] = useState([]);
  const [StockData, setStockData] = useState(); // Default tab
  const [SocketData, setSocketData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ClientPorfolio, setClientPorfolio] = useState([]);
  const [ClientData, setClientData] = useState([]);

  const [user, setUser] = useState(null);
  const [realtimeData, setRealtimeData] = useState({
    c: null, // current price
    pch: null, // percent change (raw from WS, usually small like 0.0123)
    ch: null, // absolute change
    v: null, // volume
    h: null, // high
    l: null, // low
    av: null,
    ap: null,
    bp: null,
    bv: null,
    isPositive: null,
    timestamp: null,
  });

  const priceAnim = useRef(new Animated.Value(1)).current;
  const changeAnim = useRef(new Animated.Value(1)).current;

  const formatPKR = (num) => {
    if (!num) return;
    const parts = Number(num).toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
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
      // Alert.alert("Error", err.message);
      console.log("Error", err.message);
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
      setClientData(data);
    } catch (err) {
      console.error("Fetch Client Code error:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchClientCode();
    }
  }, [user?.id]);

  const fetchClientPortfolio = async () => {
    try {
      const response = await fetch(
        "https://trade.iel.net.pk:1219/iel/portfolio",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientCode: ClientData?.cliendCode,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch client portfolio:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (!ClientData?.cliendCode) return;

    const loadPortfolio = async () => {
      try {
        setLoading(true);
        const data = await fetchClientPortfolio();
        setClientPorfolio(data?.detailInformation[0]);
      } catch (err) {
        setError(err.message || "Failed to load portfolio");
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();

    // Optional: return cleanup if needed (e.g. abort controller)
    // return () => { /* cleanup */ };
  }, [ClientData]);

  function byteaHexToNormalHex(byteaStr) {
    // byteaStr example: "\\x4c61686f7265313233"
    if (!byteaStr?.startsWith("\\x")) return null;

    const hex = byteaStr.slice(2); // remove \\x
    return hex; // "4c61686f7265313233"
  }

  function byteaToString(byteaStr) {
    if (!byteaStr || !byteaStr.startsWith("\\x")) {
      return null; // or throw error / return ''
    }

    // Remove the \\x prefix
    const hex = byteaStr.slice(2);

    // Convert hex string to byte array (Uint8Array)
    const bytes = new Uint8Array(
      hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)),
    );

    // Decode bytes as UTF-8 string (most passwords are ASCII/UTF-8)
    return new TextDecoder("utf-8").decode(bytes);
  }

  const getHeldQuantityForSymbol = (symbol) => {
    if (!ClientPorfolio?.holdings) return 0;

    const holding = ClientPorfolio.holdings.find(
      (h) => h.security?.toUpperCase() === symbol?.toUpperCase(),
    );

    return holding ? Number(holding.quantity) || 0 : 0;
  };

  const ConnectWebSocket = async () => {
    const sessionKey = await supabase.auth.getSession();

    if (selectedOrderType === "Limit" || selectedOrderType === "Stop") {
      if (!LimitPrice) {
        // );
        Toast.show({
          type: "error",
          text1: "Missing Price",
          text2: "Please enter a valid Price",
        });
        return; // ← STOP here — don't proceed
      }
    }

    // Also good to check number of shares (optional but recommended)
    if (!NumberofStocks) {
      // Alert.alert("Invalid Input", "Please enter a valid number of shares");
      Toast.show({
        type: "error",
        text1: "Missing Number of Shares",
        text2: "Please enter Number of Shares",
      });
      return;
    }

    if (activeTab === "Sell") {
      const heldQuantity = getHeldQuantityForSymbol(symbol);

      const requestedQuantity = parseInt(NumberofStocks, 10);

      if (heldQuantity === 0 || requestedQuantity > heldQuantity) {
        Toast.show({
          type: "error",
          text1: "Insufficient Holdings",
          text2: `You only own ${heldQuantity} shares of ${symbol}. You cannot sell ${requestedQuantity}.`,
        });
        return; // ← STOP here — don't proceed
      }
    }
    // const derivedKey = CryptoJS.PBKDF2(
    //   `${user.id}_${sessionKey.data.session?.access_token}`,
    //   "salty2026-secret",
    //   { keySize: 256 / 32, iterations: 10000 }
    // ).toString();
    // const derivedKey = await getEncryptionKey(user.id); // ← same function!

    // const bytes = CryptoJS.AES.decrypt(ClientData?.Password, derivedKey);
    // const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);

    const TextPassword = byteaToString(ClientData?.Password);
    console.log(TextPassword);

    await StompService.connect(ClientData?.cliendCode, TextPassword);
    router.push(
      `/ReviewOrder?order=${activeTab}&symbol=${symbol}&ShareNumber=${NumberofStocks}&selectedorderType=${getOrderTitle(selectedOrderType)}&trigger=${LimitPrice}`,
    );
  };

  // useEffect(async () => {
  //   // const username = "10020";
  //   // const password = "Lahore123";
  //  if (!ClientData?.cliendCode) return;
  //   await StompService.connect(ClientData?.cliendCode, ClientData?.Password);
  // }, [ClientData]);
  const router = useRouter();

  const getDescription = (type) => {
    switch (type) {
      case "Market":
        return "Execute immediately at current price";
      case "Limit":
        return "Set your desired execution price";
      case "Stop":
        return "Trigger sell at specified price";
      default:
        return "Select an order type";
    }
  };

  console.log(order);

  const getOrderTitle = (type) => {
    return type === "Stop"
      ? `${type} Loss Order`
      : type
        ? `${type} Order`
        : "Select Order Type";
  };

  const getButtonTitle = (type) => {
    return type === "Stop" ? `${type} Loss Order` : type ? `${type} Order` : "";
  };
  useEffect(() => {
    const fetchDataIfwebScoketClose = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${BaseUrl}/api/stocks/stock/latest-stock-data/?symbols=${symbol}`,
        );
        const data = await response.json();
        setSocketCloseData(data[0]?.data);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setSocketCloseData([]);
      }
    };

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${BaseUrl}/api/psxApi/stock-detail/detail/?stock=${symbol}`,
        );
        const data = await response.json();
        setStockData(data);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch stocks. Please try again later.");
        setLoading(false);
      }
    };
    fetchDataIfwebScoketClose();
    fetchDetail();
  }, [symbol]);

  const handleOrderSelect = (type) => {
    setselectedOrderType(type);
    setIsOpen(false);
  };

  const renderContent = () => {
    switch (selectedOrderType) {
      case "Market":
        return (
          <>
            <View style={{ marginHorizontal: 24, marginVertical: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  fontFamily: "SfRegular",
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  marginBottom: 12,
                }}
              >
                Number of Shares
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isDark ? "#FFFFFF1A" : "#ECECEC",
                  borderRadius: 4,
                  backgroundColor: isDark ? "#FFFFFF14" : "",
                  height: 56,
                  paddingLeft: 10,
                }}
              >
                <Image
                  source={require("../assets/icons/inputSearch.png")}
                  style={{ width: 40, height: 40 }}
                />
                <TextInput
                  style={[
                    styles.searchBar,
                    {
                      backgroundColor: isDark ? "transparent" : "#FFFFFF",
                      color: isDark ? "#E0E0E0" : "",
                    },
                  ]}
                  placeholder="Enter Number"
                  placeholderTextColor="#8A8A8A"
                  value={NumberofStocks}
                  // onChangeText={(text) => setNumberofStocks(text)}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, "");
                    setNumberofStocks(numericText);
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </>
        );

      case "Limit":
        return (
          <>
            <View style={{ marginHorizontal: 24, marginVertical: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  fontFamily: "SfRegular",
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  marginBottom: 12,
                }}
              >
                Number of Shares
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isDark ? "#FFFFFF1A" : "#ECECEC",
                  borderRadius: 4,
                  backgroundColor: isDark ? "#FFFFFF14" : "",

                  height: 56,
                  paddingLeft: 10,
                }}
              >
                <Image
                  source={require("../assets/icons/inputSearch.png")}
                  style={{ width: 40, height: 40 }}
                />
                <TextInput
                  style={[
                    styles.searchBar,
                    {
                      backgroundColor: isDark ? "transparent" : "#FFFFFF",
                      color: isDark ? "#E0E0E0" : "",
                    },
                  ]}
                  placeholder="Enter Number"
                  placeholderTextColor="#8A8A8A"
                  value={NumberofStocks}
                  // onChangeText={(text) => setNumberofStocks(text)}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, "");
                    setNumberofStocks(numericText);
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={{ marginHorizontal: 24, marginVertical: 10 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  fontFamily: "SfRegular",
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  marginBottom: 12,
                }}
              >
                Limit Price
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    fontFamily: "SfRegular",
                    color: colorScheme === "dark" ? "#E0E0E0" : "#0B1B0C",
                  }}
                >
                  Your Limit Price should be between{" "}
                  {(SocketCloseData?.last_day_close * 0.9).toFixed(2)} -{" "}
                  {(SocketCloseData?.last_day_close * 1.1).toFixed(2)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isDark ? "#FFFFFF1A" : "#ECECEC",
                  borderRadius: 4,
                  backgroundColor: isDark ? "#FFFFFF14" : "",

                  height: 56,
                  paddingLeft: 10,
                }}
              >
                <Image
                  source={require("../assets/icons/pkr_input.png")}
                  style={{ width: 54, height: 40 }}
                />
                <TextInput
                  style={[
                    styles.searchBar,
                    {
                      backgroundColor: isDark ? "transparent" : "#FFFFFF",
                      color: isDark ? "#E0E0E0" : "",
                    },
                  ]}
                  placeholder="Enter Number"
                  placeholderTextColor="#8A8A8A"
                  value={LimitPrice}
                  // onChangeText={(text) => setLimitPrice(text)}
                  // onChangeText={(text) => {
                  //   const numericText = text.replace(/[^0-9.]/g, "");
                  //   setLimitPrice(numericText);
                  // }}
                  onChangeText={(text) => {
                    // Allow only numbers and ONE decimal point
                    let numericText = text.replace(/[^0-9.]/g, "");

                    // Prevent multiple decimal points
                    const decimalCount = (numericText.match(/\./g) || [])
                      .length;
                    if (decimalCount > 1) {
                      // Remove the extra decimal points (keep only the first one)
                      numericText = numericText.replace(/\.+$/, ""); // remove trailing dots first
                      const parts = numericText.split(".");
                      numericText = parts[0] + "." + parts.slice(1).join(""); // keep only first dot
                    }

                    setLimitPrice(numericText);
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </>
        );

      case "Stop":
        return (
          <>
            <View style={{ marginHorizontal: 24, marginVertical: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  fontFamily: "SfRegular",
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  marginBottom: 12,
                }}
              >
                Number of Shares
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isDark ? "#FFFFFF1A" : "#ECECEC",
                  borderRadius: 4,
                  backgroundColor: isDark ? "#FFFFFF14" : "",

                  height: 56,
                  paddingLeft: 10,
                }}
              >
                <Image
                  source={require("../assets/icons/inputSearch.png")}
                  style={{ width: 40, height: 40 }}
                />
                <TextInput
                  style={[
                    styles.searchBar,
                    {
                      backgroundColor: isDark ? "transparent" : "#FFFFFF",
                      color: isDark ? "#E0E0E0" : "",
                    },
                  ]}
                  placeholder="Enter Number"
                  placeholderTextColor="#8A8A8A"
                  value={NumberofStocks}
                  // onChangeText={(text) => setNumberofStocks(text)}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, "");
                    setNumberofStocks(numericText);
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={{ marginHorizontal: 24, marginVertical: 10 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  fontFamily: "SfRegular",
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  marginBottom: 12,
                }}
              >
                Stop Loss Price
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isDark ? "#FFFFFF1A" : "#ECECEC",
                  borderRadius: 4,
                  backgroundColor: isDark ? "#FFFFFF14" : "",

                  height: 56,
                  paddingLeft: 10,
                }}
              >
                <Image
                  source={require("../assets/icons/pkr_input.png")}
                  style={{ width: 54, height: 40 }}
                />
                <TextInput
                  style={[
                    styles.searchBar,
                    {
                      backgroundColor: isDark ? "transparent" : "#FFFFFF",
                      color: isDark ? "#E0E0E0" : "",
                    },
                  ]}
                  placeholder="Enter Number"
                  placeholderTextColor="#8A8A8A"
                  // value={StopLossPrice}
                  // onChangeText={(text) => setStopLossPrice(text)}
                  value={LimitPrice}
                  // onChangeText={(text) => setLimitPrice(text)}

                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9.]/g, "");
                    setLimitPrice(numericText);
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </>
        );

      default:
        return null;
    }
  };

  const formatLargeNumber = (number, decimals = 2) => {
    if (!number || isNaN(number)) return "0";
    const num = Number(number);
    const absNum = Math.abs(num);
    // Under 1 million - show full number
    if (absNum < 1000000) {
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      });
    }
    // 1 million to 1 billion - show in millions
    if (absNum < 1000000000) {
      const millions = num / 1000000;
      return `${millions.toFixed(decimals)}M`;
    }
    // Over 1 billion - show in billions
    const billions = num / 1000000000;
    return `${billions.toFixed(decimals)}B`;
  };
  const formatLargeNumberNew = (number, decimals = 2) => {
    if (!number || isNaN(number)) return "0";
    const num = Number(number);
    const absNum = Math.abs(num);
    // Under 1 million - show full number
    if (absNum < 1000000) {
      return num.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    // 1 million to 1 billion - show in millions
    if (absNum < 1000000000) {
      const millions = num / 1000000;
      return `${millions.toFixed(decimals)}M`;
    }
    // Over 1 billion - show in billions
    const billions = num / 1000000000;
    return `${billions.toFixed(decimals)}B`;
  };

  useEffect(() => {
    if (!symbol) return;

    let websocket = null;
    let reconnectTimer = null;
    const connect = () => {
      // Close any existing websocket to prevent multiple connections
      if (websocket) {
        websocket.close();
      }

      websocket = new WebSocket("wss://feed.iel.net.pk");

      // Important: Handle binary data properly
      websocket.binaryType = "arraybuffer";

      websocket.onopen = () => {
        console.log("[WS] ✅ Connected → subscribing to symbols");

        // Subscribe to main symbol + all relevant stocks
        const symbolsToSubscribe = [symbol];
        const subscribeMsg = {
          type: "subscribe",
          symbols: symbolsToSubscribe.filter(Boolean), // remove null/undefined/empty
        };

        websocket.send(JSON.stringify(subscribeMsg));
        console.log(
          "[WS] 📤 Subscribed to:",
          symbolsToSubscribe.filter(Boolean),
        );
      };

      // Updated onmessage with async binary handling
      websocket.onmessage = async (event) => {
        let textData;

        try {
          // Handle both binary (Blob) and text data
          if (event.data instanceof Blob) {
            textData = await event.data.text();
            // console.log("[WS] 📥 Received binary Blob data");
          } else if (typeof event.data === "string") {
            textData = event.data;
            // console.log("[WS] 📥 Received text data");
          } else if (event.data instanceof ArrayBuffer) {
            const decoder = new TextDecoder("utf-8");
            textData = decoder.decode(event.data);
            console.log("[WS] 📥 Received ArrayBuffer");
          } else {
            console.warn("[WS] ⚠️ Unknown data type:", typeof event.data);
            return;
          }

          const msg = JSON.parse(textData);

          console.log("[WS] Received message Stock detail:", msg);

          // Handle tick data
          if (msg?.type === "tick" && msg?.data?.s) {
            const tick = msg.data;
            const sym = tick.s;

            const newPrice = Number(tick.c);
            const newPchRaw = Number(tick.pch || 0);
            const newPchPercent = newPchRaw * 100;
            const newChange = Number(tick.ch || 0);
            const newVolume = Number(tick.v || 0);

            const isPos = newPchRaw >= 0;

            // Update main stock realtime
            if (sym === symbol) {
              const priceChanged =
                Math.abs((realtimeData.c || 0) - newPrice) > 0.001;
              const changeChanged =
                Math.abs((realtimeData.pch || 0) - newPchPercent) > 0.005;

              if (priceChanged || changeChanged) {
                // Price animation
                Animated.sequence([
                  Animated.timing(priceAnim, {
                    toValue: 1.12,
                    duration: 120,
                    useNativeDriver: true,
                  }),
                  Animated.timing(priceAnim, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                  }),
                ]).start();

                // Change animation
                Animated.sequence([
                  Animated.timing(changeAnim, {
                    toValue: 1.08,
                    duration: 140,
                    useNativeDriver: true,
                  }),
                  Animated.timing(changeAnim, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true,
                  }),
                ]).start();
              }

              setRealtimeData({
                c: newPrice,
                pch: newPchPercent,
                ch: newChange,
                v: newVolume,
                h: Number(tick.h || realtimeData.h),
                l: Number(tick.l || realtimeData.l),
                av: Number(tick.av || 0),
                ap: Number(tick.ap || 0),
                bp: Number(tick.bp || 0),
                bv: Number(tick.bv || 0),
                isPositive: isPos,
                timestamp: tick.t || Date.now(),
              });
            }
          }
        } catch (err) {
          console.error("[WS] ❌ Parse/processing error:", err);

          // Debug raw data when JSON parse fails
          try {
            if (event.data instanceof Blob) {
              const rawPreview = await event.data.text();
              console.log(
                "[WS] Raw Blob preview:",
                rawPreview.substring(0, 250),
              );
            } else if (typeof event.data === "string") {
              console.log(
                "[WS] Raw message preview:",
                event.data.substring(0, 250),
              );
            }
          } catch (_) {}
        }
      };

      websocket.onerror = (e) => {
        console.error("[WS] ❌ WebSocket error:", e);
      };

      websocket.onclose = (e) => {
        console.log(`[WS] 🔌 Disconnected (code: ${e.code})`);

        // Reconnect only on abnormal close
        if (e.code !== 1000) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };
    };
    connect();

    return () => {
      if (websocket) websocket.close(1000, "Screen unmount");
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [symbol]);

  console.log("Type:", typeof NumberofStocks, "Value:", NumberofStocks);

  const handleBackClick = () => {
    if (prev === "ClientForm") {
      router.push(`StockDetail?symbol=${symbol}`);
    } else {
      router.back();
    }
  };
  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
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
                paddingHorizontal: 24,
                paddingVertical: 12,
                justifyContent: "space-between",
              }}
            >
              <TouchableOpacity onPress={handleBackClick}>
                <Image
                  source={
                    isDark
                      ? require("../assets/icons/white_back_icon.png")
                      : require("../assets/icons/back_icon.png")
                  }
                  style={{ width: 8, height: 12 }}
                />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: "SfRegular",
                    fontWeight: "600",
                    fontSize: 24,
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                    textAlign: "center", // Centers text horizontally within its container
                  }}
                >
                  Trade
                </Text>
              </View>
              <View style={{ width: 8 }} />{" "}
            </View>

            <View
              style={{
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: 8,
                // borderBottomColor: isDark ? "#FFFFFF1A" : "#E0E0E0",
                // borderBottomWidth: 1,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontWeight: "400",
                    fontSize: 16,
                    fontFamily: "SfRegular",
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                  }}
                >
                  {symbol}
                </Text>
                <Text
                  style={{
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      fontFamily: "SfRegular",
                      color: "#8A8A8A",
                    }}
                  >
                    PKR
                  </Text>{" "}
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "700",
                      marginLeft: 2,
                      fontFamily: "SfRegular",
                    }}
                  >
                    {formatLargeNumber(
                      realtimeData?.c || SocketCloseData?.close_price,
                    )}
                  </Text>
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 6,
                }}
              >
                <Text
                  style={{
                    fontWeight: "400",
                    fontSize: 14,
                    fontFamily: "SfRegular",
                    color: "#6B7280",
                    width: "60%",
                  }}
                >
                  {StockData?.name} • PSX
                </Text>
                <View
                  style={{
                    width: "40%",
                    flexDirection: "row", // now this works
                    justifyContent: "flex-end", // pushes content to the right
                    alignItems: "center", // vertical alignment at bottom
                  }}
                >
                  <View style={{ marginRight: 3 }}>
                    {isDark ? (
                      realtimeData?.pch > 0 ||
                      SocketCloseData?.percent_change > 0 ? (
                        <Svg
                          width="12"
                          height="10"
                          viewBox="0 0 7 6"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <Path
                            d="M2.66586 0.25C2.85831 -0.0833337 3.33944 -0.0833333 3.53189 0.25L6.12997 4.75C6.32242 5.08333 6.08185 5.5 5.69695 5.5H0.5008C0.1159 5.5 -0.124662 5.08333 0.0677881 4.75L2.66586 0.25Z"
                            fill="#3FB950"
                          />
                        </Svg>
                      ) : (
                        <Svg
                          width="12"
                          height="10"
                          viewBox="0 0 7 6"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <Path
                            d="M3.53189 5.25C3.33944 5.58333 2.85831 5.58333 2.66586 5.25L0.0677876 0.75C-0.124662 0.416667 0.115901 0 0.500801 0H5.69695C6.08185 0 6.32242 0.416667 6.12997 0.75L3.53189 5.25Z"
                            fill="#FF6B6B"
                          />
                        </Svg>
                      )
                    ) : realtimeData?.pch > 0 ||
                      SocketCloseData?.percent_change > 0 ? (
                      <Svg
                        width="12"
                        height="10"
                        viewBox="0 0 7 6"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <Path
                          d="M2.66586 0.25C2.85831 -0.0833337 3.33944 -0.0833333 3.53189 0.25L6.12997 4.75C6.32242 5.08333 6.08185 5.5 5.69695 5.5H0.5008C0.1159 5.5 -0.124662 5.08333 0.0677881 4.75L2.66586 0.25Z"
                          fill="#3FB950"
                        />
                      </Svg>
                    ) : (
                      <Svg
                        width="12"
                        height="10"
                        viewBox="0 0 7 6"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <Path
                          d="M3.53189 5.25C3.33944 5.58333 2.85831 5.58333 2.66586 5.25L0.0677876 0.75C-0.124662 0.416667 0.115901 0 0.500801 0H5.69695C6.08185 0 6.32242 0.416667 6.12997 0.75L3.53189 5.25Z"
                          fill="#E00000"
                        />
                      </Svg>
                    )}
                  </View>
                  <Text
                    style={{
                      color:
                        realtimeData?.pch > 0 ||
                        SocketCloseData?.percent_change > 0
                          ? "#3FB950"
                          : "#FF6B6B",
                      fontWeight: "600",
                      fontFamily: "SfRegular",
                      fontSize: 14,
                    }}
                  >
                    {formatLargeNumber(
                      Math.abs(realtimeData?.ch) ||
                        Math.abs(SocketCloseData?.change),
                    )}{" "}
                    (
                    {(
                      Math.abs(realtimeData?.pch) ||
                      Math.abs(SocketCloseData?.percent_change) * 100
                    ).toFixed(2) + "%"}{" "}
                    )
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ marginHorizontal: 24, marginTop: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  gap: 55,
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#8A8A8A",
                      fontWeight: "600",
                    }}
                  >
                    High
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: isDark ? "#FFFFFF" : "#0B1B0C",
                      marginTop: 4,
                    }}
                  >
                    {formatLargeNumberNew(
                      realtimeData?.h || SocketCloseData?.high_price,
                    )}
                  </Text>
                </View>

                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#8A8A8A",
                      fontWeight: "600",
                    }}
                  >
                    Low
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: isDark ? "#FFFFFF" : "#0B1B0C",
                      marginTop: 4,
                    }}
                  >
                    {formatLargeNumberNew(
                      realtimeData?.l || SocketCloseData?.low_price,
                    )}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 10,
                }}
              >
                {/* Bid */}
                <View
                  style={{
                    flexDirection: "row",
                    // gap: 30,
                    justifyContent: "space-between",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#8A8A8A",
                        fontWeight: "600",
                      }}
                    >
                      Bid Price
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: isDark ? "#FFFFFF" : "#0B1B0C",
                        marginTop: 4,
                      }}
                    >
                      {formatLargeNumberNew(
                        realtimeData?.bp || SocketCloseData?.bid_price,
                      )}
                    </Text>
                  </View>

                  <View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#8A8A8A",
                        fontWeight: "600",
                      }}
                    >
                      Bid Volume
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: isDark ? "#FFFFFF" : "#0B1B0C",
                        marginTop: 4,
                      }}
                    >
                      {formatLargeNumber(
                        realtimeData?.bv || SocketCloseData?.bid_volume,
                      )}
                    </Text>
                  </View>

                  <View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#8A8A8A",
                        fontWeight: "600",
                      }}
                    >
                      Ask Price
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: isDark ? "#FFFFFF" : "#0B1B0C",
                        marginTop: 4,
                      }}
                    >
                      {formatLargeNumberNew(
                        realtimeData?.ap || SocketCloseData?.ask_price,
                      )}
                    </Text>
                  </View>

                  <View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#8A8A8A",
                        fontWeight: "600",
                      }}
                    >
                      Ask Volume
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: isDark ? "#FFFFFF" : "#0B1B0C",
                        marginTop: 4,
                      }}
                    >
                      {formatLargeNumber(
                        realtimeData?.av || SocketCloseData?.ask_volume,
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? "#222222" : "#F9F9F9",
                borderRadius: 14,
                borderWidth: isDark ? 0 : 1,
                borderColor: "#E0E0E0",
                padding: 5,
                marginHorizontal: 24,
                marginTop: 20,
              }}
            >
              {/* Watchlist Button */}
              <TouchableOpacity
                onPress={() => setActiveTab("Buy")}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  justifyContent: "center",
                  backgroundColor:
                    activeTab === "Buy" ? "#53BA83" : "transparent",
                  borderRadius: 10,
                  paddingVertical: 9,
                  alignItems: "center",
                }}
              >
                {activeTab === "Buy" ? (
                  <Image
                    source={require("../assets/icons/basket_icon.png")}
                    style={{ width: 16, height: 16 }}
                  />
                ) : (
                  <Image
                    source={require("../assets/icons/basket_black_icon.png")}
                    style={{ width: 16, height: 16 }}
                  />
                )}
                <Text
                  style={{
                    color:
                      activeTab === "Buy"
                        ? "#fff"
                        : isDark
                          ? "#fff"
                          : "#0B1B0C",
                    fontSize: 14,
                    fontWeight: "600",
                    fontFamily: "SfRegular",
                    paddingHorizontal: 10,
                  }}
                >
                  Buy
                </Text>
              </TouchableOpacity>

              {/* Briefing Button */}
              <TouchableOpacity
                onPress={() => setActiveTab("Sell")}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  justifyContent: "center",
                  backgroundColor:
                    activeTab === "Sell" ? "#FB2C36" : "transparent",
                  borderRadius: 10,
                  paddingVertical: 9,
                  alignItems: "center",
                }}
              >
                {activeTab === "Sell" ? (
                  <Image
                    source={require("../assets/icons/sell_white_icon.png")}
                    style={{ width: 16, height: 16 }}
                  />
                ) : (
                  <Image
                    source={require("../assets/icons/sell_icon.png")}
                    style={{ width: 16, height: 16 }}
                  />
                )}

                <Text
                  style={{
                    color:
                      activeTab === "Sell"
                        ? "#fff"
                        : isDark
                          ? "#fff"
                          : "#0B1B0C",
                    fontSize: 14,
                    fontWeight: "600",
                    fontFamily: "SfRegular",
                    paddingHorizontal: 10,
                  }}
                >
                  Sell
                </Text>
              </TouchableOpacity>
            </View>

            {/* Available Balanace */}

            <View
              style={{
                marginHorizontal: 24,
                marginTop: 24,
                backgroundColor: isDark ? "#53BA831A" : "#53BA830D",
                paddingHorizontal: 20,
                paddingVertical: 24,
                borderRadius: 16,
                borderWidth: 0.64,
                borderColor: "#53BA8333",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={require("../assets/icons/data_new_icon.png")}
                  style={{ width: 40, height: 40 }}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text
                    style={{
                      fontWeight: "400",
                      fontFamily: "SfRegular",
                      fontSize: 16,
                      color: isDark ? "#8A8A8A" : "#6B7280",
                    }}
                  >
                    Available Balance
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "400" }}>PKR</Text>{" "}
                    <Text
                      style={{ marginLeft: 2, fontSize: 20, fontWeight: "500" }}
                    >
                      {/* 25,000 */}
                      {formatPKR(ClientPorfolio?.portfolio?.cashUnblocked) || 0}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* OrderTypes Dropdown */}
            <View style={{ marginTop: 24, paddingHorizontal: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  fontFamily: "SfRegular",
                }}
              >
                Order Type
              </Text>

              <TouchableOpacity
                style={{
                  borderWidth: 0.58,
                  borderColor: isDark ? "#FFFFFF1A" : "#E0E0E0",
                  backgroundColor: isDark ? "#FFFFFF14" : "#FFFFFF",
                  // shadowColor: "#000000",
                  // shadowOffset: { width: 0, height: 2 },
                  // shadowOpacity: 0.1,
                  // shadowRadius: 8,
                  // elevation: 3,
                  borderRadius: 12,
                  marginTop: 12,
                }}
                onPress={() => setIsOpen(!isOpen)}
                activeOpacity={1}
              >
                {/* Header */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "SfRegular",
                        fontWeight: "400",
                        fontSize: 18,
                        color: isDark ? "#E0E0E0" : "#0B1B0C",
                      }}
                    >
                      {getOrderTitle(selectedOrderType)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "400",
                        fontFamily: "SfRegular",
                        color: isDark ? "#8A8A8A" : "#6A7282",
                      }}
                    >
                      {getDescription(selectedOrderType)}
                    </Text>
                  </View>
                  {/* <Text
                style={{
                  fontSize: 20,
                  color: "#6A7282",
                  marginLeft: 8,
                  transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
                }}
              >
                ▼
              </Text> */}
                  {isOpen ? (
                    <Image
                      source={require("../assets/icons/open_dropdown.png")}
                      style={{ width: 16, height: 16 }}
                    />
                  ) : (
                    <Image
                      source={require("../assets/icons/close_dropdown.png")}
                      style={{ width: 16, height: 16 }}
                    />
                  )}
                </View>

                {/* Options - only show when open */}
                {isOpen && (
                  <>
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                      }}
                      onPress={() => handleOrderSelect("Market")}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: "SfRegular",
                            fontWeight: "400",
                            fontSize: 18,
                            color: isDark ? "#E0E0E0" : "#0B1B0C",
                          }}
                        >
                          Market Order
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "400",
                            fontFamily: "SfRegular",
                            color: isDark ? "#8A8A8A" : "#6A7282",
                          }}
                        >
                          Execute immediately at current price
                        </Text>
                      </View>
                      {selectedOrderType === "Market" && (
                        <Image
                          source={require("../assets/icons/new_tick.png")}
                          style={{ width: 20, height: 20, marginLeft: 8 }}
                        />
                      )}
                    </TouchableOpacity>

                    <View
                      style={{
                        borderTopWidth: 0.58,
                        borderTopColor: isDark ? "#FFFFFF1A" : "#E0E0E0",
                      }}
                    />
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                      }}
                      onPress={() => handleOrderSelect("Limit")}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: "SfRegular",
                            fontWeight: "400",
                            fontSize: 18,
                            color: isDark ? "#E0E0E0" : "#0B1B0C",
                          }}
                        >
                          Limit Order
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "400",
                            fontFamily: "SfRegular",
                            color: isDark ? "#8A8A8A" : "#6A7282",
                          }}
                        >
                          Set your desired execution price
                        </Text>
                      </View>
                      {selectedOrderType === "Limit" && (
                        <Image
                          source={require("../assets/icons/new_tick.png")}
                          style={{ width: 20, height: 20, marginLeft: 8 }}
                        />
                      )}
                    </TouchableOpacity>

                    <View
                      style={{
                        borderTopWidth: 0.58,
                        borderTopColor: isDark ? "#FFFFFF1A" : "#E0E0E0",
                      }}
                    />
                    {/* <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                    }}
                    onPress={() => handleOrderSelect("Stop")}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "SfRegular",
                          fontWeight: "400",
                          fontSize: 18,
                          color: isDark ? "#E0E0E0" : "#0B1B0C",
                        }}
                      >
                        Stop Loss Order
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "400",
                          fontFamily: "SfRegular",
                          color: isDark ? "#8A8A8A" : "#6A7282",
                        }}
                      >
                        Trigger sell at specified price
                      </Text>
                    </View>
                    {selectedOrderType === "Stop" && (
                      <Image
                        source={require("../assets/icons/new_tick.png")}
                        style={{ width: 20, height: 20, marginLeft: 8 }}
                      />
                    )}
                  </TouchableOpacity> */}
                  </>
                )}
              </TouchableOpacity>
            </View>
            {renderContent()}

            {/* <View
          style={{
            marginHorizontal: 24,
            backgroundColor: isDark ? "#FFFFFF14" : "#FFFFFF",
            borderRadius: 12,
            borderWidth: 0.58,
            borderColor: isDark ? "#FFFFFF1A" : "#E0E0E0",
            marginTop: 12,
            padding: 14,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: isDark ? "#E0E0E0" : "#0B1B0C",
              fontFamily: "SfRegular",
            }}
          >
            Order Summary
          </Text>

          {(() => {
            const shares = Number(NumberofStocks) || 0;
            const price = Number(SocketCloseData?.close_price) || 0;
            const subtotal = shares * price;
            const fee = subtotal * 0.001;
            const total = subtotal + fee;

            return (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "400",
                      fontFamily: "SfRegular",
                      color: "#6B7280",
                    }}
                  >
                    Subtotal
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "400",
                      fontFamily: "SfRegular",
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    PKR {formatLargeNumber(subtotal, 2)}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 12,
                    borderBottomWidth: 0.58,
                    borderBottomColor:
                      isDark ? "#FFFFFF1A" : "#E0E0E0",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "400",
                      fontFamily: "SfRegular",
                      color: "#6B7280",
                    }}
                  >
                    Trading Fee (0.1%)
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "400",
                      fontFamily: "SfRegular",
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    PKR {formatLargeNumber(fee, 2)}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "400",
                      fontFamily: "SfRegular",
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    Total Cost
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                      fontWeight: "400",
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>PKR</Text>
                    <Text style={{ fontSize: 20, marginLeft: 4 }}>
                      {formatLargeNumber(total, 2)}
                    </Text>
                  </Text>
                </View>
              </>
            );
          })()}
        </View> */}

            {/* Review Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={ConnectWebSocket}
            >
              <Text style={styles.loginButtonText}>
                Review {getButtonTitle(selectedOrderType)}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast position="bottom" config={toastConfig} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#fff",
    paddingTop: 50,
    marginBottom: 100,
  },
  scrollView: {
    flex: 1,
    // backgroundColor: "#fff",
  },
  searchBar: {
    flex: 1,
    marginTop: 10,
    // height: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,

    fontFamily: "SfRegular",
  },
  loginButton: {
    marginHorizontal: 24,
    backgroundColor: "#58BA83",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 24,
    width: "full",
    // position: "absolute",
    // bottom: 100,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "SfRegular",
    fontWeight: "600",
  },
});

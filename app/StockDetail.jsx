import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
} from "react-native";
// import OverViewGraph from "../components/Overviewgraph";
import OverViewGraph from "../components/OverViewGraph";
import OverViewLineGraph from "../components/OverVuewLineGraph";
import { useLocalSearchParams } from "expo-router";
import { BaseUrl, SocketUrl } from "../constants/baseUrl";
import { useRouter } from "expo-router";
import { supabase } from "../supabaseConfig";
import { parse } from "date-fns";
import { Svg, Path } from "react-native-svg";
// import ChatBotScreen from "../.."
import ChatBotScreen from "../components/Chatbot";
import { StockLogo } from "../components/StockLogo";
import Toast from "react-native-toast-message";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useToastConfig } from "../Services/toastConfig";
import NewUrlGraph from "../components/NewUrlGraph";
import { useTheme } from "../hooks/ThemeContext";

export default function StockDetail() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const toastConfig = useToastConfig();

  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const { symbol, previousPage } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState("Details"); // Default tab
  const [activeGraphTab, setActiveGraphTab] = useState("line"); // Default tab
  const [StockData, setStockData] = useState(); // Default tab
  const [StatisticsData, setStatisticsData] = useState();
  const [EssentialNumbersData, setEssentialNumbersData] = useState();
  const [EssentialRatioData, setEssentialRatioData] = useState();
  const [ReleventStockData, setReleventStockData] = useState();
  const [FundamentalsData, setFundamentalsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketError, setSocketError] = useState(null);
  const [ws, setWs] = useState(null);
  const [SocketData, setSocketData] = useState([]);
  const [SocketCloseData, setSocketCloseData] = useState([]);
  const [SymboleData, setSymboleDate] = useState();
  const [userId, setUserId] = useState(null);
  const [watchlistSymbols, setWatchlistSymbols] = useState(new Set());
  const [profileuser, setprofileUser] = useState(null);
  const [GraphUrl, setGraphUrl] = useState(null);
  const [realtimeRelevant, setRealtimeRelevant] = useState({});
  const [fallbackRelevantData, setFallbackRelevantData] = useState({});
  const [relevantSymbols, setRelevantSymbols] = useState([]);
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

  const ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeG1mYWFrdWZybXpjeGh0Z2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTQzMTIsImV4cCI6MjA3NTM5MDMxMn0.qtNn0qXNhn8ol8fTSb2Hp9nQkYfFA2Y_Zec4LuISPZQ";
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id);
    };
    fetchUser();
  }, []);

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
        setIsConnected(true);
        console.log("[WS] ✅ Connected → subscribing to symbols");

        // Subscribe to main symbol + all relevant stocks
        const symbolsToSubscribe = [symbol, ...relevantSymbols];
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
          if (
           
            msg?.type === "tick" &&
            msg?.data?.s
          ) {
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
            // Update relevant stocks
            else {
              setRealtimeRelevant((prev) => ({
                ...prev,
                [sym]: {
                  c: newPrice,
                  pch: newPchPercent,
                  ch: newChange,
                  v: newVolume,
                  isPositive: isPos,
                  timestamp: tick.t || Date.now(),
                },
              }));
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
        setIsConnected(false);
      };

      websocket.onclose = (e) => {
        setIsConnected(false);
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
      setIsConnected(false);
    };
  }, [symbol, relevantSymbols]); // ← important: re-subscribe when relevant symbols change

  const fetchProfileUser = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*") // Explicitly select all fields to ensure "all data"
        .eq("id", userId)
        .maybeSingle(); // Use .maybeSingle() instead of .single() – returns data=null on zero rows, no error

      if (error) {
        console.error("Error fetching profile:", error);
        // Optionally: Create a default profile if not found
        if (error.code === "PGRST116") {
          await supabase
            .from("profiles")
            .insert({ id: userId /* default fields */ });
          // Retry fetch
          return fetchProfileUser();
        }
      } else {
        setprofileUser(data ?? null); // Fallback to null if missing
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchProfileUser();
      }
    }, [userId, fetchProfileUser]), // ← dependencies here
  );

  const fetchWatchlist = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("watchlist")
        .select("symbol")
        .eq("userid", userId);
      if (error) {
        console.error("Error fetching watchlist:", error);
      } else {
        const symbols = new Set(data?.map((d) => d.symbol) || []);
        setWatchlistSymbols(symbols);
      }
    } catch (err) {
      console.error("Fetch watchlist error:", err);
    }
  }, [userId]);
  const addToWatchlist = useCallback(
    async (symbol) => {
      if (!userId) {
        console.error("No user ID available");
        return;
      }
      try {
        const { error } = await supabase
          .from("watchlist")
          .insert([{ userid: userId, symbol }]);
        if (error) {
          if (error.code === "23505") {
            console.log("Symbol already in watchlist");
          } else {
            alert(error.message);
          }
        } else {
          setWatchlistSymbols((prev) => new Set([...prev, symbol]));
          Toast.show({
            type: "success",
            text1: "Watchlist Added",
            text2: "Watchlist Added Successfully",
          });
        }
      } catch (err) {
        console.error("Add to watchlist error:", err);
        alert("Failed to add to watchlist");
      }
    },
    [userId],
  );
  const fetchSymboleData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("economic_calender")
        .select("date")
        .eq("symbol", symbol);
      if (error) {
        console.error("Error fetching watchlist:", error);
      } else {
        setSymboleDate(data[0]);
      }
    } catch (err) {
      console.error("Fetch watchlist error:", err);
    }
  }, [symbol]);
  useEffect(() => {
    fetchSymboleData();
    fetchWatchlist();
  }, [fetchWatchlist]);
  const RangeDisplay = ({ low, high, label }) => (
    <View style={styles.rangeContainer}>
      {/* Top row: Low | Label | High */}
      <View style={styles.topRow}>
        <Text
          style={[styles.valueText, { color: isDark ? "#E0E0E0" : "#000" }]}
        >
          {low}
        </Text>
        <Text style={styles.labelText}>{label}</Text>
        <Text
          style={[styles.valueText, { color: isDark ? "#E0E0E0" : "#000" }]}
        >
          {high}
        </Text>
      </View>
      {/* Slider Bar */}
      <View style={styles.sliderContainer}>
        <View style={styles.sliderTrack}>
          <View style={styles.sliderLeft} />
          <View style={styles.sliderThumb} />
          <View style={styles.sliderRight} />
        </View>
      </View>
    </View>
  );
  useEffect(() => {
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
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${BaseUrl}/api/psxApi/stock-detail/key-statistics/?symbol=${symbol}`,
        );
        const data = await response.json();
        setStatisticsData(data?.key_statistics);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    const fetchEssentialNumbers = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${BaseUrl}/api/psxApi/stock-detail/essential-numbers/?symbol=${symbol}`,
        );
        const data = await response.json();
        setEssentialNumbersData(data?.data[0]);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    const fetchEssentialRatio = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          // `${BaseUrl}/api/psxApi/home/essential-ratio/?symbol=${symbol}`,
          `${BaseUrl}/api/psxApi/financials/fundamentals/?symbol=${symbol}`,
        );
        const data = await response.json();
        setEssentialRatioData(data?.data[0]);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    const fetchRevelentStocks = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${BaseUrl}/api/psxApi/stock-detail/sector-stocks/?stock=${symbol}`,
        );
        const data = await response.json();
        const stocks = data?.stocks || [];
        setReleventStockData(stocks);
        setRelevantSymbols(stocks.map((s) => s.symbol));
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setReleventStockData([]);
      }
    };
    const fetchFundamentals = async (symbol) => {
      try {
        const response = await fetch(
          `https://bfxmfaakufrmzcxhtgfw.supabase.co/functions/v1/rapid-task?symbol=${symbol}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${ANON_KEY}`,
              "Content-Type": "application/json",
            },
          },
        );
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        return result.data; // The fundamentals JSON
      } catch (err) {
        console.error("Error:", err);
      }
    };
    const fetchIncomeQuarterly = async (symbol) => {
      try {
        const response = await fetch(
          `https://bfxmfaakufrmzcxhtgfw.supabase.co/functions/v1/smart-responder?symbol=${symbol}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${ANON_KEY}`,
              "Content-Type": "application/json",
            },
          },
        );
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        return result.data; // The fundamentals JSON
      } catch (err) {
        console.error("Error:", err);
      }
    };
    const fetchIncomeAnnualy = async (symbol) => {
      try {
        const response = await fetch(
          `https://bfxmfaakufrmzcxhtgfw.supabase.co/functions/v1/smart-handler?symbol=${symbol}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${ANON_KEY}`,
              "Content-Type": "application/json",
            },
          },
        );
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        return result.data; // The fundamentals JSON
      } catch (err) {
        console.error("Error:", err);
      }
    };
    const fetchBalanceQuarterly = async (symbol) => {
      try {
        const response = await fetch(
          `https://bfxmfaakufrmzcxhtgfw.supabase.co/functions/v1/hyper-worker?symbol=${symbol}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${ANON_KEY}`,
              "Content-Type": "application/json",
            },
          },
        );
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        return result.data; // The fundamentals JSON
      } catch (err) {
        console.error("Error:", err);
      }
    };
    const fetchBalanceAnnualy = async (symbol) => {
      try {
        const response = await fetch(
          `https://bfxmfaakufrmzcxhtgfw.supabase.co/functions/v1/quick-responder?symbol=${symbol}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${ANON_KEY}`,
              "Content-Type": "application/json",
            },
          },
        );
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        return result.data; // The fundamentals JSON
      } catch (err) {
        console.error("Error:", err);
      }
    };
    fetchDetail();
    fetchStatistics();
    fetchEssentialNumbers();
    fetchEssentialRatio();
    fetchRevelentStocks();
    fetchFundamentals(symbol);
    fetchIncomeQuarterly(symbol);
    fetchIncomeAnnualy(symbol);
    fetchBalanceQuarterly(symbol);
    fetchBalanceAnnualy(symbol);
  }, [symbol]);
  // useEffect(() => {
  //   const fetchDataIfwebScoketClose = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await fetch(
  //         `${BaseUrl}/api/stocks/stock/latest-stock-data/?symbols=${symbol}`,
  //       );
  //       const data = await response.json();
  //       setSocketCloseData(data[0]?.data);
  //       setLoading(false);
  //     } catch (err) {
  //       setLoading(false);
  //       setSocketCloseData([]);
  //     }
  //   };
  //   fetchDataIfwebScoketClose();
  // }, [symbol]);

  // Fetch fallback data when WebSocket is not giving live updates
  useEffect(() => {
    const fetchFallbackData = async () => {
      if (!symbol) return;

      try {
        // Combine main symbol + all relevant symbols
        const allSymbols = [symbol, ...relevantSymbols];
        const uniqueSymbols = [...new Set(allSymbols)]; // Remove duplicates

        const symbolsParam = uniqueSymbols.join(",");

        const response = await fetch(
          `${BaseUrl}/api/stocks/stock/latest-stock-data/?symbols=${symbolsParam}`,
        );

        const result = await response.json();

        // Assuming API returns array of objects
        const dataArray = Array.isArray(result) ? result : [];

        const fallbackMap = {};

        dataArray.forEach((item) => {
          if (item?.symbol || item?.data?.symbol) {
            const stockData = item.data || item;
            fallbackMap[stockData.symbol || item.symbol] = stockData;
          }
        });

        setFallbackRelevantData(fallbackMap);
        setSocketCloseData(fallbackMap[symbol] || {}); // Main symbol fallback

        console.log(
          "Fallback data loaded for symbols:",
          Object.keys(fallbackMap),
        );
      } catch (err) {
        console.error("Failed to fetch fallback stock data:", err);
        setFallbackRelevantData({});
      }
    };

    // Fetch fallback data after relevant symbols are loaded
    if (relevantSymbols.length > 0) {
      fetchFallbackData();
    }
  }, [symbol, relevantSymbols]); // Re-run when relevant symbols change
  const formatDate = (dateString) => {
    // Default date if none provided
    const defaultDate = "20/11/2024";
    if (!dateString) return defaultDate;
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) return defaultDate;
    const day = date.getDate();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}`;
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
  const handleStockPress = (symbol) => {
    try {
      router.push(`/StockDetail?symbol=${symbol}`);
    } catch (err) {
      console.error("Navigation error:", err);
    }
  };
  // const renderTrendingStocks = ({ item }) => (
  //   <TouchableOpacity
  //     style={{
  //       flexDirection: "row",
  //       alignItems: "center",
  //       width: 70,
  //     }}
  //     onPress={() => handleStockPress(item.symbol)}
  //   >
  //     <View
  //       style={{
  //         flexDirection: "column",
  //         justifyContent: "center",
  //         alignItems: "center",
  //       }}
  //     >
  //       {/* <View
  //         style={{
  //           width: 60,
  //           height: 60,
  //           justifyContent: "center",
  //           alignItems: "center",
  //           backgroundColor: item.bgColor,
  //           paddingTop: 12,
  //           paddingBottom: 12,
  //           borderRadius: 50,
  //         }}
  //       >
  //         <Image
  //           source={require("../assets/google.png")}
  //           style={{ width: 32, height: 32 }}
  //         />
  //       </View> */}
  //       <View
  //         style={{
  //           width: 75,
  //           height: 85,
  //           justifyContent: "center",
  //           alignItems: "center",
  //           backgroundColor: item.bgColor,
  //           // paddingTop: 12,
  //           // paddingBottom: 12,
  //           borderRadius: 50,
  //         }}
  //       >
  //         <View
  //           style={{
  //             width: 60,
  //             height: 60,
  //             backgroundColor: isDark ? "#222222" : "#F4F4F4",
  //             borderRadius: "100%",
  //             flexDirection: "row",
  //             justifyContent: "center",
  //             alignItems: "center",
  //             borderWidth: isDark ? 1 : 0,
  //             borderColor: isDark ? "#FFFFFF14" : "",
  //           }}
  //         >
  //           {/* <Image
  //             source={item.src || require("../assets/google.png")}
  //             style={{ width: 32, height: 32 }}
  //           /> */}
  //           <StockLogo symbol={item.symbol} size={32} />
  //         </View>
  //       </View>
  //       <Text
  //         style={{
  //           fontSize: 14,
  //           fontWeight: "500",
  //           color: isDark ? "#E0E0E0" : "#000",
  //           marginTop: 4,
  //           fontFamily: "SfRegular",
  //         }}
  //       >
  //         {item.symbol}
  //       </Text>
  //       {/* <Text
  //         style={{
  //           fontSize: 14,
  //           fontWeight: "600",
  //           color: item.chnageColor,
  //           marginTop: 4,
  //           fontFamily: "SfRegular",
  //         }}
  //       >
  //         {item.change}{" "}
  //       </Text> */}
  //     </View>
  //   </TouchableOpacity>
  // );

  const renderTrendingStocks = ({ item }) => {
    const liveData = realtimeRelevant[item.symbol];
    // const fallback = item; // from API/
    const fallback = fallbackRelevantData[item.symbol] || item;

    const currentPrice = liveData?.c ?? fallback.close_price ?? 0;
    const volume = liveData?.v ?? fallback.volume ?? 0;
    return (
      <>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            minWidth: "max-content",
            paddingRight: 25,
          }}
          onPress={() => handleStockPress(item.symbol)}
        >
          <View
            style={{
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 75,
                height: 85,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: item.bgColor,
                // paddingTop: 12,
                // paddingBottom: 12,
                borderRadius: 50,
              }}
            >
              <View
                style={{
                  width: 60,
                  height: 60,
                  backgroundColor: isDark ? "#222222" : "#F4F4F4",
                  borderRadius: "100%",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: isDark ? 1 : 0,
                  borderColor: isDark ? "#FFFFFF14" : "",
                }}
              >
                <StockLogo symbol={item.symbol} size={32} />
              </View>
            </View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: isDark ? "#FFFFFF" : "#000",
                // marginTop: 4,
                fontFamily: "SfRegular",
              }}
            >
              {item.symbol}
            </Text>
            <Animated.Text
              style={[
                {
                  fontSize: 14,
                  fontWeight: "600",
                  color: currentPrice > 0 ? "#3FB950" : "#E00000",
                  marginTop: 4,
                  fontFamily: "SfRegular",
                },
              ]}
            >
              {currentPrice || 0} (PKR)
            </Animated.Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: currentPrice > 0 ? "#3FB950" : "#E00000",
                marginTop: 4,
                fontFamily: "SfRegular",
              }}
            >
              {formatLargeNumber(volume)} (vol)
            </Text>
          </View>
        </TouchableOpacity>
      </>
    );
  };
  const renderNewsSection = ({ item }) => (
    <TouchableOpacity
      style={{
        flexDirection: "column",
        width: 204, // Adjusted width to fit mobile and match image aspect
        backgroundColor: "#F9F9F9", // Dark background to match image
        borderRadius: 8,
        padding: 8,
        marginVertical: 4,
      }}
      onPress={() => router.push(`${item.link}`)}
    >
      <View style={{ flexDirection: "column" }}>
        <Image
          source={
            item?.image
              ? { uri: item.image } // Remote image
              : require("../assets/new_image.png") // Local fallback
          }
          style={{ width: 204, height: 100, marginRight: 8 }}
          resizeMode="cover" // Optional: controls how the image fits the container
          defaultSource={require("../assets/new_image.png")} // Optional: shows while loading
        />
        <Text
          style={{
            fontSize: 12,
            fontWeight: "500",
            color: "#6E6E6E", // White text to match image
            flex: 1,
            flexWrap: "wrap",
            paddingHorizontal: 16,
            paddingTop: 12,
            fontFamily: "SfRegular",
          }}
        >
          {item.source || "Are Fed 'Pivot' Concerns Impacting the Dollar?"}
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "black", // White text to match image
            flex: 1,
            flexWrap: "wrap",
            paddingHorizontal: 16,
            paddingTop: 5,
            fontFamily: "SfRegular",
          }}
        >
          {item.title || "Are Fed 'Pivot' Concerns Impacting the Dollar?"}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 12,
          color: "#6E6E6E", // Light gray for date to match image
          marginTop: 4,
          fontWeight: "500",
          paddingHorizontal: 16,
          paddingTop: 8,
          fontFamily: "SfRegular",
        }}
      >
        {formatDate(item.date)}
      </Text>
    </TouchableOpacity>
  );
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
  const earningsDateStr = SymboleData?.date;

  let shouldShowEarnings = false;
  if (earningsDateStr) {
    // Parse "12 Aug 2025" - using date-fns for reliability, fallback to native
    // const parsedDate = parse(earningsDateStr, "dd MMM yyyy", new Date());
    const parsedDate = new Date(earningsDateStr);
    // Or native: const parsedDate = new Date(earningsDateStr);
    if (isNaN(parsedDate.getTime())) {
      console.warn("Invalid date format:", earningsDateStr);
    } else {
      const earningsDate = new Date(parsedDate);
      // earningsDate.setHours(0, 0, 0, 0); // Normalize
      earningsDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      shouldShowEarnings = earningsDate >= today;
    }
  }

  // ----------------------------Get Graph Url-------------

  const fetchGraphUrl = async () => {
    try {
      const formData = {
        username: "rashid.irshad",
        password: "rashid123",
        ip: "1.1.1.1",
        client: "admin.iel",
        brokerUserCode: "J8y290WHt7Qf5o++SR54Aw==",
        isUserDemo: "0",
        symbol: symbol,
        page: "trading-view-iframe",
      };

      const body = new URLSearchParams(formData).toString(); // clean way in modern RN

      // ────────────────────────────────────────────────
      // Your Supabase project ref (from dashboard URL)

      // ────────────────────────────────────────────────

      const response = await fetch(
        "https://bfxmfaakufrmzcxhtgfw.supabase.co/functions/v1/Graph_url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            // Optional: add Authorization: `Bearer ${jwt}` if you protect the function
            Authorization: `Bearer ${ANON_KEY}`,
          },
          body: body,
        },
      );

      if (!response.ok) {
        throw new Error(`Proxy error: ${response.status}`);
      }

      const data = await response.json();
      setGraphUrl(data);
      console.log("Success from proxy:", data);

      // Handle your token/session etc.
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  useEffect(() => {
    fetchGraphUrl();
  }, []);

  // NEW: Sorted Relevant Stocks by Volume (High to Low)
  const sortedRelevantStocks = useMemo(() => {
    if (!ReleventStockData || ReleventStockData.length === 0) return [];

    return [...ReleventStockData].sort((a, b) => {
      const liveA = realtimeRelevant[a.symbol];
      const liveB = realtimeRelevant[b.symbol];

      const volumeA =
        liveA?.v ?? fallbackRelevantData[a.symbol]?.volume ?? a.volume ?? 0;

      const volumeB =
        liveB?.v ?? fallbackRelevantData[b.symbol]?.volume ?? b.volume ?? 0;

      return volumeB - volumeA; // High to Low
    });
  }, [ReleventStockData, realtimeRelevant, fallbackRelevantData]);
  const renderContent = () => {
    if (loading) {
      return (
        <View
          style={[
            styles.loaderContainer,
            {
              backgroundColor: isDark ? "" : "#fff",
            },
          ]}
        >
          <ActivityIndicator size="large" color="#58BA83" />
        </View>
      );
    }
    if (error || !StockData?.symbol) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || "No details found."}</Text>
        </View>
      );
    }
    switch (activeTab) {
      case "Details":
        return (
          <>
            {/* Price Section */}
            {/* Chart Section */}
            {/* <View style={{ marginTop: 24 }}>
              <Image
                source={require("../assets/Graph_section.png")}
                style={{ height: 300, width: 390 }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginHorizontal: 24,
                }}
              >
                <Text
                  style={{
                    backgroundColor: "#000000",
                    color: "#FFFFFF",
                    borderRadius: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  D
                </Text>
                <Text
                  style={{
                    color: "#000000",
                    borderRadius: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  W
                </Text>
                <Text
                  style={{
                    color: "#000000",
                    borderRadius: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  M
                </Text>
                <Text
                  style={{
                    color: "#000000",
                    borderRadius: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  6M
                </Text>
                <Text
                  style={{
                    color: "#000000",
                    borderRadius: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  Y
                </Text>
                <Text
                  style={{
                    color: "#000000",
                    borderRadius: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  2Y
                </Text>
                <Text
                  style={{
                    color: "#000000",
                    borderRadius: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  All Time
                </Text>
              </View>
            </View> */}
            {/* Alert and Info Section */}
            <View style={{ marginTop: 24, marginHorizontal: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={require("../assets/about_icon.png")}
                  style={{
                    width: 19,
                    height: 19,
                    marginRight: 8,
                  }}
                />
                <Text
                  style={{
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                    fontSize: 16,
                    fontWeight: "600",
                    fontFamily: "SfRegular",
                  }}
                >
                  About
                </Text>
              </View>
              <Text
                style={{
                  color: "#8A8A8A",
                  fontSize: 14,
                  fontWeight: "400",
                  marginTop: 14,
                  fontFamily: "SfRegular",
                  textAlign: "justify",
                }}
              >
                {StockData?.about}
              </Text>
              {/* <Text
                style={{
                  color: "#000000",
                  fontSize: 12,
                  fontWeight: "600",
                  marginTop: 8,
                }}
              >
                Read More
              </Text> */}
              <View
                style={{
                  backgroundColor: isDark ? "#1F1F1F" : "#F9F9F9",
                  borderWidth: 1,
                  borderColor: isDark ? "" : "#F0F0F0",
                  // shadowColor: "#000000",
                  // shadowOffset: { width: 0, height: 2 },
                  // shadowOpacity: 0.1,
                  // shadowRadius: 8,
                  // elevation: 3,
                  marginTop: 22,
                  paddingHorizontal: 16,
                  paddingVertical: 24,
                  borderRadius: 4,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottomWidth: isDark ? 0 : 1,
                    borderBottomColor: "#E6E6E6",
                    paddingBottom: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image
                      source={require("../assets/avatar_icon.png")}
                      style={{ width: 30, height: 30, marginRight: 8 }}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: "#6E6E6E",
                        fontFamily: "SfRegular",
                      }}
                    >
                      Chairman
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: isDark ? "#E0E0E0" : "#101828",
                      fontFamily: "SfRegular",
                      maxWidth: 200,
                      textAlign: "right",
                    }}
                  >
                    {StockData?.chairman}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottomWidth: isDark ? 0 : 1,
                    borderBottomColor: "#E6E6E6",
                    paddingBottom: 12,
                    marginTop: 16,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image
                      source={require("../assets/avatar_icon.png")}
                      style={{ width: 30, height: 30, marginRight: 8 }}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: "#6E6E6E",
                        fontFamily: "SfRegular",
                      }}
                    >
                      CEO
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: isDark ? "#E0E0E0" : "#101828",
                      fontFamily: "SfRegular",
                    }}
                  >
                    {StockData?.ceo}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottomWidth: isDark ? 0 : 1,
                    borderBottomColor: "#E6E6E6",
                    paddingBottom: 12,
                    marginTop: 16,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image
                      source={require("../assets/float_icon.png")}
                      style={{ width: 30, height: 30, marginRight: 8 }}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: "#6E6E6E",
                        fontFamily: "SfRegular",
                      }}
                    >
                      Free Float
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: isDark ? "#E0E0E0" : "#101828",
                      fontFamily: "SfRegular",
                    }}
                  >
                    {formatLargeNumber(StockData?.free_float)}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottomWidth: isDark ? 0 : 1,
                    borderBottomColor: "#E6E6E6",
                    paddingBottom: 12,
                    marginTop: 16,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image
                      source={require("../assets/perc_icon.png")}
                      style={{ width: 30, height: 30, marginRight: 8 }}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: "#6E6E6E",
                        fontFamily: "SfRegular",
                      }}
                    >
                      Free Float %
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: isDark ? "#E0E0E0" : "#101828",
                      fontFamily: "SfRegular",
                    }}
                  >
                    {StockData?.free_float_percentage} %
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 16,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image
                      source={require("../assets/web_icon.png")}
                      style={{ width: 30, height: 30, marginRight: 8 }}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: "#6E6E6E",
                        fontFamily: "SfRegular",
                      }}
                    >
                      Website
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: isDark ? "#E0E0E0" : "#101828",
                      fontFamily: "SfRegular",
                    }}
                  >
                    {StockData?.website}
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ marginHorizontal: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  alignContent: "center",
                  marginTop: 24, // Fixed string to number
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("../assets/stocks_icon.png")}
                    style={{
                      width: 19,
                      height: 19,
                      marginRight: 8,
                    }}
                  />
                  <Text
                    style={{
                      fontWeight: "600",
                      fontSize: 16,
                      fontFamily: "SfRegular",
                      color: isDark ? "#E0E0E0" : "",
                    }}
                  >
                    Relevant Stocks
                  </Text>
                </View>
                {/* <Text
                  style={{
                    color: "#58BA83",
                    fontWeight: "600",
                    fontSize: 14,
                    textDecorationLine: "underline",
                    fontFamily: "SfRegular",
                  }}
                >
                  View All
                </Text> */}
              </View>
              <FlatList
                data={sortedRelevantStocks}
                renderItem={renderTrendingStocks}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            </View>
            <View style={{ marginHorizontal: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  alignContent: "center",
                  marginTop: 24, // Fixed string to number
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("../assets/news_icon.png")}
                    style={{
                      width: 19,
                      height: 19,
                      marginRight: 8,
                    }}
                  />
                  <Text
                    style={{
                      fontWeight: "600",
                      fontSize: 16,
                      fontFamily: "SfRegular",
                      color: isDark ? "#E0E0E0" : "",
                    }}
                  >
                    News
                  </Text>
                </View>
                {/* <Text
                  style={{
                    color: "#58BA83",
                    fontWeight: "600",
                    fontSize: 14,
                    textDecorationLine: "underline",
                    fontFamily: "SfRegular",
                  }}
                >
                  View All
                </Text> */}
              </View>
              {/* <FlatList
                data={StockData?.news}
                renderItem={renderNewsSection}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              /> */}
              {StockData?.news?.map((item, index) => {
                return (
                  <TouchableOpacity
                    style={{
                      flexDirection: "column",
                      width: "auto",
                      backgroundColor: isDark ? "#222222" : "#F9F9F9",
                      borderRadius: 8,
                      padding: 8,
                      marginVertical: 12,
                      borderWidth: isDark ? 1 : 0,
                      borderColor: isDark ? "#FFFFFF14" : "",
                    }}
                    onPress={() => router.push(`${item.link}`)}
                    key={index}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ width: "60%", paddingLeft: 10 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "500",
                            color: "#8A8A8A",
                            flex: 1,
                            flexWrap: "wrap",
                            // paddingTop: 12,
                            fontFamily: "SfRegular",
                            alignItems: "center",
                          }}
                        >
                          {/* Reuters . {item?.date} */}
                          Reuters .{" "}
                          {item?.date
                            ? (() => {
                                const d = new Date(item.date);
                                const day = d
                                  .getDate()
                                  .toString()
                                  .padStart(2, "0");
                                const month = d.toLocaleString("en-GB", {
                                  month: "short",
                                }); // Aug
                                const year = d
                                  .getFullYear()
                                  .toString()
                                  .slice(-2); // 24
                                return `${day} ${month} ${year}`;
                              })()
                            : ""}
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: isDark ? "#E0E0E0" : "black",
                            flex: 1,
                            flexWrap: "wrap",
                            paddingTop: 4,
                            fontFamily: "SfRegular",
                          }}
                        >
                          {item?.title}
                        </Text>
                        {/* <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingRight: 15,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#3FB950",
                              marginTop: 4,
                              fontWeight: "600",
                              paddingTop: 8,
                              fontFamily: "SfRegular",
                            }}
                          >
                            BLK+1.69%
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#E00000",
                              marginTop: 4,
                              fontWeight: "600",
                              paddingTop: 8,
                              fontFamily: "SfRegular",
                            }}
                          >
                            NVDA -0.23%
                          </Text>
                        </View> */}
                      </View>
                      <Image
                        source={
                          item?.image
                            ? { uri: item.image }
                            : require("../assets/new_image.png")
                        }
                        style={{
                          width: 106,
                          height: 106,
                          borderRadius: 8,
                        }}
                        resizeMode="cover"
                        defaultSource={require("../assets/new_image.png")}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        );
      case "Statistics":
        return (
          <>
            <View style={{ marginVertical: 16, marginHorizontal: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={require("../assets/statistics_icon.png")}
                  style={{ width: 19, height: 19, marginRight: 8 }}
                />
                <Text
                  style={{
                    color: isDark ? "#E0E0E0" : "#000000",
                    fontSize: 16,
                    fontWeight: "600",
                    fontFamily: "SfRegular",
                  }}
                >
                  Key Statistics
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: isDark ? "#1F1F1F" : "#F9F9F9",
                  borderWidth: 1,
                  borderColor: isDark ? "#FFFFFF14" : "#F0F0F0",

                  marginTop: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 24,
                  borderRadius: 4,
                }}
              >
                {StatisticsData &&
                  Object.entries(StatisticsData).map(([key, value]) => {
                    // Skip rendering day_low and week_52_low since they will be included in the ranges
                    if (key === "day_low" || key === "week_52_low") {
                      return null;
                    }
                    // Format keys to readable text
                    let readableKey =
                      {
                        day_high: "Day Range",
                        week_52_high: "52 Week Range",
                        previous_close: "Previous Close",
                        open: "Open",
                        volume: "Volume",
                        avg_volume_3m: "Avg Volume (3M)",
                        market_cap: "Market Cap",
                      }[key] ||
                      key
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase());
                    // Format values based on key type
                    let displayValue;

                    if (key === "open") {
                      const displayVolume = formatLargeNumber(
                        SocketCloseData.open_price,
                      );

                      return (
                        <View
                          key={key}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottomWidth: 1,
                            borderBottomColor: isDark ? "#FFFFFF1A" : "#E6E6E6",
                            paddingBottom: 12,
                            marginTop: 16,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#6E6E6E",
                              fontFamily: "SfRegular",
                            }}
                          >
                            {readableKey}
                          </Text>

                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: isDark ? "#E0E0E0" : "#000000",
                              fontFamily: "SfRegular",
                            }}
                          >
                            {displayVolume}
                          </Text>
                        </View>
                      );
                    }

                    if (key === "volume") {
                      const displayVolume = formatLargeNumber(
                        SocketCloseData.volume,
                      );

                      return (
                        <View
                          key={key}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottomWidth: 1,
                            borderBottomColor: isDark ? "#FFFFFF1A" : "#E6E6E6",
                            paddingBottom: 12,
                            marginTop: 16,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#6E6E6E",
                              fontFamily: "SfRegular",
                            }}
                          >
                            {readableKey}
                          </Text>

                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: isDark ? "#E0E0E0" : "#000000",
                              fontFamily: "SfRegular",
                            }}
                          >
                            {displayVolume}
                          </Text>
                        </View>
                      );
                    }
                    if (key === "day_high") {
                      const dayHigh =
                        value === null || value === undefined
                          ? "N/A"
                          : Number(value).toFixed(2);
                      const dayLow =
                        StatisticsData.day_low === null ||
                        StatisticsData.day_low === undefined
                          ? "N/A"
                          : Number(StatisticsData.day_low).toFixed(2);
                      return (
                        <View
                          key={key}
                          style={{
                            marginTop: 16,
                            paddingBottom: 12,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#4A5565",
                              fontFamily: "SfRegular",
                              marginBottom: 8,
                            }}
                          >
                            {readableKey}
                          </Text>
                          <RangeDisplay
                            low={dayLow}
                            high={dayHigh}
                            // label="Day's Range"
                          />
                        </View>
                      );
                    } else if (key === "week_52_high") {
                      const week52High =
                        value === null || value === undefined
                          ? "N/A"
                          : Number(value).toFixed(2);
                      const week52Low =
                        StatisticsData.week_52_low === null ||
                        StatisticsData.week_52_low === undefined
                          ? "N/A"
                          : Number(StatisticsData.week_52_low).toFixed(2);
                      return (
                        <View
                          key={key}
                          style={{
                            marginTop: 16,
                            paddingBottom: 12,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#4A5565",
                              fontFamily: "SfRegular",
                              marginBottom: 8,
                            }}
                          >
                            {readableKey}
                          </Text>
                          <RangeDisplay
                            low={week52Low}
                            high={week52High}
                            // label="52 Week Range"
                          />
                        </View>
                      );
                    } else {
                      displayValue =
                        value === null || value === undefined
                          ? "N/A"
                          : key === "market_cap"
                            ? `${Number(value).toLocaleString()}`
                            : key.includes("volume")
                              ? Number(value).toLocaleString()
                              : Number(value).toFixed(2);
                      return (
                        <View
                          key={key}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottomWidth: 1,
                            borderBottomColor: isDark ? "#FFFFFF1A" : "#E6E6E6",
                            paddingBottom: 12,
                            marginTop: 16,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#6E6E6E",
                              fontFamily: "SfRegular",
                            }}
                          >
                            {readableKey}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "600",
                                color: isDark ? "#E0E0E0" : "#000000",
                                fontFamily: "SfRegular",
                              }}
                            >
                              {displayValue}
                            </Text>
                          </View>
                        </View>
                      );
                    }
                  })}
              </View>
            </View>
            {/* <View style={{ marginTop: 16, marginHorizontal: 24 }}>
              <Text
                style={{ color: "#000000", fontSize: 16, fontWeight: "600" }}
              >
                Key Financials
              </Text>
              <Text
                style={{
                  color: "#6E6E6E",
                  fontSize: 14,
                  fontWeight: "400",
                  marginTop: 4,
                }}
              >
                Lorem ipsum dolor sit amet consectetur.
              </Text>
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#F0F0F0",
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 3,
                  marginTop: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 24,
                  borderRadius: 4,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    alignContent: "center",
                    paddingBottom: 20,
                  }}
                >
                  <Text
                    style={{
                      width: "50%",
                      textAlign: "center",
                      backgroundColor: "#000000",
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "600",
                      paddingVertical: 16,
                      borderRadius: "100px",
                    }}
                  >
                    Annual
                  </Text>
                  <Text
                    style={{
                      width: "50%",
                      textAlign: "center",
                      backgroundColor: "#BBBBBB33",
                      color: "#8A8A8A",
                      fontSize: 16,
                      fontWeight: "600",
                      paddingVertical: 16,
                      borderRadius: "100px",
                    }}
                  >
                    Quarterly
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    marginVertical: 24,
                  }}
                >
                  <Image
                    source={require("../assets/statistice_new.png")}
                    style={{ width: 300, height: 250 }}
                  />
                </View>
              </View>
            </View> */}
            <View style={{ marginTop: 16, marginHorizontal: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={require("../assets/stocks_icon.png")}
                  style={{ width: 19, height: 19, marginRight: 8 }}
                />
                <Text
                  style={{
                    color: isDark ? "#E0E0E0" : "#000000",
                    fontSize: 16,
                    fontWeight: "600",
                    fontFamily: "SfRegular",
                  }}
                >
                  Essential Numbers (TTM)
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: isDark ? "#1F1F1F" : "#F9F9F9",
                  borderWidth: 1,
                  borderColor: isDark ? "#FFFFFF14" : "#F0F0F0",

                  // shadowColor: "#000000",
                  // shadowOffset: { width: 0, height: 2 },
                  // shadowOpacity: 0.1,
                  // shadowRadius: 8,
                  // elevation: 3,
                  marginTop: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 24,
                  borderRadius: 4,
                }}
              >
                {EssentialNumbersData &&
                  Object.entries(EssentialNumbersData)
                    .filter(
                      ([key]) =>
                        ![
                          "period",
                          "created_at",
                          "updated_at",
                          "dividend_yield",
                          "net_profit_margin",
                          "gross_profit_margin",
                          "revenue_growth",
                        ].includes(key),
                    )
                    .map(([key, value]) => {
                      // Format keys to readable text
                      const readableKey =
                        {
                          revenue: "Revenue",
                          earnings_per_share: "EPS",
                          dividend_per_share: "DPS",
                        }[key] ||
                        key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase());
                      // Format values based on key type
                      const displayValue =
                        value === null || value === undefined
                          ? "N/A"
                          : key === "market_cap"
                            ? `${Number(value).toLocaleString()}`
                            : key.includes("volume")
                              ? Number(value).toLocaleString()
                              : Number(value).toFixed(2);
                      return (
                        <View
                          key={key}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottomWidth: 1,
                            borderBottomColor: isDark ? "#FFFFFF1A" : "#E6E6E6",
                            paddingBottom: 12,
                            marginTop: 16,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#4A5565",
                              fontFamily: "SfRegular",
                            }}
                          >
                            {readableKey}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "600",
                                color: isDark ? "#E0E0E0" : "#000000",
                                fontFamily: "SfRegular",
                              }}
                            >
                              {formatLargeNumber(displayValue)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}

                {/* ------------- */}
                {EssentialRatioData &&
                  Object.entries(EssentialRatioData)
                    .filter(
                      ([key]) =>
                        ![
                          "period",
                          "created_at",
                          "updated_at",
                          "equity_to_assets",
                          "dividend_yield",
                          "price_book_ratio",
                          "dividend_per_share",
                          "cash_payout_ratio",
                          "gross_profit_margin",
                          "earnings_per_share",
                          "price_to_sales_ratio",
                          "long_term_debt_to_equity",
                          "interest_cover",
                          "net_profit_margin",
                          "return_on_equity",
                          "sales",
                          "current_ratio",
                          "price_earnings_ratio",
                          "return_on_assets",
                        ].includes(key),
                    )
                    .map(([key, value]) => {
                      // Format keys to readable text
                      const readableKey =
                        {
                          book_value_per_share: "BVPS",
                        }[key] ||
                        key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase());
                      // Format values based on key type
                      const displayValue =
                        value === null || value === undefined
                          ? "N/A"
                          : key === "market_cap"
                            ? `${Number(value).toLocaleString()}`
                            : key.includes("volume")
                              ? Number(value).toLocaleString()
                              : Number(value).toFixed(2);
                      return (
                        <View
                          key={key}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottomWidth: 1,
                            borderBottomColor: isDark ? "#FFFFFF1A" : "#E6E6E6",
                            paddingBottom: 12,
                            marginTop: 16,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#4A5565",
                              fontFamily: "SfRegular",
                            }}
                          >
                            {readableKey}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "600",
                                color: isDark ? "#E0E0E0" : "#000000",
                                fontFamily: "SfRegular",
                              }}
                            >
                              {formatLargeNumber(displayValue)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
              </View>
            </View>
            <View style={{ marginTop: 16, marginHorizontal: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={require("../assets/stocks_icon.png")}
                  style={{ width: 19, height: 19, marginRight: 8 }}
                />
                <Text
                  style={{
                    color: isDark ? "#E0E0E0" : "#000000",
                    fontSize: 16,
                    fontWeight: "600",
                    fontFamily: "SfRegular",
                  }}
                >
                  Essential Ratio (TTM)
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: isDark ? "#1F1F1F" : "#F9F9F9",
                  borderWidth: 1,
                  borderColor: isDark ? "#FFFFFF14" : "#F0F0F0",

                  // shadowColor: "#000000",
                  // shadowOffset: { width: 0, height: 2 },
                  // shadowOpacity: 0.1,
                  // shadowRadius: 8,
                  // elevation: 3,
                  marginTop: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 24,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: isDark ? "#E0E0E0" : "#000000",
                    fontSize: 16,
                    fontWeight: "600",
                    fontFamily: "SfRegular",
                  }}
                >
                  Profitability
                </Text>
                {EssentialRatioData &&
                  Object.entries(EssentialRatioData)
                    .filter(
                      ([key]) =>
                        ![
                          "period",
                          "created_at",
                          "updated_at",
                          "equity_to_assets",
                          "dividend_yield",
                          "price_book_ratio",
                          "price_book_ratio",
                          "dividend_per_share",
                          "cash_payout_ratio",
                          "earnings_per_share",
                          "price_to_sales_ratio",
                          "long_term_debt_to_equity",
                          "interest_cover",
                          "sales",
                          "current_ratio",
                          "book_value_per_share",
                          "price_earnings_ratio",
                        ].includes(key),
                    )
                    .map(([key, value]) => {
                      // Format keys to readable text
                      const readableKey =
                        {
                          gross_profit_margin: "Gross Margin",
                          net_profit_margin: "Net Margin",
                          return_on_equity: "ROE",
                          return_on_assets: "ROA",
                        }[key] ||
                        key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase());
                      // Format values based on key type
                      const displayValue =
                        value === null || value === undefined
                          ? "N/A"
                          : key === "market_cap"
                            ? `${Number(value).toLocaleString()}`
                            : key.includes("volume")
                              ? Number(value).toLocaleString()
                              : Number(value).toFixed(2);
                      return (
                        <View
                          key={key}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottomWidth: 1,
                            borderBottomColor: isDark ? "#FFFFFF1A" : "#E6E6E6",
                            paddingBottom: 12,
                            marginTop: 16,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#4A5565",
                              fontFamily: "SfRegular",
                            }}
                          >
                            {readableKey}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "600",
                                color: isDark ? "#E0E0E0" : "#000000",
                                fontFamily: "SfRegular",
                              }}
                            >
                              {formatLargeNumber(displayValue)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}

                <Text
                  style={{
                    color: isDark ? "#E0E0E0" : "#000000",
                    fontSize: 16,
                    fontWeight: "600",
                    fontFamily: "SfRegular",
                    marginTop: 10,
                  }}
                >
                  Valuation
                </Text>

                {EssentialRatioData &&
                  Object.entries(EssentialRatioData)
                    .filter(
                      ([key]) =>
                        ![
                          "period",
                          "created_at",
                          "updated_at",
                          "equity_to_assets",
                          "dividend_per_share",
                          "cash_payout_ratio",
                          "earnings_per_share",
                          "long_term_debt_to_equity",
                          "interest_cover",
                          "sales",
                          "current_ratio",
                          "book_value_per_share",
                          "gross_profit_margin",
                          "net_profit_margin",
                          "return_on_equity",
                          "return_on_assets",
                        ].includes(key),
                    )
                    .map(([key, value]) => {
                      // Format keys to readable text
                      const readableKey =
                        {
                          price_earnings_ratio: "P/E",
                          price_book_ratio: "P/B",
                          price_to_sales_ratio: "P/S",
                          dividend_yield: "Divided Yield",
                        }[key] ||
                        key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase());
                      // Format values based on key type
                      const displayValue =
                        value === null || value === undefined
                          ? "N/A"
                          : key === "market_cap"
                            ? `${Number(value).toLocaleString()}`
                            : key.includes("volume")
                              ? Number(value).toLocaleString()
                              : Number(value).toFixed(2);
                      return (
                        <View
                          key={key}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottomWidth: 1,
                            borderBottomColor: isDark ? "#FFFFFF1A" : "#E6E6E6",
                            paddingBottom: 12,
                            marginTop: 16,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#4A5565",
                              fontFamily: "SfRegular",
                            }}
                          >
                            {readableKey}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "600",
                                color: isDark ? "#E0E0E0" : "#000000",
                                fontFamily: "SfRegular",
                              }}
                            >
                              {formatLargeNumber(displayValue)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}

                <Text
                  style={{
                    color: isDark ? "#E0E0E0" : "#000000",
                    fontSize: 16,
                    fontWeight: "600",
                    fontFamily: "SfRegular",
                    marginTop: 10,
                  }}
                >
                  Liquidity
                </Text>

                {EssentialRatioData &&
                  Object.entries(EssentialRatioData)
                    .filter(
                      ([key]) =>
                        ![
                          "period",
                          "created_at",
                          "updated_at",
                          "equity_to_assets",
                          "dividend_per_share",
                          "cash_payout_ratio",
                          "earnings_per_share",
                          "long_term_debt_to_equity",
                          "sales",
                          "book_value_per_share",
                          "gross_profit_margin",
                          "net_profit_margin",
                          "return_on_equity",
                          "return_on_assets",
                          "price_earnings_ratio",
                          "price_book_ratio",
                          "price_to_sales_ratio",
                          "dividend_yield",
                        ].includes(key),
                    )
                    .map(([key, value]) => {
                      // Format keys to readable text
                      const readableKey =
                        {
                          current_ratio: "Current Ratio",
                          interest_cover: "Interest Cover",
                        }[key] ||
                        key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase());
                      // Format values based on key type
                      const displayValue =
                        value === null || value === undefined
                          ? "N/A"
                          : key === "market_cap"
                            ? `${Number(value).toLocaleString()}`
                            : key.includes("volume")
                              ? Number(value).toLocaleString()
                              : Number(value).toFixed(2);
                      return (
                        <View
                          key={key}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottomWidth: 1,
                            borderBottomColor: isDark ? "#FFFFFF1A" : "#E6E6E6",
                            paddingBottom: 12,
                            marginTop: 16,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#4A5565",
                              fontFamily: "SfRegular",
                            }}
                          >
                            {readableKey}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "600",
                                color: isDark ? "#E0E0E0" : "#000000",
                                fontFamily: "SfRegular",
                              }}
                            >
                              {formatLargeNumber(displayValue)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}

                <Text
                  style={{
                    color: isDark ? "#E0E0E0" : "#000000",
                    fontSize: 16,
                    fontWeight: "600",
                    fontFamily: "SfRegular",
                    marginTop: 10,
                  }}
                >
                  Leverage
                </Text>

                {EssentialRatioData &&
                  Object.entries(EssentialRatioData)
                    .filter(
                      ([key]) =>
                        ![
                          "period",
                          "created_at",
                          "updated_at",
                          "dividend_per_share",
                          "cash_payout_ratio",
                          "earnings_per_share",
                          "sales",
                          "book_value_per_share",
                          "gross_profit_margin",
                          "net_profit_margin",
                          "return_on_equity",
                          "return_on_assets",
                          "price_earnings_ratio",
                          "price_book_ratio",
                          "price_to_sales_ratio",
                          "dividend_yield",
                          "current_ratio",
                          "interest_cover",
                        ].includes(key),
                    )
                    .map(([key, value]) => {
                      // Format keys to readable text
                      const readableKey =
                        {
                          long_term_debt_to_equity: "Debt/Equity",
                          equity_to_assets: "Equity/Assets",
                        }[key] ||
                        key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase());
                      // Format values based on key type
                      const displayValue =
                        value === null || value === undefined
                          ? "N/A"
                          : key === "market_cap"
                            ? `${Number(value).toLocaleString()}`
                            : key.includes("volume")
                              ? Number(value).toLocaleString()
                              : Number(value).toFixed(2);
                      return (
                        <View
                          key={key}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottomWidth: 1,
                            borderBottomColor: isDark ? "#FFFFFF1A" : "#E6E6E6",
                            paddingBottom: 12,
                            marginTop: 16,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#4A5565",
                              fontFamily: "SfRegular",
                            }}
                          >
                            {readableKey}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "600",
                                color: isDark ? "#E0E0E0" : "#000000",
                                fontFamily: "SfRegular",
                              }}
                            >
                              {formatLargeNumber(displayValue)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
              </View>
            </View>
          </>
        );
      case "Reports":
        return (
          <KeyboardAvoidingView
            style={{ marginHorizontal: 24, marginTop: 16, marginBottom: 200 }}
          >
            {/* <Text style={styles.sectionTitle}>
              Annual Financial Fundamentals
            </Text>
            {FundamentalsData ? (
              <View
                style={{
                  backgroundColor: "#F9F9F9",
                  borderWidth: 1,
                  borderColor: "#F0F0F0",
                  marginTop: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 24,
                  borderRadius: 4,
                }}
              >
                {typeof FundamentalsData === "object" &&
                FundamentalsData !== null ? (
                  Object.entries(FundamentalsData).map(([key, value]) => (
                    <View
                      key={key}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottomWidth: 1,
                        borderBottomColor: "#E6E6E6",
                        paddingBottom: 12,
                        marginTop: 16,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: "#6E6E6E",
                          fontFamily: "SfRegular",
                        }}
                      >
                        {key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#000000",
                          fontFamily: "SfRegular",
                        }}
                      >
                        {typeof value === "number"
                          ? formatLargeNumber(value)
                          : String(value)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text>No data available</Text>
                )}
              </View>
            ) : (
              <Text>Loading fundamentals...</Text>
            )} */}

            <ChatBotScreen
              symbol={symbol}
              userId={userId}
              colorScheme={colorScheme}
            />
          </KeyboardAvoidingView>
        );
      default:
        return null;
    }
  };
  // const handleBackClickButton = () => {
  //   if (previousPage === "Search") {
  //     router.push(`/Search`);
  //   } else {
  //     router.push(`/Market`);
  //   }
  // };
  return (
    <>
      <View style={{ flex: 1 }}>
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
            {/* Header */}
            <View style={styles.header}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "Center",
                }}
              >
                <TouchableOpacity onPress={() => router.back()}>
                  {isDark ? (
                    <Image
                      source={require("../assets/icons/white_back_icon.png")}
                      style={{
                        width: 12,
                        height: 14,
                        marginTop: 2,
                        marginRight: 6,
                      }}
                    />
                  ) : (
                    <Image
                      source={require("../assets/move_backward.png")}
                      style={{
                        width: 20,
                        height: 20,
                        marginTop: 2,
                        marginRight: 6,
                      }}
                    />
                  )}
                </TouchableOpacity>
                <View style={{ flexDirection: "column" }}>
                  <Text
                    style={[
                      styles.headerTitle,
                      {
                        color: isDark ? "#E0E0E0" : "",
                      },
                    ]}
                  >
                    {" "}
                    {StockData?.symbol || symbol}{" "}
                  </Text>{" "}
                  <Text
                    style={[
                      styles.headerName,
                      {
                        color: isDark ? "#8A8A8A" : "#6666668A",
                      },
                    ]}
                  >
                    {" "}
                    {StockData?.name}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {/* <Image
                source={require("../assets/plus_new_icon.png")}
                style={{ width: 26, height: 26, marginRight: 4 }}
              /> */}
                {watchlistSymbols.has(StockData?.symbol) ? (
                  ""
                ) : (
                  <TouchableOpacity
                    onPress={() => addToWatchlist(StockData?.symbol)}
                  >
                    <Image
                      source={
                        isDark
                          ? require("../assets/icons/add_dark.png")
                          : require("../assets/plus_new_design.png")
                      }
                      style={{ width: 32, height: 32, marginRight: 4 }}
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => router.push("/Notification")}>
                  <Image
                    source={
                      isDark
                        ? require("../assets/icons/notification_dark.png")
                        : require("../assets/noti_new_design.png")
                    }
                    style={{ width: 32, height: 32, marginRight: 2 }}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {/* <View
              style={{
                marginHorizontal: 20,
                backgroundColor: "transparent",
                borderRadius: 8,
                // paddingVertical: 6,
                paddingBottom: 6,
              }}
            >
              <View
                style={{
                  // flexDirection: "column",
                  flexDirection: "row",
                  // paddingVertical: 12,
                  alignItems: "center",
                  justifyContent: "space-between",
                  // borderBottomColor: "#E6E6E6",
                }}
              >
                <View style={{ flexDirection: "column" }}>
                  <Text
                    style={{
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    <Animated.Text
                      style={[
                        {
                          fontSize: 12,
                          fontWeight: "700",
                          fontFamily: "SfRegular",
                          color: "#8A8A8A",
                        },
                        { transform: [{ scale: priceAnim }] },
                      ]}
                    >
                      PKR
                    </Animated.Text>{" "}
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "800",
                        marginLeft: 2,
                        fontFamily: "SfRegular",
                      }}
                    >
                      {formatLargeNumber(
                        realtimeData?.c || SocketCloseData?.close_price,
                      )}
                    </Text>
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      // marginLeft: 6,
                      marginTop: 6,
                    }}
                  >
                    <View
                    // style={{ marginTop: 12 }}
                    >
                      {isDark ? (
                        realtimeData?.pch < 0 ||
                        SocketCloseData?.percent_change < 0 ? (
                          <Svg
                            width="7"
                            height="6"
                            viewBox="0 0 7 6"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <Path
                              d="M3.53189 5.25C3.33944 5.58333 2.85831 5.58333 2.66586 5.25L0.0677876 0.75C-0.124662 0.416667 0.115901 0 0.500801 0H5.69695C6.08185 0 6.32242 0.416667 6.12997 0.75L3.53189 5.25Z"
                              fill="#FF6B6B"
                            />
                          </Svg>
                        ) : (
                          <Svg
                            width="7"
                            height="6"
                            viewBox="0 0 7 6"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <Path
                              d="M2.66586 0.25C2.85831 -0.0833337 3.33944 -0.0833333 3.53189 0.25L6.12997 4.75C6.32242 5.08333 6.08185 5.5 5.69695 5.5H0.5008C0.1159 5.5 -0.124662 5.08333 0.0677881 4.75L2.66586 0.25Z"
                              fill="#3FB950"
                            />
                          </Svg>
                        )
                      ) : realtimeData?.pch < 0 ||
                        SocketCloseData?.percent_change < 0 ? (
                        <Svg
                          width="7"
                          height="6"
                          viewBox="0 0 7 6"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <Path
                            d="M3.53189 5.25C3.33944 5.58333 2.85831 5.58333 2.66586 5.25L0.0677876 0.75C-0.124662 0.416667 0.115901 0 0.500801 0H5.69695C6.08185 0 6.32242 0.416667 6.12997 0.75L3.53189 5.25Z"
                            fill="#E00000"
                          />
                        </Svg>
                      ) : (
                        <Svg
                          width="7"
                          height="6"
                          viewBox="0 0 7 6"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <Path
                            d="M2.66586 0.25C2.85831 -0.0833337 3.33944 -0.0833333 3.53189 0.25L6.12997 4.75C6.32242 5.08333 6.08185 5.5 5.69695 5.5H0.5008C0.1159 5.5 -0.124662 5.08333 0.0677881 4.75L2.66586 0.25Z"
                            fill="#3FB950"
                          />
                        </Svg>
                      )}
                      {}
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        fontFamily: "SfRegular",
                        color: isDark
                          ? realtimeData?.pch < 0 ||
                            SocketCloseData?.percent_change < 0
                            ? "#FF6B6B"
                            : "#3FB950"
                          : realtimeData?.pch < 0 ||
                              SocketCloseData?.percent_change < 0
                            ? "#E00000"
                            : "#3FB950",
                        marginLeft: 4,
                      }}
                    >
                      {formatLargeNumber(
                        realtimeData?.ch || SocketCloseData?.change,
                      )}{" "}
                      (
                      {realtimeData?.pch > 0 ||
                      SocketCloseData?.percent_change > 0
                        ? "+"
                        : ""}
                      {(
                        realtimeData?.pch ||
                        SocketCloseData?.percent_change * 100
                      ).toFixed(2)}
                      % )
                    </Text>
                  </View>
                </View>
                <View style={{ marginTop: 30 }}>
                  <View
                    style={{
                      flexDirection: "row",
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          fontFamily: "SfRegular",
                          color: "#8A8A8A",
                        }}
                      >
                        High Price
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          fontFamily: "SfRegular",
                          color: isDark ? "#FFFFFF" : "",
                          marginTop: 6,
                        }}
                      >
                        {formatLargeNumberNew(
                          realtimeData?.h || SocketCloseData?.high_price,
                        )}
                      </Text>
                    </View>
                    <View style={{ marginLeft: 16 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          fontFamily: "SfRegular",
                          color: "#8A8A8A",
                        }}
                      >
                        Low Price
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          fontFamily: "SfRegular",
                          color: isDark ? "#FFFFFF" : "",
                          marginTop: 6,
                        }}
                      >
                        {formatLargeNumberNew(
                          realtimeData?.l || SocketCloseData?.low_price,
                        )}
                      </Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 6 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        fontFamily: "SfRegular",
                        color: "#8A8A8A",
                      }}
                    >
                      Volume
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        fontFamily: "SfRegular",
                        color: isDark ? "#FFFFFF" : "",
                        marginTop: 6,
                      }}
                    >
                      {formatLargeNumber(
                        realtimeData?.v || SocketCloseData?.volume,
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ marginTop: 30 }}>
                <View
                  style={{
                    flexDirection: "row",
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        fontFamily: "SfRegular",
                        color: "#8A8A8A",
                      }}
                    >
                      Bid Price
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        fontFamily: "SfRegular",
                        color: isDark ? "#FFFFFF" : "",
                        marginTop: 6,
                      }}
                    >
                      {formatLargeNumberNew(
                        realtimeData?.bp || SocketCloseData?.bid_price,
                      )}
                    </Text>
                  </View>
                  <View style={{ marginLeft: 16 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        fontFamily: "SfRegular",
                        color: "#8A8A8A",
                      }}
                    >
                      Ask Price
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        fontFamily: "SfRegular",
                        color: isDark ? "#FFFFFF" : "",
                        marginTop: 6,
                      }}
                    >
                      {formatLargeNumberNew(
                        realtimeData?.ap || SocketCloseData?.ask_price,
                      )}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    marginTop: 6
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        fontFamily: "SfRegular",
                        color: "#8A8A8A",
                      }}
                    >
                      Bid Volume
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        fontFamily: "SfRegular",
                        color: isDark ? "#FFFFFF" : "",
                        marginTop: 6,
                      }}
                    >
                      {formatLargeNumber(
                        realtimeData?.bv || SocketCloseData?.bid_volume,
                      )}
                    </Text>
                  </View>

                  <View style={{ marginLeft: 16 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        fontFamily: "SfRegular",
                        color: "#8A8A8A",
                      }}
                    >
                      Ask Volume
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        fontFamily: "SfRegular",
                        color: isDark ? "#FFFFFF" : "",
                        marginTop: 6,
                      }}
                    >
                      {formatLargeNumber(
                        realtimeData?.av || SocketCloseData?.ask_volume,
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            </View> */}
            <View
              style={{
                marginHorizontal: 20,
                backgroundColor: "transparent",
                borderRadius: 8,
                paddingBottom: 6,
                marginTop: 6,
              }}
            >
              {/* Main Price Section */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {/* Left: Price + Change */}
                <View>
                  <Text style={{ color: isDark ? "#E0E0E0" : "#0B1B0C" }}>
                    <Animated.Text
                      style={[
                        {
                          fontSize: 13,
                          fontWeight: "700",
                          fontFamily: "SfRegular",
                          color: "#8A8A8A",
                        },
                        { transform: [{ scale: priceAnim }] },
                      ]}
                    >
                      PKR
                    </Animated.Text>{" "}
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "800",
                        marginLeft: 2,
                        fontFamily: "SfRegular",
                      }}
                    >
                      {formatLargeNumber(
                        realtimeData?.c || SocketCloseData?.close_price,
                      )}
                    </Text>
                  </Text>

                  {/* Change Row */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 5,
                    }}
                  >
                    <View style={{ marginTop: 2 }}>
                      {isDark ? (
                        realtimeData?.pch < 0 ||
                        SocketCloseData?.percent_change < 0 ? (
                          <Svg
                            width="12"
                            height="10"
                            viewBox="0 0 7 6"
                            fill="none"
                          >
                            <Path
                              d="M3.53189 5.25C3.33944 5.58333 2.85831 5.58333 2.66586 5.25L0.0677876 0.75C-0.124662 0.416667 0.115901 0 0.500801 0H5.69695C6.08185 0 6.32242 0.416667 6.12997 0.75L3.53189 5.25Z"
                              fill="#FF6B6B"
                            />
                          </Svg>
                        ) : (
                          <Svg
                            width="12"
                            height="10"
                            viewBox="0 0 7 6"
                            fill="none"
                          >
                            <Path
                              d="M2.66586 0.25C2.85831 -0.0833337 3.33944 -0.0833333 3.53189 0.25L6.12997 4.75C6.32242 5.08333 6.08185 5.5 5.69695 5.5H0.5008C0.1159 5.5 -0.124662 5.08333 0.0677881 4.75L2.66586 0.25Z"
                              fill="#3FB950"
                            />
                          </Svg>
                        )
                      ) : realtimeData?.pch < 0 ||
                        SocketCloseData?.percent_change < 0 ? (
                        <Svg
                          width="12"
                          height="10"
                          viewBox="0 0 7 6"
                          fill="none"
                        >
                          <Path
                            d="M3.53189 5.25C3.33944 5.58333 2.85831 5.58333 2.66586 5.25L0.0677876 0.75C-0.124662 0.416667 0.115901 0 0.500801 0H5.69695C6.08185 0 6.32242 0.416667 6.12997 0.75L3.53189 5.25Z"
                            fill="#E00000"
                          />
                        </Svg>
                      ) : (
                        <Svg
                          width="12"
                          height="10"
                          viewBox="0 0 7 6"
                          fill="none"
                        >
                          <Path
                            d="M2.66586 0.25C2.85831 -0.0833337 3.33944 -0.0833333 3.53189 0.25L6.12997 4.75C6.32242 5.08333 6.08185 5.5 5.69695 5.5H0.5008C0.1159 5.5 -0.124662 5.08333 0.0677881 4.75L2.66586 0.25Z"
                            fill="#3FB950"
                          />
                        </Svg>
                      )}
                    </View>

                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        fontFamily: "SfRegular",
                        color: isDark
                          ? realtimeData?.pch < 0 ||
                            SocketCloseData?.percent_change < 0
                            ? "#FF6B6B"
                            : "#3FB950"
                          : realtimeData?.pch < 0 ||
                              SocketCloseData?.percent_change < 0
                            ? "#E00000"
                            : "#3FB950",
                        marginLeft: 4,
                      }}
                    >
                      {formatLargeNumber(
                        Math.abs(realtimeData?.ch) ||
                          Math.abs(SocketCloseData?.change),
                      )}{" "}
                      (
                      {/* {realtimeData?.pch > 0 ||
                      SocketCloseData?.percent_change > 0
                        ? "+"
                        : ""} */}
                      {(
                        Math.abs(realtimeData?.pch) ||
                        Math.abs(SocketCloseData?.percent_change) * 100
                      ).toFixed(2)}
                      % )
                    </Text>
                  </View>

                  {shouldShowEarnings && (
                    <View
                      style={{
                        // marginHorizontal: 20,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: "transparent",
                        borderWidth: colorScheme === "dark" ? 1 : 1,
                        borderColor:
                          colorScheme === "dark" ? "#FFFFFF26" : "#F0F0F0",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        width: 190,
                        marginTop: 6,
                      }}
                    >
                      <Image
                        source={
                          colorScheme === "dark"
                            ? require("../assets/overview_white_icon.png")
                            : require("../assets/overview_icon.png")
                        }
                        style={{ width: 16, height: 16 }}
                      />
                      <Text
                        style={{
                          color: colorScheme === "dark" ? "#FFFFFF" : "#000000",
                          fontSize: 13,
                          fontWeight: "500",
                          fontFamily: "SfRegular",
                        }}
                      >
                        {" "}
                        Earnings{" "}
                        {SymboleData?.date
                          ? SymboleData.date.split("-").reverse().join("-")
                          : "N/A"}
                        {/* {formattedDate} */}
                      </Text>
                      <Image
                        source={
                          colorScheme === "dark"
                            ? require("../assets/move_farward_white.png")
                            : require("../assets/move_farward.png")
                        }
                        style={{ width: 10, height: 10 }}
                      />
                    </View>
                  )}
                </View>

                {/* Right: High | Low | Volume */}
                <View style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: "row", gap: 20 }}>
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

                  <View style={{ marginTop: 8 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#8A8A8A",
                        fontWeight: "600",
                      }}
                    >
                      Volume
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: isDark ? "#FFFFFF" : "#0B1B0C",
                        marginTop: 4,
                      }}
                    >
                      {formatLargeNumber(
                        realtimeData?.v || SocketCloseData?.volume,
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Divider */}
              <View
                style={{
                  height: 1,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "#E6E6E6",
                  marginVertical: 10,
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
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

            {/* <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeGraphTab === "line" && styles.activeTab,
                ]}
                onPress={() => setActiveGraphTab("line")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeGraphTab === "line" && styles.activeTabText,
                  ]}
                >
                  Line Graph
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeGraphTab === "candle" && styles.activeTab,
                ]}
                onPress={() => setActiveGraphTab("candle")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeGraphTab === "candle" && styles.activeTabText,
                  ]}
                >
                  Candle Graph
                </Text>
              </TouchableOpacity>
            </View> */}
            {activeGraphTab === "candle" ? (
              // <OverViewGraph
              //   symbol={symbol}
              //   colorScheme={colorScheme}
              //   setActiveGraphTab={setActiveGraphTab}
              // />
              <NewUrlGraph symbol={symbol} />
            ) : (
              <OverViewLineGraph
                symbol={symbol}
                colorScheme={colorScheme}
                setActiveGraphTab={setActiveGraphTab}
                currentPrice={realtimeData?.c || SocketCloseData?.close_price}
              />
            )}

            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "Details" && styles.activeTab,
                ]}
                onPress={() => setActiveTab("Details")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "Details" && styles.activeTabText,
                  ]}
                >
                  Overview
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "Statistics" && styles.activeTab,
                ]}
                onPress={() => setActiveTab("Statistics")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "Statistics" && styles.activeTabText,
                  ]}
                >
                  Statistics
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "Reports" && styles.activeTab,
                ]}
                onPress={() => setActiveTab("Reports")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "Reports" && styles.activeTabText,
                  ]}
                >
                  AI
                </Text>
              </TouchableOpacity>
            </View>
            {/* Content based on active tab */}
            {renderContent()}
          </View>
        </ScrollView>
        {activeTab !== "Reports" &&
          profileuser &&
          profileuser?.status !== "unlinked" &&
          profileuser?.status !== "awaiting_approval" && (
            <View style={styles.stickyBottomButtons}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  alignContent: "center",
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  backgroundColor: isDark ? "black" : "#fff",
                  borderTopWidth: isDark ? 0 : 1,
                  borderTopColor: "#E0E0E0",
                  paddingBottom: 60,
                }}
              >
                <TouchableOpacity
                  onPress={
                    () => {
                      if (profileuser?.status === "need_credentials") {
                        router.push(`/ClientForm?symbol=${symbol}&order=Buy`);
                      } else {
                        router.push(`/Stockbuy?symbol=${symbol}&order=Buy`);
                      }
                    }
                    // router.push(`/Stockbuy?symbol=${symbol}&order=Buy`)
                  }
                  style={{ width: "48%" }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      backgroundColor: "#53BA83",
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "600",
                      paddingVertical: 16,
                      borderRadius: 16,
                    }}
                  >
                    Buy
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ width: "48%" }}
                  onPress={() => {
                    if (profileuser?.status === "need_credentials") {
                      router.push(`/ClientForm?symbol=${symbol}&order=Sell`);
                    } else {
                      router.push(`/Stockbuy?symbol=${symbol}&order=Sell`);
                    }
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      backgroundColor: "#E3422D",
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "600",
                      paddingVertical: 16,
                      borderRadius: 16,
                    }}
                  >
                    Sell
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
      </View>
      <Toast config={toastConfig} />
    </>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#fff",
    paddingTop: 50,
    paddingBottom: 200,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // backgroundColor: "#fff",
    minHeight: "100vh",
    marginTop: 300,
  },
  scrollView: {
    flex: 1,
    // backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    // paddingBottom: 10,
    // borderBottomWidth: 1,
    // borderBottomColor: "#eee",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    fontFamily: "SfRegular",
  },
  headerName: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "SfRegular",
    marginTop: 3,
  },
  // tabContainer: {
  // flexDirection: "row",
  // borderBottomWidth: 1,
  // borderBottomColor: "#eee",
  // marginTop: 24,
  // },
  // tab: {
  // flex: 1,
  // alignItems: "center",
  // fontFamily: "SfRegular",
  // border: 2,
  // },
  // activeTab: {
  // color: "red",
  // },
  // tabText: {
  // fontSize: 16,
  // fontWeight: "500",
  // color: "#8A8A8A",
  // border: 2,
  // borderColor: "red",
  // },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    minWidth: 80, // Adjust based on text length
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent", // Light gray for inactive
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
  activeTab: {
    backgroundColor: "#CCFFE4", // Green for active
    borderColor: "#53BA83",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8A8A8A", // Gray for inactive text
    textAlign: "center",
  },
  activeTabText: {
    color: "#29724B", // White for active text
  },
  priceContainer: {
    padding: 16,
    alignItems: "center",
  },
  price: {
    fontSize: 32,
    fontWeight: "bold",
  },
  change: {
    fontSize: 16,
    color: "#ff4444", // Red for negative change
  },
  miniChart: {
    width: "80%",
    height: 40,
    backgroundColor: "#ffdddd", // Placeholder for mini chart
    marginTop: 8,
  },
  chartContainer: {
    height: 200,
    backgroundColor: "#f0f0f0", // Placeholder for chart
    margin: 16,
    borderRadius: 8,
  },
  chart: {
    flex: 1,
    backgroundColor: "#ff9999", // Placeholder for chart content
  },
  infoContainer: {
    padding: 16,
  },
  infoText: {
    fontSize: 16,
    fontWeight: "500",
  },
  infoSubText: {
    fontSize: 12,
    color: "#666",
  },
  companyContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    fontFamily: "SfRegular",
  },
  logoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  newsContainer: {
    padding: 16,
  },
  newsItem: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  newsSubText: {
    fontSize: 12,
    color: "#666",
  },
  historyContainer: {
    padding: 16,
  },
  historyText: {
    fontSize: 16,
    marginBottom: 16,
  },
  historyChart: {
    height: 150,
    backgroundColor: "#e0e0e0", // Placeholder for historical chart
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    marginBottom: 10,
  },
  retryText: {
    color: "#58BA83",
    fontSize: 14,
    fontWeight: "600",
  },
  horizontalList: {
    // Added missing style for FlatList content container
    paddingHorizontal: 0,
  },
  rangeContainer: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 8,
  },
  valueText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  labelText: {
    fontSize: 12,
    color: "#000",
    fontWeight: "500",
  },
  sliderContainer: {
    width: "100%",
    marginVertical: 4,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  sliderLeft: {
    flex: 0.5, // Approximate 50% for low to thumb
    height: "100%",
    backgroundColor: "black", // Purple start
  },
  sliderThumb: {
    position: "absolute",
    left: "50%", // Center the thumb
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "black",
  },
  sliderRight: {
    flex: 0.5,
    height: "100%",
    backgroundColor: "black", // Blue end
  },
  // New style for sticky bottom buttons
  stickyBottomButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000, // Ensure it stays on top
  },
});

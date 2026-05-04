import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  StyleSheet,
  Animated,
  TouchableOpacity,
  View,
  Text,
  Image,
  Dimensions,
  ScrollView,
  AppState,
} from "react-native";
import { BaseUrl, SocketUrl } from "../constants/baseUrl";
import { useRouter } from "expo-router";
import { Svg, Path } from "react-native-svg";
import { useTheme } from "../hooks/ThemeContext";
// import DigitalScroll from "./DigitalScroll";
import DigitScroll from "./DigitalScroll";
export default function IndicesView({
  isConnected,
  setIsConnected,
  colorScheme,
}) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { width: screenWidth } = Dimensions.get("window");

  const indicesSymbols = {
    KSE100: { displayName: "KSE100", symbol: "KSE100" },
    KSE30: { displayName: "KSE30", symbol: "KSE30" },
    KMI30: { displayName: "KMI30", symbol: "KMI30" },
    KMIALLSHR: { displayName: "KMIALLSHR", symbol: "KMIALLSHR" },
  };

  const [indicesData, setIndicesData] = useState({
    KSE100: null,
    KSE30: null,
    KMI30: null,
    KMIALLSHR: null,
  });

  // Animation refs for smooth transitions
  const priceAnimations = useRef({});
  const changeAnimations = useRef({});

  // Initialize animations for each index
  useEffect(() => {
    Object.keys(indicesSymbols).forEach((symbol) => {
      priceAnimations.current[symbol] = new Animated.Value(1);
      changeAnimations.current[symbol] = new Animated.Value(1);
    });
  }, []);

  // Grid data: chunk into rows of 2
  const gridData = useMemo(() => {
    const items = Object.values(indicesData).filter(Boolean);
    const rows = [];
    for (let i = 0; i < items.length; i += 2) {
      rows.push(items.slice(i, i + 2));
    }
    return rows;
  }, [indicesData]);

  // console.log(gridData);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${BaseUrl}/api/stocks/stock/latest-stock-data/?symbols=KSE100,KSE30,KMI30,KMIALLSHR`,
        );
        const data = await response.json();
        // Transform API data to match WebSocket data structure
        const formattedData = data.reduce((acc, item) => {
          const symbol = item.symbol;
          if (indicesSymbols[symbol]) {
            acc[symbol] = {
              s: symbol,
              c: parseFloat(item.data.close_price),
              ch: parseFloat(item.data.change),
              pch: parseFloat(item.data.percent_change) * 100, // Convert to percentage to match WebSocket pch
              displayName: indicesSymbols[symbol].displayName,
              symbol: indicesSymbols[symbol].symbol,
              isPositive: parseFloat(item.data.percent_change) >= 0,
            };
          }
          return acc;
        }, {});
        setIndicesData((prev) => ({ ...prev, ...formattedData }));
        setLoading(false);
      } catch (err) {
        console.error("API fetch error:", err);
        setError("Failed to fetch initial data.");
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const animateValue = (animation, toValue, duration = 300) => {
    Animated.timing(animation, {
      toValue,
      duration,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    let websocket = null;
    let reconnectTimeout = null;
    let appStateSubscription = null;
    let isManuallyClosed = false;

    const closeSocket = (code = 1000, reason = "Cleanup") => {
      if (
        websocket &&
        (websocket.readyState === WebSocket.OPEN ||
          websocket.readyState === WebSocket.CONNECTING)
      ) {
        websocket.close(code, reason);
      }

      websocket = null;
    };
    const connect = () => {
      // Close existing connection if any
      if (websocket) {
        websocket.close();
      }

      websocket = new WebSocket("wss://feed.iel.net.pk");

      // Important: Explicitly set binaryType for binary data
      websocket.binaryType = "arraybuffer";

      websocket.onopen = () => {
        console.log("[WS] ✅ Connected");
        setIsConnected(true);
        setError(null);

        const symbols = Object.keys(indicesSymbols);
        if (symbols.length > 0) {
          const msg = { type: "subscribe", symbols };
          websocket.send(JSON.stringify(msg));
          console.log("[WS] 📤 Subscription sent for:", symbols);
        }
      };

      // Updated onmessage with proper Blob handling
      websocket.onmessage = async (event) => {
        let textData;

        try {
          // Handle binary (Blob) or text data
          if (event?.data instanceof Blob) {
            textData = await event?.data?.text();
            console.log("[WS] 📥 Received binary Blob → converted to text");
          } else if (typeof event.data === "string") {
            textData = event.data;
            console.log("[WS] 📥 Received text data");
          } else if (event.data instanceof ArrayBuffer) {
            const decoder = new TextDecoder("utf-8");
            textData = decoder.decode(event.data);
            console.log("[WS] 📥 Received ArrayBuffer → decoded");
          } else {
            console.warn("[WS] ⚠️ Unknown data type:", typeof event.data);
            return;
          }

          const msg = JSON.parse(textData);

          console.log("[WS] Received message:", msg);

          // Handle the actual tick data structure you're receiving
          if (msg?.type === "tick" && msg?.data?.s) {
            const tick = msg.data; // ← Real tick object
            const symbol = tick.s;

            // Ignore if not in our subscribed indices
            if (!indicesSymbols[symbol]) {
              return;
            }

            setIndicesData((prevData) => {
              const prevItem = prevData[symbol];

              const newPchPercent = Number(tick.pch) * 100; // convert to percentage
              const newItem = {
                s: symbol,
                c: Number(tick.c),
                pch: newPchPercent,
                displayName: indicesSymbols[symbol].displayName,
                symbol: indicesSymbols[symbol].symbol,
                isPositive: tick.pch >= 0,
                ch: tick.ch,
                ldcp: tick.ldcp,
                t: tick.t,
                // Add more fields here if needed (o, h, l, v, etc.)
              };

              // Only update + animate if there's a meaningful change
              const priceChanged =
                !prevItem || Math.abs(prevItem.c - newItem.c) > 0.001;
              const changeChanged =
                !prevItem || Math.abs(prevItem.pch - newPchPercent) > 0.0001;

              if (priceChanged || changeChanged) {
                const priceAnim = priceAnimations.current[symbol];
                const changeAnim = changeAnimations.current[symbol];

                if (priceAnim && changeAnim) {
                  // Price pulse animation
                  Animated.sequence([
                    Animated.timing(priceAnim, {
                      toValue: 1.14,
                      duration: 120,
                      useNativeDriver: true,
                    }),
                    Animated.timing(priceAnim, {
                      toValue: 1,
                      duration: 180,
                      useNativeDriver: true,
                    }),
                  ]).start();

                  // Change % pulse animation
                  Animated.sequence([
                    Animated.timing(changeAnim, {
                      toValue: 1.1,
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

                return { ...prevData, [symbol]: newItem };
              }

              return prevData; // No significant change → skip re-render
            });
          }

          // Optional: Log other control messages
          else if (msg.message || msg.type) {
            // console.log("[WS] Other message:", msg.message || msg.type, msg);
          }
        } catch (err) {
          console.error("[WS] ❌ Parse/processing error:", err);

          // Debug raw data when parsing fails
          if (event.data instanceof Blob) {
            try {
              const rawPreview = await event.data.text();
              console.log(
                "[WS] Raw Blob preview:",
                rawPreview.substring(0, 300),
              );
            } catch (_) {}
          } else if (typeof event.data === "string") {
            console.log(
              "[WS] Raw message preview:",
              event.data.substring(0, 250),
            );
          }
        }
      };

      websocket.onerror = (err) => {
        console.error("[WS] ❌ WebSocket error:", err);
        setError("WebSocket connection failed");
        setIsConnected(false);
      };

      websocket.onclose = (e) => {
        console.log(`[WS] 🔌 Disconnected (code: ${e.code})`);
        setIsConnected(false);

        // Optional: Auto-reconnect (uncomment when ready)
        // setTimeout(connect, 3000);
      };
    };
    connect();

    appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        console.log("[AppState] App became active -> reconnect socket");
        isManuallyClosed = false;
        connect();
      } else if (nextState === "background" || nextState === "inactive") {
        console.log("[AppState] App moved to background -> close socket");
        isManuallyClosed = true;
        closeSocket(1000, "App moved to background");
      }
    });

    return () => {
      isManuallyClosed = true;
      if (appStateSubscription) {
        appStateSubscription.remove();
      }
      closeSocket(1000, "Screen unfocused");
    };
  }, []);

  const handleStockPress = (symbol) => {
    try {
      router.push(`/NewGraph?symbol=${symbol}`);
    } catch (err) {
      console.error("Navigation error:", err);
      setError("Failed to navigate to stock details.");
    }
  };

  const formatPKR = (num) => {
    if (!num) return;
    const parts = Number(num).toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };
  const renderIndexCard = (item) => {
    // console.log("indices items", item);
    if (!item) return null;
    // console.log(item);

    const symbol = item.symbol || item.s;
    const priceAnim = priceAnimations.current[symbol];
    const changeAnim = changeAnimations.current[symbol];

    const isPositive = item.isPositive ?? item.pch >= 0;

    // Scale transform for smooth animation
    const priceTransform = priceAnim
      ? {
          transform: [{ scale: priceAnim }],
        }
      : {};

    const changeTransform = changeAnim
      ? {
          transform: [{ scale: changeAnim }],
        }
      : {};

    const itemWidth = (screenWidth - 20) / 2.4; // Account for 6px margin on each side per item

    // console.log(itemWidth);

    const formattedPrice = Number(item.c).toFixed(2);
    const formatedNewPrice = formatPKR(formattedPrice);

    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={[
            styles.indexItem,
            {
              width: itemWidth,
              backgroundColor: isDark ? "#222222" : "#F9F9F9",
              borderWidth: isDark ? 1 : 0,
              borderColor: isDark ? "#FFFFFF14" : "",
            },
          ]}
          activeOpacity={0.7}
          onPress={() => handleStockPress(item.symbol)}
        >
          <Animated.View style={[styles.indexLeft]}>
            {/* <View style={styles.symbolContainer}>
              <Text style={styles.indexSymbol}>
                {item.displayName || item.s || item.symbol}
              </Text>

              <Text
                style={[
                  styles.indexChange,
                  {
                    color: isPositive ? "#3FB950" : "#E00000",
                    fontWeight: "700",
                  },
                ]}
              >
                {item.pch ? item.pch.toFixed(2) : "0.00"}%
              </Text>
            </View> */}

            <View
              style={{
                flexDirection: "column",
                marginTop: 3,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={[
                    styles.indexSymbol,
                    {
                      color: isDark ? "#FFFFFF" : "#0B1B0C",
                    },
                  ]}
                >
                  {item.displayName || item.s || item.symbol}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  marginTop: 6,
                  alignItems: "center",
                }}
              >
                <Text
                  style={[
                    styles.changeText,
                    {
                      color: isDark
                        ? isPositive
                          ? "#3FB950"
                          : "#FF6B6B"
                        : isPositive
                          ? "#3FB950"
                          : "#E00000",
                      fontFamily: "SfRegular",
                      marginTop: 2,
                    },
                  ]}
                >
                  {item.c.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>

                {/* <DigitScroll
                  value={formatedNewPrice}
                  digitHeight={28}
                  duration={100}
                  style={[
                    styles.changeText,
                    {
                      color: isDark
                        ? isPositive
                          ? "#3FB950"
                          : "#FF6B6B"
                        : isPositive
                          ? "#3FB950"
                          : "#E00000",
                      fontSize: 15,
                      fontWeight: "600",
                      fontFamily: "SfRegular",
                      // marginTop: 3,
                    },
                  ]}
                /> */}

                <View style={{ marginLeft: 3, marginTop: 3 }}>
                  {isDark ? (
                    isPositive ? (
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
                  ) : isPositive ? (
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
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 6,
                }}
              >
                <View style={{ flexDirection: "row" }}>
                  <Text
                    style={[
                      styles.changeText,
                      {
                        color: isDark
                          ? isPositive
                            ? "#3FB950"
                            : "#FF6B6B"
                          : isPositive
                            ? "#3FB950"
                            : "#E00000",
                        fontFamily: "SfRegular",
                        // marginTop: 2,
                      },
                    ]}
                  >
                    {/* {item.ch ? item.ch.toFixed(2) : "0.00"} */}
                    {item.ch != null ? Math.abs(item.ch).toFixed(2) : "0.00"}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.changeText,
                    {
                      color: isDark
                        ? isPositive
                          ? "#3FB950"
                          : "#FF6B6B"
                        : isPositive
                          ? "#3FB950"
                          : "#E00000",
                      fontFamily: "SfRegular",
                    },
                  ]}
                >
                  ({/* {isPositive ? "+" : ""} */}
                  {item.pch ? Math.abs(item.pch).toFixed(2) : "0.00"}%)
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* <Animated.View style={[styles.indexRight, changeTransform]}>
            <Image
              source={
                isPositive
                  ? require("../assets/img1_new.png")
                  : require("../assets/img2_new.png")
              }
              style={[styles.indexIcon, { width: itemWidth - 32 }]} // Subtract paddingHorizontal * 2
            />
          </Animated.View> */}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.gridContainer}
    >
      {gridData.map((row, index) => (
        <View
          key={`row-${index}`}
          style={[
            styles.row,
            { marginBottom: index < gridData.length - 1 ? 12 : 0 },
          ]}
        >
          {row.map((item) => renderIndexCard(item))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  indexItem: {
    flexDirection: "column",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    // backgroundColor: "#F9F9F9",
    borderRadius: 8,
    // minHeight: 124,
    minHeight: 52,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 4,
    // elevation: 3,
  },
  changeText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "SfRegular",
  },
  indexLeft: {
    flex: 1,
  },
  symbolContainer: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  indexSymbol: {
    fontSize: 14,
    fontWeight: "500",

    fontFamily: "SfRegular",
  },
  indexPoints: {
    fontSize: 12,
    color: "#6E6E6E",
    fontFamily: "SfRegular",
  },
  indexChange: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "SfRegular",
  },
  indexRight: {
    alignItems: "center",
  },
  indexIcon: {
    height: 73,
    resizeMode: "contain", // Ensure image scales without distortion
  },
  gridContainer: {
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
});

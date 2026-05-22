import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
  Animated,
  ActivityIndicator,
  AppState,
  ImageBackground,
  Modal,
  RefreshControl,
} from "react-native";

const { width: screenWidth } = Dimensions.get("window");
import { useRouter } from "expo-router";
import { BaseUrl, SocketUrl, maxwidth } from "../../constants/baseUrl";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Import AsyncStorage
import { useFocusEffect } from "@react-navigation/native";
import IndicesView from "../../components/indices";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../supabaseConfig";
import { Svg, Path, Circle } from "react-native-svg";
import { StockLogo } from "../../components/StockLogo";
import { useColorScheme } from "@/hooks/useColorScheme";
import TradingViewChart from "../../components/TradingView";
import { useTheme } from "../../hooks/ThemeContext";
import Popover from "react-native-popover-view";

const InfoIcon = ({ color }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M12 16V12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Circle cx="12" cy="8" r="1" fill={color} />
  </Svg>
);
export default function Market() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();

  const [isConnected, setIsConnected] = useState(false);
  const [MappingData, setMappingData] = useState([]);
  const [GainersData, setGainersData] = useState([]);
  const [DeclinersData, setDeclinersData] = useState([]);
  const [TrendingStocksData, setTrendingStocksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentlyVisited, setRecentlyVisited] = useState([]); // State for recently visited stocks
  const [recentlyVisitedData, setRecentlyVisitedData] = useState([]); // State for recently visited stocks
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [isAccount, setisAccount] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [profileuser, setprofileUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(""); // Profile picture URL
  const [IsModalVisible, setIsModalVisible] = useState(false); // Profile picture URL
  const [ClientPorfolio, setClientPorfolio] = useState([]);
  const [CompletedOrders, setCompletedOrders] = useState([]);
  const [ClientData, setClientData] = useState([]);
  const [MarketingBannerData, setMarketingBannerData] = useState();
  const [latestPrices, setLatestPrices] = useState({});
  const [holdingsRealtime, setHoldingsRealtime] = useState({}); // symbol → {c, pch, ch, ...}
  const [holdingsEOD, setHoldingsEOD] = useState({}); // symbol → {c: number, ldcp: number, ...}

  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);

  const [marketStats, setMarketStats] = useState({
    gainers: [],
    losers: [],
    trending: [],
  });

  console.log("Market Stats:", marketStats);

  const gainersPriceAnims = useRef({}); // symbol → Animated.Value for price
  const gainersChangeAnims = useRef({}); // symbol → Animated.Value for % change
  const declinersPriceAnims = useRef({});
  const declinersChangeAnims = useRef({});

  // Trending
  const trendingPriceAnims = useRef({});
  const trendingChangeAnims = useRef({});

  // Recently Visited
  const recentPriceAnims = useRef({});
  const recentChangeAnims = useRef({});
  const priceAnimations = useRef({});
  const changeAnimations = useRef({});
  const holdingsPriceAnims = useRef({});
  const holdingsChangeAnims = useRef({});

  // console.log("Marketing Banner Data", MarketingBannerData);

  // const allWatchedSymbols = useMemo(() => {
  //   const symbols = new Set();

  //   // Gainers
  //   GainersData.forEach((item) => symbols.add(item.symbol));

  //   // Decliners
  //   DeclinersData.forEach((item) => symbols.add(item.symbol));

  //   // Trending
  //   TrendingStocksData.forEach((item) => symbols.add(item.symbol));

  //   // Recently visited
  //   recentlyVisited.forEach((sym) => symbols.add(sym));

  //   return Array.from(symbols).filter(Boolean);
  // }, [GainersData, DeclinersData, TrendingStocksData, recentlyVisited]);

  const holdingsSymbols = useMemo(() => {
    if (!ClientPorfolio?.holdings?.length) return [];

    return [
      ...new Set(
        ClientPorfolio.holdings.map((h) => String(h.security)).filter(Boolean),
      ),
    ];
  }, [ClientPorfolio]);

  const watchedSymbolsKey = useMemo(() => {
    const set = new Set([
      // ...GainersData.map((i) => i.symbol),
      // ...DeclinersData.map((i) => i.symbol),
      // ...TrendingStocksData.map((i) => i.symbol),
      ...recentlyVisited,
      ...holdingsSymbols,
    ]);

    return Array.from(set).filter(Boolean).sort().join(","); // stable string key
  }, [TrendingStocksData, recentlyVisited]);

  const allWatchedSymbols = useMemo(() => {
    return watchedSymbolsKey.split(",").filter(Boolean);
  }, [watchedSymbolsKey]);
  // console.log("All Symbole", allWatchedSymbols);

  useEffect(() => {
    // Initialize animations for all current gainers
    GainersData.forEach((item) => {
      const symbol = item.symbol;
      if (!gainersPriceAnims.current[symbol]) {
        gainersPriceAnims.current[symbol] = new Animated.Value(1);
      }
      if (!gainersChangeAnims.current[symbol]) {
        gainersChangeAnims.current[symbol] = new Animated.Value(1);
      }
    });

    // Optional: clean up old ones that are no longer in list (memory optimization)
    Object.keys(gainersPriceAnims.current).forEach((sym) => {
      if (!GainersData.some((g) => g.symbol === sym)) {
        delete gainersPriceAnims.current[sym];
        delete gainersChangeAnims.current[sym];
      }
    });
  }, [GainersData]);

  useEffect(() => {
    DeclinersData.forEach((item) => {
      const symbol = item.symbol;
      if (!declinersPriceAnims.current[symbol]) {
        declinersPriceAnims.current[symbol] = new Animated.Value(1);
      }
      if (!declinersChangeAnims.current[symbol]) {
        declinersChangeAnims.current[symbol] = new Animated.Value(1);
      }
    });

    // Cleanup old symbols
    Object.keys(declinersPriceAnims.current).forEach((sym) => {
      if (!DeclinersData.some((d) => d.symbol === sym)) {
        delete declinersPriceAnims.current[sym];
        delete declinersChangeAnims.current[sym];
      }
    });
  }, [DeclinersData]);

  useEffect(() => {
    TrendingStocksData.forEach((item) => {
      const symbol = item.symbol;
      if (!trendingPriceAnims.current[symbol]) {
        trendingPriceAnims.current[symbol] = new Animated.Value(1);
      }
      if (!trendingChangeAnims.current[symbol]) {
        trendingChangeAnims.current[symbol] = new Animated.Value(1);
      }
    });

    Object.keys(trendingPriceAnims.current).forEach((sym) => {
      if (!TrendingStocksData.some((t) => t.symbol === sym)) {
        delete trendingPriceAnims.current[sym];
        delete trendingChangeAnims.current[sym];
      }
    });
  }, [TrendingStocksData]);

  // Recently Visited animations
  useEffect(() => {
    recentlyVisitedData.forEach((item) => {
      const symbol = item.symbol;
      if (!recentPriceAnims.current[symbol]) {
        recentPriceAnims.current[symbol] = new Animated.Value(1);
      }
      if (!recentChangeAnims.current[symbol]) {
        recentChangeAnims.current[symbol] = new Animated.Value(1);
      }
    });

    Object.keys(recentPriceAnims.current).forEach((sym) => {
      if (!recentlyVisitedData.some((r) => r.symbol === sym)) {
        delete recentPriceAnims.current[sym];
        delete recentChangeAnims.current[sym];
      }
    });
  }, [recentlyVisitedData]);

  const triggerPulseAnimation = useCallback((symbol, isPrice = true) => {
    const priceAnim = gainersPriceAnims.current[symbol];
    const changeAnim = gainersChangeAnims.current[symbol];

    if (!priceAnim || !changeAnim) return;

    // Price gets slightly bigger bounce
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

    // Change % gets smaller bounce
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
  }, []);

  // useFocusEffect(
  //   useCallback(() => {
  //     // ───────────────────────────────────────────────
  //     // 1. No symbols → skip connection completely
  //     // ───────────────────────────────────────────────
  //     if (allWatchedSymbols.length === 0) {
  //       console.log("[WS] No symbols to watch right now → no connection");
  //       setIsConnected(false);
  //       return () => {}; // no cleanup needed
  //     }

  //     let ws = null;
  //     let reconnectTimer = null;
  //     const connect = () => {
  //       // Close any existing connection first to avoid duplicates
  //       if (ws) {
  //         ws.close();
  //       }

  //       ws = new WebSocket("wss://feed.iel.net.pk");

  //       // Crucial: Set binaryType so binary messages come as Blob
  //       ws.binaryType = "arraybuffer";

  //       ws.onopen = () => {
  //         setIsConnected(true);
  //         console.log("[WS] ✅ Connected → subscribing to current symbols");

  //         ws.send(
  //           JSON.stringify({
  //             type: "subscribe",
  //             symbols: allWatchedSymbols, // always use latest list
  //           }),
  //         );

  //         ws.send("Stats");

  //         let statsTimer = setInterval(() => {
  //           if (ws && ws.readyState === WebSocket.OPEN) {
  //             ws.send("Stats");
  //             console.log("[WS] Stats sent again");
  //           }
  //         }, 20000);
  //       };

  //       // Updated onmessage with async binary handling
  //       ws.onmessage = async (event) => {
  //         let textData;

  //         try {
  //           // === Handle Binary (Blob) or Text data ===
  //           if (event.data instanceof Blob) {
  //             textData = await event.data.text();
  //             // console.log("[WS] 📥 Received binary Blob data");
  //           } else if (typeof event.data === "string") {
  //             textData = event.data;
  //             // console.log("[WS] 📥 Received text data");
  //           } else if (event.data instanceof ArrayBuffer) {
  //             const decoder = new TextDecoder("utf-8");
  //             textData = decoder.decode(event.data);
  //             console.log("[WS] 📥 Received ArrayBuffer data");
  //           } else {
  //             console.warn(
  //               "[WS] ⚠️ Unknown data type received:",
  //               typeof event.data,
  //             );
  //             return;
  //           }

  //           // Parse JSON
  //           const msg = JSON.parse(textData);

  //           // Save stats response in a new state
  //           if (msg?.gainers || msg?.losers || msg?.trending) {
  //             setMarketStats({
  //               gainers: msg.gainers || [],
  //               losers: msg.losers || [],
  //               trending: msg.trending || [],
  //             });

  //             console.log("[WS] Stats saved:", msg);
  //             return;
  //           }

  //           // Handle tick data
  //           if (msg?.type === "tick") {
  //             const tick = msg.data;
  //             const symbol = tick.s;

  //             // Safety check
  //             if (!allWatchedSymbols.includes(symbol)) return;

  //             const newPrice = Number(tick.c);
  //             const newPch = Number(tick.pch) * 100;
  //             const isPos = tick.pch >= 0;

  //             setLatestPrices((prev) => {
  //               const existing = prev[symbol] || {};

  //               const priceDelta = Math.abs((existing.c || 0) - newPrice);
  //               const pchDelta = Math.abs((existing.pch || 0) - newPch);

  //               // Trigger animation only on meaningful changes
  //               const shouldAnimate =
  //                 priceDelta > 0.001 || Math.abs(pchDelta) > 0.005;

  //               if (shouldAnimate) {
  //                 triggerPulseAnimation(symbol);
  //               }

  //               // Skip very tiny updates to reduce unnecessary re-renders
  //               if (priceDelta < 0.01 && pchDelta < 0.01) {
  //                 return prev;
  //               }

  //               return {
  //                 ...prev,
  //                 [symbol]: {
  //                   c: newPrice,
  //                   pch: newPch,
  //                   ch: Number(tick.ch || existing.ch || 0),
  //                   ldcp: Number(tick.ldcp || existing.ldcp || 0),
  //                   v: Number(tick.v || existing.v || 0),
  //                   isPositive: isPos,
  //                   t: tick.t || Date.now(),
  //                 },
  //               };
  //             });
  //           }
  //         } catch (err) {
  //           console.error("[WS] ❌ Parse/processing error:", err);

  //           // Debug raw data when parsing fails
  //           try {
  //             if (event.data instanceof Blob) {
  //               const rawPreview = await event.data.text();
  //               console.log(
  //                 "[WS] Raw Blob preview:",
  //                 rawPreview.substring(0, 250),
  //               );
  //             } else if (typeof event.data === "string") {
  //               console.log(
  //                 "[WS] Raw message preview:",
  //                 event.data.substring(0, 250),
  //               );
  //             }
  //           } catch (_) {}
  //         }
  //       };

  //       ws.onerror = (e) => {
  //         console.error("[WS] ❌ WebSocket error:", e);
  //         setIsConnected(false);
  //       };

  //       ws.onclose = (e) => {
  //         console.log(`[WS] 🔌 Disconnected (code: ${e.code})`);
  //         setIsConnected(false);

  //         // Auto-reconnect only on abnormal closure (not clean close)
  //         if (e.code !== 1000) {
  //           console.log("[WS] Reconnecting in 5s...");
  //           reconnectTimer = setTimeout(connect, 5000);
  //         }
  //       };
  //     };
  //     connect();

  //     // ─── Cleanup when screen blurs or symbols change ───
  //     return () => {
  //       // console.log(
  //       //   "[WS] Cleaning up... (symbols count was:",
  //       //   allWatchedSymbols.length,
  //       //   ")",
  //       // );

  //       // Force close if still open/connecting
  //       if (
  //         ws &&
  //         (ws.readyState === WebSocket.OPEN ||
  //           ws.readyState === WebSocket.CONNECTING)
  //       ) {
  //         ws.close(1000, "Screen lost focus or symbol list changed");
  //       }

  //       if (reconnectTimer) {
  //         clearTimeout(reconnectTimer);
  //       }

  //       setIsConnected(false);
  //     };
  //   }, [allWatchedSymbols]), // ← Crucial: depend on allWatchedSymbols
  // );
  useFocusEffect(
    useCallback(() => {
      let ws = null;
      let reconnectTimer = null;
      let statsTimer = null;
      let appStateSubscription = null;
      let isManuallyClosed = false;

      const clearAllTimers = () => {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }

        if (statsTimer) {
          clearInterval(statsTimer);
          statsTimer = null;
        }
      };

      const closeSocket = (code = 1000, reason = "Cleanup") => {
        clearAllTimers();

        if (
          ws &&
          (ws.readyState === WebSocket.OPEN ||
            ws.readyState === WebSocket.CONNECTING)
        ) {
          ws.close(code, reason);
        }

        ws = null;
        setIsConnected(false);
      };

      const connect = () => {
        clearAllTimers();

        if (
          ws &&
          (ws.readyState === WebSocket.OPEN ||
            ws.readyState === WebSocket.CONNECTING)
        ) {
          return;
        }

        ws = new WebSocket("wss://feed.iel.net.pk");
        ws.binaryType = "arraybuffer";

        ws.onopen = () => {
          setIsConnected(true);
          console.log("[WS] Connected");

          if (allWatchedSymbols.length > 0) {
            ws.send(
              JSON.stringify({
                type: "subscribe",
                symbols: allWatchedSymbols,
              }),
            );
          }

          ws.send("Stats");

          statsTimer = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send("Stats");
            }
          }, 20000);
        };

        ws.onmessage = async (event) => {
          let textData;

          try {
            if (event.data instanceof Blob) {
              textData = await event.data.text();
            } else if (typeof event.data === "string") {
              textData = event.data;
            } else if (event.data instanceof ArrayBuffer) {
              const decoder = new TextDecoder("utf-8");
              textData = decoder.decode(event.data);
            } else {
              return;
            }

            const msg = JSON.parse(textData);

            if (msg?.gainers || msg?.losers || msg?.trending) {
              setMarketStats({
                gainers: msg.gainers || [],
                losers: msg.losers || [],
                trending: msg.trending || [],
              });
              return;
            }

            if (msg?.type === "tick") {
              const tick = msg.data;
              const symbol = tick.s;

              if (!allWatchedSymbols.includes(symbol)) return;

              const newPrice = Number(tick.c);
              const newPch = Number(tick.pch) * 100;
              const isPos = tick.pch >= 0;

              setLatestPrices((prev) => {
                const existing = prev[symbol] || {};
                const priceDelta = Math.abs((existing.c || 0) - newPrice);
                const pchDelta = Math.abs((existing.pch || 0) - newPch);

                if (priceDelta > 0.001 || Math.abs(pchDelta) > 0.005) {
                  triggerPulseAnimation(symbol);
                }

                if (priceDelta < 0.01 && pchDelta < 0.01) {
                  return prev;
                }

                return {
                  ...prev,
                  [symbol]: {
                    c: newPrice,
                    pch: newPch,
                    ch: Number(tick.ch || existing.ch || 0),
                    ldcp: Number(tick.ldcp || existing.ldcp || 0),
                    v: Number(tick.v || existing.v || 0),
                    isPositive: isPos,
                    t: tick.t || Date.now(),
                  },
                };
              });

              if (holdingsSymbols.includes(symbol)) {
                setHoldingsRealtime((prev) => ({
                  ...prev,
                  [symbol]: {
                    c: Number(tick.c) || 0,
                    pch: Number(tick.pch || 0) * 100,
                    ch: Number(tick.ch || 0),
                    ldcp: Number(tick.ldcp || 0),
                    isPositive: Number(tick.pch || 0) >= 0,
                    timestamp: tick.t || Date.now(),
                  },
                }));
              }
            }
          } catch (err) {
            console.error("[WS] Parse/processing error:", err);
          }
        };

        ws.onerror = (e) => {
          console.error("[WS] Error:", e);
          setIsConnected(false);
        };

        ws.onclose = (e) => {
          console.log(`[WS] Closed: ${e.code}`);
          setIsConnected(false);
          clearAllTimers();

          if (!isManuallyClosed && e.code !== 1000) {
            reconnectTimer = setTimeout(() => {
              connect();
            }, 5000);
          }
        };
      };

      connect();

      appStateSubscription = AppState.addEventListener(
        "change",
        (nextState) => {
          if (nextState === "active") {
            console.log("[AppState] App became active -> reconnect socket");
            isManuallyClosed = false;
            connect();
          } else if (nextState === "background" || nextState === "inactive") {
            console.log("[AppState] App moved to background -> close socket");
            isManuallyClosed = true;
            closeSocket(1000, "App moved to background");
          }
        },
      );

      return () => {
        isManuallyClosed = true;
        if (appStateSubscription) {
          appStateSubscription.remove();
        }
        closeSocket(1000, "Screen unfocused");
      };
    }, [allWatchedSymbols, triggerPulseAnimation]),
  );

  const formatPKR = (num) => {
    if (!num) return;
    const parts = Number(num).toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };
  // console.log("Profile User Data", profileuser);
  const router = useRouter();

  const fetchClientCode = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("ClientCode")
        .select("*")
        .eq("userId", userId)
        .maybeSingle();
      // console.log(data);
      setClientData(data);
    } catch (err) {
      console.error("Fetch Client Code error:", err);
    }
  }, [userId]);

  const fetchMarketingBanner = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("marketing_banner")
        .select("*");

      setMarketingBannerData(data);
    } catch (err) {
      console.error("Fetch marketing_banner error:", err);
    }
  }, []);

  const fetchHoldingsLatestPrices = useCallback(async () => {
    if (!holdingsSymbols?.length) return;

    try {
      const symbolsStr = holdingsSymbols.join(",");
      // console.log(symbolsStr);
      const response = await fetch(
        `${BaseUrl}/api/stocks/stock/latest-stock-data/?symbols=${symbolsStr}`,
        // or better endpoint if you have one that returns ldcp + last close reliably
      );

      if (!response.ok) throw new Error("Failed to fetch latest prices");

      const data = await response.json(); // expect array or object { symbol: {c, ldcp, ch, pch, ...} }

      const priceMap = {};
      // Adjust parsing depending on your actual API response shape
      data.forEach((item) => {
        priceMap[item.symbol] = {
          c: Number(item?.data?.close_price || 0),
          ldcp: Number(item.data?.last_day_close || 0),
          ch: Number(item.data?.change || 0),
          pch: Number(item.data?.percent_change || 0),
        };
      });

      setHoldingsEOD(priceMap);
      // console.log(
      //   "Fetched EOD/latest prices for holdings:",
      //   Object.keys(priceMap),
      // );
    } catch (err) {
      console.error("Could not fetch fallback prices:", err);
    }
  }, [holdingsSymbols, BaseUrl]);

  // useEffect(() => {
  //   fetchHoldingsLatestPrices();
  // }, [holdingsSymbols]);
  useFocusEffect(
    useCallback(() => {
      fetchHoldingsLatestPrices();

      // Optional: return cleanup function if needed
      // return () => { cancelFetch?.(); };
    }, [holdingsSymbols]), // ← dependencies still work
  );

  console.log("Holdings Symbols:", holdingsSymbols);
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchClientCode();
      }
    }, [userId, fetchClientCode]),
  );

  useFocusEffect(
    useCallback(() => {
      fetchMarketingBanner();
    }, [fetchMarketingBanner]),
  );

  // console.log("Client Data", ClientData);
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
            // clientCode: "0034",
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

  const fetchCompletedOrder = async () => {
    try {
      const response = await fetch(
        "https://trade.iel.net.pk:1219/iel/pendingOrders",
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
  useFocusEffect(
    useCallback(() => {
      if (!ClientData?.cliendCode) return; // fixed typo

      const loadPortfolio = async () => {
        try {
          setLoading(true);
          const data = await fetchClientPortfolio();
          setClientPorfolio(data?.detailInformation?.[0]);
        } catch (err) {
          setError(err.message || "Failed to load portfolio");
        } finally {
          setLoading(false);
        }
      };

      const loadCompletedOrder = async () => {
        try {
          setLoading(true);
          const data = await fetchCompletedOrder();
          // console.log(data);
          setCompletedOrders(data?.detailInformation);
        } catch (err) {
          setError(err.message || "Failed to load portfolio");
        } finally {
          setLoading(false);
        }
      };

      loadPortfolio();
      loadCompletedOrder();

      // Optional: cleanup (good practice)
      return () => {
        // If you need to cancel requests or reset state on blur
        // e.g. abortController.abort();
      };
    }, [ClientData?.cliendCode]), // ← Only depend on what actually changes
  );

  // useEffect(() => {
  //   let websocket = null;
  //   let reconnectTimeout = null;
  //   const connect = () => {
  //     if (!holdingsSymbols) return;
  //     // console.log("Attempting WebSocket connection...");

  //     https: websocket = new WebSocket("ws://localhost:8080");

  //     websocket.onopen = () => {
  //       // console.log("WebSocket connected");
  //       setIsConnected(true);
  //       // console.log(holdingsSymbols);
  //       const symbols = holdingsSymbols;
  //       // console.log(symbols);
  //       if (symbols.length > 0) {
  //         const msg = { type: "subscribe", symbols };
  //         websocket.send(JSON.stringify(msg));
  //       }
  //     };

  //     // websocket.onmessage = (event) => {
  //     //   // console.log("[WS] raw message:", event.data);

  //     //   try {
  //     //     const msg = JSON.parse(event.data);

  //     //     // Only process valid tick messages for indices
  //     //     if (msg.type === "tick" && msg.data && msg.data.s) {
  //     //       const tick = msg.data;
  //     //       const symbol = tick.s;

  //     //       // Skip if not one of our tracked indices
  //     //       if (!holdingsSymbols.includes(symbol)) return;

  //     //       setIndicesData((prevData) => {
  //     //         const prevItem = prevData[symbol];

  //     //         const newPchPercent = Number(tick.pch) * 100; // server sends 0.00096 → becomes 0.096%
  //     //         const newItem = {
  //     //           s: symbol,
  //     //           c: Number(tick.c),
  //     //           pch: newPchPercent,
  //     //           displayName: indicesSymbols[symbol].displayName,
  //     //           symbol: indicesSymbols[symbol].symbol,
  //     //           isPositive: tick.pch >= 0,
  //     //           // Optional: store more fields if you want to show them later
  //     //           ch: tick.ch,
  //     //           ldcp: tick.ldcp,
  //     //           t: tick.t, // unix timestamp
  //     //         };

  //     //         // Only update + animate if price or change actually moved
  //     //         if (
  //     //           !prevItem ||
  //     //           Math.abs(prevItem.c - newItem.c) > 0.001 ||
  //     //           Math.abs(prevItem.pch - newPchPercent) > 0.0001
  //     //         ) {
  //     //           const priceAnim = priceAnimations.current[symbol];
  //     //           const changeAnim = changeAnimations.current[symbol];

  //     //           if (priceAnim && changeAnim) {
  //     //             // Quick pulse animation on update
  //     //             Animated.sequence([
  //     //               Animated.timing(priceAnim, {
  //     //                 toValue: 1.12,
  //     //                 duration: 140,
  //     //                 useNativeDriver: true,
  //     //               }),
  //     //               Animated.timing(priceAnim, {
  //     //                 toValue: 1,
  //     //                 duration: 180,
  //     //                 useNativeDriver: true,
  //     //               }),
  //     //             ]).start();

  //     //             Animated.sequence([
  //     //               Animated.timing(changeAnim, {
  //     //                 toValue: 1.08,
  //     //                 duration: 160,
  //     //                 useNativeDriver: true,
  //     //               }),
  //     //               Animated.timing(changeAnim, {
  //     //                 toValue: 1,
  //     //                 duration: 220,
  //     //                 useNativeDriver: true,
  //     //               }),
  //     //             ]).start();
  //     //           }

  //     //           // console.log(
  //     //           //   `[WS] Updated ${symbol}: ${tick.c.toFixed(
  //     //           //     2
  //     //           //   )}, ${newPchPercent.toFixed(3)}%`
  //     //           // );

  //     //           return { ...prevData, [symbol]: newItem };
  //     //         }

  //     //         return prevData;
  //     //       });
  //     //     }
  //     //   } catch (err) {
  //     //     console.error(
  //     //       "[WS] parse or processing error:",
  //     //       err,
  //     //       "raw:",
  //     //       event.data
  //     //     );
  //     //   }
  //     // };

  //     websocket.onmessage = (event) => {
  //       try {
  //         const msg = JSON.parse(event.data);

  //         if (msg.type !== "tick" || !msg.data?.s) return;

  //         const tick = msg.data;
  //         const symbol = tick.s;

  //         // Safety check - only process our symbols
  //         if (!holdingsSymbols.includes(symbol)) return;

  //         const newPchPercent = Number(tick.pch) * 100;

  //         setHoldingsRealtime((prev) => {
  //           const existing = prev[symbol] || {};

  //           // Skip very small changes to reduce re-renders
  //           if (
  //             Math.abs(existing.c - tick.c) < 0.001 &&
  //             Math.abs(existing.pch - newPchPercent) < 0.001
  //           ) {
  //             return prev;
  //           }

  //           // Trigger animation
  //           const priceAnim = holdingsPriceAnims.current[symbol];
  //           const changeAnim = holdingsChangeAnims.current[symbol];

  //           if (priceAnim && changeAnim) {
  //             // Quick pulse effect
  //             Animated.sequence([
  //               Animated.timing(priceAnim, {
  //                 toValue: 1.12,
  //                 duration: 140,
  //                 useNativeDriver: true,
  //               }),
  //               Animated.timing(priceAnim, {
  //                 toValue: 1,
  //                 duration: 180,
  //                 useNativeDriver: true,
  //               }),
  //             ]).start();

  //             Animated.sequence([
  //               Animated.timing(changeAnim, {
  //                 toValue: 1.08,
  //                 duration: 160,
  //                 useNativeDriver: true,
  //               }),
  //               Animated.timing(changeAnim, {
  //                 toValue: 1,
  //                 duration: 220,
  //                 useNativeDriver: true,
  //               }),
  //             ]).start();
  //           }

  //           return {
  //             ...prev,
  //             [symbol]: {
  //               c: Number(tick.c),
  //               pch: newPchPercent,
  //               ch: Number(tick.ch || 0),
  //               ldcp: Number(tick.ldcp || 0),
  //               isPositive: tick.pch >= 0,
  //               timestamp: tick.t || Date.now(),
  //             },
  //           };
  //         });
  //       } catch (err) {
  //         console.error("Portfolio WS message error:", err);
  //       }
  //     };
  //     websocket.onerror = (err) => {
  //       console.error("WebSocket error:", err);
  //       setError("Connection failed – check console/network tab");
  //       setIsConnected(false);
  //     };

  //     websocket.onclose = (e) => {
  //       // console.log("WebSocket closed", e.code, e.reason);
  //       setIsConnected(false);
  //       // Optional: auto-reconnect logic here
  //     };
  //   };
  //   connect();

  //   return () => {
  //     if (websocket) {
  //       websocket.close(1000, "Component unmounting");
  //     }
  //     if (reconnectTimeout) clearTimeout(reconnectTimeout);
  //   };
  // }, [holdingsSymbols]);

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
      setUserId(user.id);
    } catch (err) {
      // Alert.alert("Error", err.message);
      // console.log("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileuser?.block === true) {
      setIsModalVisible(true);
    }
  }, [profileuser]);
  useEffect(() => {
    fetchUser();
  }, []);

  // useEffect(() => {
  //   supabase.auth.getSession().then(({ data: { session } }) => {
  //     setUserId(session?.user?.id ?? null);
  //   });

  //   const {
  //     data: { subscription },
  //   } = supabase.auth.onAuthStateChange((event, session) => {
  //     setUserId(session?.user?.id ?? null);
  //   });

  //   return () => subscription.unsubscribe();
  // }, []);

  const fetchProfileUser = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        if (error.code === "PGRST116") {
          await supabase
            .from("profiles")
            .insert({ id: userId /* default fields */ });
          // Retry fetch
          return fetchProfileUser();
        }
      } else {
        setprofileUser(data ?? null); // Fallback to null if missing
        // console.log(data);
        setisAccount(data?.status === "linked");
        // console.log("Profile fetched:", data);
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
    }, [userId, fetchProfileUser]),
  );
  const handleSearchSubmit = () => {
    if (searchText.trim()) {
      router.push(`/Search?query=${encodeURIComponent(searchText.trim())}`);
      // router.push("/StockDetail?symbol=MCB");
      setSearchText(""); // Optional: Clear the search input after navigation
    }
  };
  const clearCacheIfNeeded = useCallback(async () => {
    // console.log("functionCalled");
    try {
      const tsStr = await AsyncStorage.getItem("lastActiveTimestamp");
      const now = Date.now();
      let shouldClear = false;

      if (!tsStr) {
        shouldClear = true;
      } else {
        const lastTime = parseInt(tsStr);
        const diffMs = now - lastTime;
        const threshold = 600000;
        if (diffMs > threshold) {
          shouldClear = true;
        }
      }

      if (shouldClear) {
        await AsyncStorage.removeItem("gainersDeclinersData");
        await AsyncStorage.removeItem("lastActiveTimestamp");
        // console.log(
        //   "Cache cleared due to reload or long inactivity (over 1 hour)"
        // );
      } else if (!tsStr) {
        // Update timestamp since app is active now
        await AsyncStorage.setItem("lastActiveTimestamp", now.toString());
      }
    } catch (e) {
      console.error("Error checking cache clearance:", e);
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (nextAppState === "active") {
          const tsStr = await AsyncStorage.getItem("lastActiveTimestamp");
          if (!tsStr) {
            const now = Date.now();
            await AsyncStorage.setItem("lastActiveTimestamp", now.toString());
          }
        }
      },
    );

    return () => subscription?.remove();
  }, []);

  const storeStockInHistory = async (symbol) => {
    try {
      // Retrieve existing history
      const storedHistory = await AsyncStorage.getItem("stockHistory");
      let history = storedHistory ? JSON.parse(storedHistory) : [];

      // Avoid duplicates and limit to 10 recent stocks
      if (!history.includes(symbol)) {
        history = [symbol, ...history].slice(0, 3); // Add new symbol at the start, limit to 10
        await AsyncStorage.setItem("stockHistory", JSON.stringify(history));
        setRecentlyVisited(history); // Update state for display
      }
    } catch (err) {
      console.error("Error storing stock in AsyncStorage:", err);
      // setError("Failed to save stock to history.");
    }
  };

  const loadStockHistory = useCallback(async () => {
    try {
      const storedHistory = await AsyncStorage.getItem("stockHistory");
      if (storedHistory) {
        setRecentlyVisited(JSON.parse(storedHistory));
      }
    } catch (err) {
      console.error("Error loading stock history:", err);
      setError("Failed to load stock history.");
    }
  }, []);

  const handleStockPress = (symbol) => {
    try {
      router.push(`/StockDetail?symbol=${symbol}`);
      storeStockInHistory(symbol);
    } catch (err) {
      console.error("Navigation error:", err);
      setError("Failed to navigate to stock details.");
    }
  };

  // const loadGainersAndDecliners = useCallback(async () => {
  //   const key = "gainersDeclinersData";
  //   setError(null);
  //   try {
  //     // Try to load from AsyncStorage first
  //     const cached = await AsyncStorage.getItem(key);
  //     if (cached) {
  //       const data = JSON.parse(cached);
  //       setMappingData(data);
  //       return; // Use cached data
  //     }
  //   } catch (cacheErr) {
  //     console.error("Error loading cached gainers/decliners:", cacheErr);
  //   }

  //   // If no cache or error, fetch from API
  //   try {
  //     const response = await fetch(`${BaseUrl}/api/stocks/stock/top-bottom/`);
  //     if (!response.ok) {
  //       throw new Error("Network response was not ok");
  //     }
  //     const data = await response.json();
  //     // Save to AsyncStorage
  //     await AsyncStorage.setItem(key, JSON.stringify(data));
  //     setMappingData(data);
  //   } catch (err) {
  //     console.error("Error fetching gainers/decliners:", err);
  //     setError("Failed to fetch gainers/decliners. Please try again later.");
  //   }
  // }, []);

  // const loadTrendingStocks = useCallback(async () => {
  //   const key = "trendingStocksData";
  //   setError(null);
  //   try {
  //     // Try to load from AsyncStorage first
  //     const cached = await AsyncStorage.getItem(key);
  //     if (cached) {
  //       const data = JSON.parse(cached);
  //       setTrendingStocksData(data);
  //       return; // Use cached data
  //     }
  //   } catch (cacheErr) {
  //     console.error("Error loading cached trending stocks:", cacheErr);
  //   }

  //   // If no cache or error, fetch from API
  //   try {
  //     const response = await fetch(
  //       `${BaseUrl}/api/stocks/stock/top-volume-stocks/ `
  //     );
  //     if (!response.ok) {
  //       throw new Error("Network response was not ok");
  //     }
  //     const data = await response.json();
  //     // Save to AsyncStorage
  //     await AsyncStorage.setItem(key, JSON.stringify(data));
  //     setTrendingStocksData(data);
  //   } catch (err) {
  //     console.error("Error fetching trending stocks:", err);
  //     setError("Failed to fetch trending stocks. Please try again later.");
  //   }
  // }, []);

  // useFocusEffect(
  //   useCallback(() => {
  //     const loadAll = async () => {
  //       setLoading(true);
  //       setError(null);
  //       try {
  //         await clearCacheIfNeeded();
  //         await Promise.all([
  //           loadGainersAndDecliners(),
  //           loadTrendingStocks(),
  //           loadStockHistory(),
  //         ]);
  //       } catch (err) {
  //         console.error("Error in loadAll:", err);
  //       } finally {
  //         setLoading(false);
  //       }
  //     };
  //     loadAll();
  //   }, [loadGainersAndDecliners, loadTrendingStocks, loadStockHistory])
  // );

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // const fetchGainers = useCallback(() => {
  //   const startOfTodayUTC = new Date();
  //   startOfTodayUTC.setUTCHours(0, 0, 0, 0);

  //   const endOfTodayUTC = new Date(startOfTodayUTC);
  //   endOfTodayUTC.setUTCDate(endOfTodayUTC.getUTCDate() + 1);

  //   const fetchAllData = async () => {
  //     try {
  //       setLoading(true);

  //       // ── Parallel fetches ───────────────────────────────────────────────
  //       const [gainersRes, declinersRes, trendingRes] = await Promise.all([
  //         // Gainers
  //         supabase
  //           .from("stock_movements")
  //           .select("*")
  //           .eq("direction", "top")
  //           .gte("created_at", startOfTodayUTC.toISOString())
  //           .lt("created_at", endOfTodayUTC.toISOString())
  //           .order("timestamp", { ascending: false }),

  //         // Decliners
  //         supabase
  //           .from("stock_movements")
  //           .select("*")
  //           .eq("direction", "bottom")
  //           .gte("created_at", startOfTodayUTC.toISOString())
  //           .lt("created_at", endOfTodayUTC.toISOString())
  //           .order("timestamp", { ascending: false }),

  //         // Trending (volume)
  //         supabase
  //           .from("stock_volumes")
  //           .select("*")
  //           .order("timestamp", { ascending: false }),
  //       ]);

  //       // Check for errors
  //       if (gainersRes.error) throw gainersRes.error;
  //       if (declinersRes.error) throw declinersRes.error;
  //       if (trendingRes.error) throw trendingRes.error;

  //       // ── Combine gainers + decliners to deduplicate across lists ──────
  //       const allPriceMovements = [
  //         ...(gainersRes.data || []),
  //         ...(declinersRes.data || []),
  //       ];

  //       // Keep the most recent record per symbol
  //       const latestMovementBySymbol = new Map();
  //       allPriceMovements.forEach((item) => {
  //         const existing = latestMovementBySymbol.get(item.symbol);
  //         if (
  //           !existing ||
  //           new Date(item.timestamp) > new Date(existing.timestamp)
  //         ) {
  //           latestMovementBySymbol.set(item.symbol, item);
  //         }
  //       });

  //       // Classify into gainers or decliners based on latest percentage_change
  //       const finalGainers = [];
  //       const finalDecliners = [];

  //       latestMovementBySymbol.forEach((item) => {
  //         if (item.percentage_change > 0) {
  //           finalGainers.push(item);
  //         } else if (item.percentage_change < 0) {
  //           finalDecliners.push(item);
  //         }
  //         // percentage_change === 0 → you can decide to skip or put somewhere
  //       });

  //       // Sort
  //       finalGainers.sort((a, b) => b.percentage_change - a.percentage_change);
  //       finalDecliners.sort(
  //         (a, b) => a.percentage_change - b.percentage_change,
  //       ); // most negative first

  //       // ── Trending (volume) ─────────────────────────────────────────────
  //       const latestVolumeBySymbol = new Map();
  //       (trendingRes.data || []).forEach((item) => {
  //         const existing = latestVolumeBySymbol.get(item.symbol);
  //         if (
  //           !existing ||
  //           new Date(item.timestamp) > new Date(existing.timestamp)
  //         ) {
  //           latestVolumeBySymbol.set(item.symbol, item);
  //         }
  //       });

  //       const sortedTrendings = Array.from(latestVolumeBySymbol.values()).sort(
  //         (a, b) => b.volume - a.volume,
  //       );

  //       // ── Update state ──────────────────────────────────────────────────
  //       setGainersData(finalGainers.slice(0, 10));
  //       setDeclinersData(finalDecliners.slice(0, 10));
  //       setTrendingStocksData(sortedTrendings.slice(0, 10));

  //       // Optional: helpful logging
  //       console.log("Top 10 Gainers:", finalGainers.slice(0, 10));
  //       console.log("Top 10 Decliners:", finalDecliners.slice(0, 10));
  //       console.log("Top 10 Trending:", sortedTrendings.slice(0, 10));
  //     } catch (err) {
  //       console.error("Error fetching market movers:", err);
  //       // Optional: show toast/notification to user
  //       // toast.error("Failed to load market data");
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchAllData();
  // }, [setLoading]);

  const fetchGainers = useCallback(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        // Get the absolute latest timestamp once (more reliable)
        const { data: latestRecord, error: latestError } = await supabase
          .from("stock_movements")
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .single(); // Use .single() for clarity

        if (latestError || !latestRecord) {
          console.warn("No stock movements found");
          setGainersData([]);
          setDeclinersData([]);
          setTrendingStocksData([]);
          return;
        }

        const latestTimestamp = new Date();

        // Wider safe window (10 seconds instead of 5) — safer during bursts
        const batchStartTime = new Date(latestTimestamp.getTime() - 10 * 1000);

        console.log("Fetching latest batch:", {
          start: batchStartTime.toISOString(),
          end: latestTimestamp.toISOString(),
        });

        // Parallel fetches
        const [gainersRes, declinersRes, trendingRes] = await Promise.all([
          supabase
            .from("stock_movements")
            .select("*")
            .eq("direction", "top")
            .gte("created_at", batchStartTime.toISOString())
            .order("percentage_change", { ascending: false }) // Sort directly by magnitude
            .limit(15), // Fetch a few extra for safety

          supabase
            .from("stock_movements")
            .select("*")
            .eq("direction", "bottom")
            .lte("created_at", latestTimestamp.toISOString())
            .gte("created_at", batchStartTime.toISOString())
            .order("percentage_change", { ascending: true }) // Most negative first
            .limit(15),

          supabase
            .from("stock_volumes")
            .select("*")
            .order("volume", { ascending: false }),
        ]);

        if (gainersRes.error) throw gainersRes.error;
        if (declinersRes.error) throw declinersRes.error;
        if (trendingRes.error) throw trendingRes.error;

        // Final classification (trust percentage_change as source of truth)
        const finalGainers = (gainersRes.data || [])
          .filter((item) => item.percentage_change > 0)
          .slice(0, 10);

        const finalDecliners = (declinersRes.data || [])
          .filter((item) => item.percentage_change < 0)
          .slice(0, 10);

        // Trending — simple latest by volume
        // const trending = (trendingRes.data || [])
        //   .sort((a, b) => (b.volume || 0) - (a.volume || 0))
        //   .slice(0, 10);

        const trending = (trendingRes.data || [])
          // Step 1: Remove duplicates - keep the highest volume for each symbol
          .reduce((acc, current) => {
            const existing = acc.find((item) => item.symbol === current.symbol);

            if (!existing) {
              acc.push(current);
            } else if ((current.volume || 0) > (existing.volume || 0)) {
              // Replace with higher volume entry
              const index = acc.indexOf(existing);
              acc[index] = current;
            }

            return acc;
          }, [])
          // Step 2: Sort by volume descending
          .sort((a, b) => (b.volume || 0) - (a.volume || 0))
          // Step 3: Take top 10
          .slice(0, 10);

        setGainersData(finalGainers);
        setDeclinersData(finalDecliners);
        setTrendingStocksData(trending);

        console.log(
          `✅ Updated — Gainers: ${finalGainers.length}, Decliners: ${finalDecliners.length}`,
        );
      } catch (err) {
        console.error("❌ Error fetching market movers:", err);
        // Optionally show user-friendly toast
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);
  useFocusEffect(
    useCallback(() => {
      const loadAll = async () => {
        setLoading(true);
        setError(null);
        try {
          await clearCacheIfNeeded();
          await Promise.all([
            // loadGainersAndDecliners(),
            // loadTrendingStocks(),
            fetchGainers(),
            loadStockHistory(),
          ]);
        } catch (err) {
          console.error("Error in loadAll:", err);
        } finally {
          setLoading(false);
        }
      };
      loadAll();
    }, [fetchGainers, loadStockHistory]),
  );
  const formatLargeNumber = (number, decimals = 2) => {
    if (!number || isNaN(number)) return "N/A";

    const num = Number(number);
    const absNum = Math.abs(num);

    // Under 1 million - show full number
    if (absNum < 1000) {
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      });
    }

    if (absNum < 1000000) {
      const thousands = num / 1000;
      return `${thousands.toFixed(decimals)}K`;
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

  const renderRecentVisited = ({ item }) => {
    const symbol = item.symbol;
    const realtime = latestPrices[symbol] || {};
    const price = realtime.c ?? item?.data?.close_price ?? 0;
    const pctChange = realtime.pch ?? item?.data?.percent_change * 100 ?? 0;
    const Change = realtime.ch ?? item?.data?.change ?? 0;
    const isPositive = realtime.isPositive ?? pctChange >= 0;

    const priceAnim = recentPriceAnims.current[symbol] || new Animated.Value(1);
    const changeAnim =
      recentChangeAnims.current[symbol] || new Animated.Value(1);

    const priceStyle = { transform: [{ scale: priceAnim }] };
    const changeStyle = { transform: [{ scale: changeAnim }] };
    return (
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 12,
          // borderBottomWidth: 1,
          // borderBottomColor: "#ECECEC",
        }}
        onPress={() => handleStockPress(item?.symbol)}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* <Image
          source={require("../../assets/test_icon.png")}
          style={{
            width: 32,
            height: 32,
            marginRight: 8,
            borderRadius: 40,
          }}
        /> */}
          <View style={{ marginRight: 8 }}>
            <StockLogo symbol={item.symbol} size={32} />
          </View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: isDark ? "#FFFFFF" : "#0B1B0C",
              fontFamily: "SfRegular",
            }}
          >
            {item?.symbol}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "column",
            alignItems: "flex-end",
            alignContent: "flex-end",
            marginLeft: 32,
          }}
        >
          {/* <Text style={{ color: "#000000", fontWeight: "600" }}>
          <Text style={{ fontSize: 10 }}>PKR</Text>
          <Text style={{ fontSize: 14 }}> {item?.data?.close_price} </Text>
        </Text> */}
          <Animated.Text
            style={{
              fontSize: 14,
              fontFamily: "SfRegular",
              fontWeight: "600",
              color: isDark ? "#FFFFFF" : "",
            }}
          >
            <Text style={{ fontSize: 10 }}>PKR</Text> {price}
          </Animated.Text>
          <View
            style={{
              paddingVertical: 4,
              marginTop: 4,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
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
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: isDark
                  ? isPositive
                    ? "#3FB950"
                    : "#FF6B6B"
                  : isPositive
                    ? "#3FB950"
                    : "#E00000",
                fontFamily: "SfRegular",
                marginLeft: 4,
              }}
            >
              {Math.abs(Number(Change).toFixed(2))} (
              {Math.abs(pctChange).toFixed(2)}%)
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTrendingStocks = ({ item }) => {
    const symbol = item.symbol;
    const realtime = latestPrices[symbol] || {};
    console.log("Rendering trending stock:", symbol, realtime);
    const price = realtime.c ?? item.close_price ?? 0;
    const volume = realtime.v ?? item.volume ?? 0;
    // Trending often doesn't show % change – but if you want, use realtime.pch

    const priceAnim =
      trendingPriceAnims.current[symbol] || new Animated.Value(1);
    const priceStyle = { transform: [{ scale: priceAnim }] };
    return (
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
              {/* <Image
              source={item.src || require("../../assets/google.png")}
              style={{ width: 32, height: 32 }}
            /> */}
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
                color: item.c > 0 ? "#3FB950" : "#E00000",
                marginTop: 4,
                fontFamily: "SfRegular",
              },
            ]}
          >
            {/* {item?.pch.toFixed(2)}% */}
            {item?.c.toFixed(2)} (PKR)
          </Animated.Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: item.c > 0 ? "#3FB950" : "#E00000",
              marginTop: 4,
              fontFamily: "SfRegular",
            }}
          >
            {/* {formatLargeNumber(100000)} (vol) */}
            {formatLargeNumber(item?.volume || 0)} (vol)
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGainers = ({ item }) => {
    const symbol = item.symbol;
    const realtime = latestPrices[symbol] || {};

    const price = realtime.c ?? item.close_price ?? 0;
    const pctChange = realtime.pch ?? item.percentage_change * 100 ?? 0;
    const isPositive = realtime.isPositive ?? pctChange >= 0;

    const priceAnim =
      gainersPriceAnims.current[symbol] || new Animated.Value(1);
    const changeAnim =
      gainersChangeAnims.current[symbol] || new Animated.Value(1);

    const priceStyle = {
      transform: [{ scale: priceAnim }],
    };

    const changeStyle = {
      transform: [{ scale: changeAnim }],
    };

    return (
      <TouchableOpacity
        style={{
          padding: 12,
          marginRight: 10,
          backgroundColor: isDark ? "#222222" : "#F9F9F9",
          width: 140,
          height: 70,

          borderRadius: 8,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? "#FFFFFF14" : "",
        }}
        onPress={() => handleStockPress(item.symbol)}
      >
        <View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* <Image
            source={require("../../assets/test_icon.png")}
            style={{ width: 20, height: 20, borderRadius: 40, marginRight: 6 }}
          /> */}
            <View style={{ marginRight: 6 }}>
              {" "}
              <StockLogo symbol={item.symbol} size={20} />
            </View>
            <Text
              style={[
                styles.itemText,
                {
                  color: isDark ? "#FFFFFF" : "#000000",
                },
              ]}
            >
              {item.symbol}
            </Text>
          </View>
          <Animated.View
            style={[
              { flexDirection: "row", alignItems: "center", marginTop: 3 },
            ]}
          >
            {/* <Image
            source={require("../../assets/increment_new.png")}
            style={{ width: 8, height: 8, marginRight: 4 }}
          /> */}

            <View style={{ marginRight: 3 }}>
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
            </View>
            <Animated.Text
              style={[
                styles.changeText,
                {
                  color: item.color || (item?.pch > 0 ? "#3FB950" : "#E00000"),
                  fontFamily: "SfRegular",
                },
              ]}
            >
              {/* {item.close_price.toFixed(2)} ({"+"}
              {(item.percentage_change * 100).toFixed(2)}%) */}
              {item?.c.toFixed(2)} ({/* {isPositive ? "+" : ""} */}
              {(item?.pch * 100).toFixed(2)}%)
            </Animated.Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDecliners = ({ item }) => {
    const symbol = item.symbol;
    const realtime = latestPrices[symbol] || {};

    const price = realtime.c ?? item.close_price ?? 0;
    const pctChange = realtime.pch ?? item.percentage_change * 100 ?? 0;
    const isPositive = realtime.isPositive ?? pctChange >= 0; // usually false for decliners

    const priceAnim =
      declinersPriceAnims.current[symbol] || new Animated.Value(1);
    const changeAnim =
      declinersChangeAnims.current[symbol] || new Animated.Value(1);

    const priceStyle = { transform: [{ scale: priceAnim }] };
    const changeStyle = { transform: [{ scale: changeAnim }] };
    return (
      <TouchableOpacity
        style={{
          padding: 12,
          marginRight: 10,
          backgroundColor: isDark ? "#222222" : "#F9F9F9",
          width: 140,
          height: 70,
          // shadowColor: "#0000001A",
          // shadowOffset: { width: 0, height: 2 },
          // shadowOpacity: 0.2,
          // shadowRadius: 10,
          // elevation: 5,
          borderRadius: 8,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? "#FFFFFF14" : "",
        }}
        onPress={() => handleStockPress(item.symbol)}
      >
        <View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* <Image
            source={require("../../assets/test_icon.png")}
            style={{ width: 20, height: 20, borderRadius: 40, marginRight: 6 }}
          /> */}
            <View style={{ marginRight: 6 }}>
              {" "}
              <StockLogo symbol={item.symbol} size={20} />
            </View>
            <Text
              style={[
                styles.itemText,
                {
                  color: isDark ? "#FFFFFF" : "#000000",
                },
              ]}
            >
              {item.symbol}
            </Text>
          </View>
          <Animated.View
            style={[
              { flexDirection: "row", alignItems: "center", marginTop: 3 },
            ]}
          >
            {/* <Image
            source={require("../../assets/decrement_new.png")}
            style={{ width: 8, height: 8, marginRight: 4 }}
          /> */}
            <View style={{ marginTop: 2, marginRight: 3 }}>
              {isDark ? (
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
              ) : (
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
              )}
            </View>
            <Animated.Text
              style={[
                styles.changeText,
                {
                  color: isDark
                    ? item.color || (item?.c > 0 ? "#FF6B6B" : "#FF6B6B")
                    : item.color || (item?.c > 0 ? "#E00000" : "#E00000"),
                  // fontFamily: "Outfit",
                },
              ]}
            >
              {/* {item.close_price.toFixed(2)} (
              {(item.percentage_change * 100).toFixed(2)}%) */}
              {item?.c.toFixed(2)} ({isPositive ? "+" : ""}
              {Math.abs(item?.pch * 100).toFixed(2)}%)
            </Animated.Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  // console.log(recentlyVisited);

  useEffect(() => {
    const fetchRecentDataValues = async () => {
      try {
        const allSymbols = [...new Set(recentlyVisited)].join(",");
        // console.log(allSymbols);
        const response = await fetch(
          `${BaseUrl}/api/stocks/stock/latest-stock-data/?symbols=${allSymbols}`,
        );
        const data = await response.json();
        setRecentlyVisitedData(data);
      } catch (err) {
        console.error("API fetch error:", err);
        setError("Failed to fetch initial data.");
      }
    };
    if (recentlyVisited.length > 0) {
      fetchRecentDataValues();
    }
  }, [recentlyVisited]);

  useEffect(() => {
    const checkMarketHours = () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeInMinutes = hours * 60 + minutes;

      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
      const marketStart = 9 * 60 + 30; // 9:30 AM
      const marketEnd = 15 * 60 + 30; // 3:30 PM

      const isOpenTime =
        timeInMinutes >= marketStart && timeInMinutes <= marketEnd;

      setIsMarketOpen(isWeekday && isOpenTime);
    };

    // Check immediately
    checkMarketHours();

    // Check every minute for updates
    const interval = setInterval(checkMarketHours, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  // console.log(GainersData);
  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // console.log(holdingsRealtime);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      // 1. Reload user/profile data if needed
      await fetchUser();
      if (userId) {
        await fetchProfileUser();
      }

      // 2. Reload client portfolio (if account is linked)
      if (ClientData?.cliendCode) {
        const data = await fetchClientPortfolio();
        setClientPorfolio(data?.detailInformation?.[0] || {});
      }

      // 3. Reload gainers, decliners, trending from Supabase
      await fetchGainers(); // This already fetches gainers + decliners + trending

      // 4. Reload recently visited stocks' latest prices
      if (recentlyVisited.length > 0) {
        const allSymbols = [...new Set(recentlyVisited)].join(",");
        const response = await fetch(
          `${BaseUrl}/api/stocks/stock/latest-stock-data/?symbols=${allSymbols}`,
        );
        const data = await response.json();
        setRecentlyVisitedData(data);
      }

      // Optional: small delay for better UX feel
      await new Promise((resolve) => setTimeout(resolve, 600));
    } catch (err) {
      console.error("Refresh failed:", err);
      setError("Failed to refresh data. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }, [
    userId,
    fetchUser,
    fetchProfileUser,
    ClientData?.cliendCode,
    fetchClientPortfolio,
    fetchGainers,
    recentlyVisited,
    BaseUrl,
  ]);

  // const calculateTotals = () => {
  //   let totalDailyPriceChange = 0;
  //   let totalDailyPercentChangeSum = 0;
  //   let totalHoldingsCount = 0;

  //   Object.entries(holdingsRealtime || {}).forEach(([symbol, realtime]) => {
  //     const holding = ClientPorfolio?.holdings?.find(
  //       (h) => String(h.security) === symbol,
  //     );

  //     if (!holding) return;
  //     const quantity = Number(holding.quantity) || 0;
  //     const currentPrice = Number(realtime.c) || 0;
  //     const ldcp = Number(realtime.ldcp) || 0;

  //     if (quantity <= 0 || ldcp <= 0) return; // skip invalid cases

  //     const priceChange = currentPrice - ldcp;
  //     const dailyPnl = priceChange * quantity; // ← This is what you want!
  //     const percentChange = (priceChange / ldcp) * 100;

  //     totalDailyPriceChange += dailyPnl;
  //     totalDailyPercentChangeSum += percentChange;
  //     totalHoldingsCount++;
  //   });

  //   const avgPercentChange =
  //     totalHoldingsCount > 0
  //       ? totalDailyPercentChangeSum / totalHoldingsCount
  //       : 0;
  //   return {
  //     dailyPriceChange: totalDailyPriceChange,
  //     dailyPercentChange: avgPercentChange,
  //     count: totalHoldingsCount,
  //   };
  // };

  const calculateTotals = () => {
    let totalDailyPriceChange = 0;
    let totalDailyPercentChangeSum = 0;
    let totalHoldingsCount = 0;

    Object.entries(ClientPorfolio?.holdings || {}).forEach(([_, holding]) => {
      const symbol = String(holding.security);
      const quantity = Number(holding.quantity) || 0;
      if (quantity <= 0) return;

      // Prefer live WebSocket data → fallback to EOD/latest API fetch
      const realtime = holdingsRealtime[symbol];
      const eod = holdingsEOD[symbol];

      const source = realtime?.c != null ? realtime : eod;

      if (!source || !source.c || !source.ldcp || source.ldcp <= 0) return;

      const priceChange = source.c - source.ldcp;
      const dailyPnl = priceChange * quantity;
      const percentChange = (priceChange / source.ldcp) * 100;

      totalDailyPriceChange += dailyPnl;
      totalDailyPercentChangeSum += percentChange;
      totalHoldingsCount++;
    });

    const avgPercentChange =
      totalHoldingsCount > 0
        ? totalDailyPercentChangeSum / totalHoldingsCount
        : 0;

    return {
      dailyPriceChange: totalDailyPriceChange,
      dailyPercentChange: avgPercentChange,
      count: totalHoldingsCount,
    };
  };
  const { dailyPriceChange, dailyPercentChange, count } = calculateTotals();
  const isPositive = dailyPriceChange >= 0;
  const color = isPositive ? "#53BA83" : "#FF4D4F";
  const sign = isPositive ? "+" : "";

  // const totalReturnOfInvestment =
  //   ClientPorfolio?.holdings?.reduce(
  //     (sum, item) => sum + (Number(item?.retOfInv) || 0),
  //     0,
  //   ) ?? 0;
  const totalReturnOfInvestment =
    ClientPorfolio?.holdings?.reduce((sum, item) => {
      const retOfInv = Number(item?.retOfInv) || 0;
      const pfWeight = Number(item?.pfWeight) || 0;

      return sum + (retOfInv * pfWeight) / 100;
    }, 0) ?? 0;

  const refreshPortfolioSummary = useCallback(async () => {
    try {
      setError(null);

      if (!ClientData?.cliendCode) return;

      const data = await fetchClientPortfolio();
      setClientPorfolio(data?.detailInformation?.[0] || {});

      await fetchHoldingsLatestPrices();
    } catch (err) {
      console.error("Failed to refresh portfolio summary:", err);
      setError("Failed to refresh portfolio summary.");
    } finally {
    }
  }, [ClientData?.cliendCode, fetchHoldingsLatestPrices]);

  return (
    <>
      <ScrollView
        style={[
          styles.scrollView,
          {
            backgroundColor: isDark ? "" : "#fff",
          },
        ]}
        accessibilityElementsHidden={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? "" : "#fff",
            },
          ]}
        >
          <View style={styles.Newcontainer}>
            {/* Market Status */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <TouchableOpacity
                onPress={() => router.push("/Search")}
                style={[
                  styles.searchBar,
                  {
                    borderWidth: 1,
                    borderColor: isDark ? "#FFFFFF14" : "#ECECEC",
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: isDark ? "#FFFFFF14" : "",
                  },
                ]}
              >
                <Image
                  source={require("../../assets/icons/search.png")}
                  style={{ width: 17, height: 17, marginRight: 10 }}
                />
                <Text
                  style={{
                    color: isDark ? "#929292" : "black",
                    fontSize: 16,
                  }}
                >
                  Search here
                </Text>
                {/* <TextInput
                  placeholder="Search"
                  placeholderTextColor={
                    isDark ? "#929292" : "black"
                  }
                  value={searchText}
                  onChangeText={setSearchText}
                  onSubmitEditing={handleSearchSubmit}
                  accessible={true}
                  editable={false}
                  pointerEvents="none"
                  accessibilityElementsHidden={false}
                  accessibilityLabel="Search stocks or indices"
                  returnKeyType="search"
                /> */}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/Notification")}>
                <Image
                  source={require("../../assets/icons/new_notification.png")}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 100,
                    marginRight: 4,
                  }}
                />
              </TouchableOpacity>

              <TouchableOpacity>
                {avatarUrl ? (
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "#D9E7FF",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#1B58C1",
                        fontSize: 16,
                        fontWeight: "500",
                        letterSpacing: 0.5,
                      }}
                    >
                      {/* {avatarUrl} */}
                      {getInitials(avatarUrl)}
                    </Text>
                  </View>
                ) : (
                  <Image
                    source={require("../../assets/default_avatar.png")}
                    style={{ width: 40, height: 40, borderRadius: 100 }}
                  />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              {/* <TouchableOpacity
              style={[
                styles.websocketButton,
                !isConnected ? styles.closeButton : styles.openButton,
              ]}
              accessible={true}
            >
              {isConnected && (
                <Image
                  source={require("../../assets/open_icon.png")}
                  style={{ width: 8, height: 8, marginRight: 3, marginTop: 1 }}
                />
              )}

              <Text
                style={{
                  color: !isConnected ? "white" : "blue",
                  fontSize: 12,
                  fontWeight: "600",
                  // fontFamily: "Outfit",
                }}
              >
                {isConnected ? "Market Open" : "Market Close"}
              </Text>
            </TouchableOpacity> */}
              <TouchableOpacity
                style={[
                  styles.websocketButton,
                  !isMarketOpen ? styles.closeButton : styles.openButton,
                ]}
                accessible={true}
              >
                {/* {isMarketOpen && (
                <Image
                  source={require("../../assets/open_icon.png")}
                  style={{ width: 8, height: 8, marginRight: 3, marginTop: 1 }}
                />
              )} */}

                <Text
                  style={{
                    color: !isMarketOpen ? "white" : "#3FB950",
                    fontSize: 12,
                    fontWeight: "600",
                    // fontFamily: "Outfit",
                  }}
                >
                  {isMarketOpen ? "Open" : "Close"}
                </Text>
              </TouchableOpacity>
            </View>
            {!isAccount ? (
              <LinearGradient
                colors={
                  isDark ? ["#53BA831F", "#3FB95014"] : ["#FFFFFF", "#F9F9F9"]
                }
                style={{
                  padding: 20,
                  borderWidth: 2,
                  borderColor: "#53BA834D",
                  borderRadius: 18,
                  // backgroundColor: "#F9F9F9",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ width: "65%" }}>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "600",
                      fontSize: 17,
                      lineHeight: 18,
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    Start Your Investment Journey
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "400",
                      fontSize: 12,
                      lineHeight: 16,
                      color: "#8A8A8A",
                    }}
                  >
                    Track your investments & monitor performance in real-time.
                  </Text>
                  {profileuser?.status === "need_credentials" ? (
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#53BA83",
                        borderRadius: 12,
                        marginTop: 12,
                        width: 117,
                        height: 48,
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                      }}
                      onPress={() => router.push("/openAccount")}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: "white",
                          fontWeight: "600",
                          fontFamily: "SfRegular",
                        }}
                      >
                        Open Account
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#53BA83",
                        borderRadius: 12,
                        marginTop: 12,
                        width: 117,
                        height: 48,
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                      }}
                      onPress={() => router.push("/openAccount")}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: "white",
                          fontWeight: "600",
                          fontFamily: "SfRegular",
                        }}
                      >
                        Open Account
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ width: "35%" }}>
                  <TouchableOpacity>
                    <Image
                      source={require("../../assets/invest_img.png")}
                      style={{ width: 109, height: 90 }}
                    />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            ) : (
              <>
                <LinearGradient
                  colors={
                    isDark ? ["#234e37", "#1a5222"] : ["#3b815c", "#2d8b3b"]
                  }
                  style={{
                    borderWidth: 0,
                    borderColor: "#53BA834D",
                    borderRadius: 18,
                    backgroundColor: "#3FB950",

                    height: "220px",
                  }}
                >
                  <LinearGradient
                    colors={["#53BA83", "#3FB950"]}
                    style={{
                      padding: 20,
                      borderWidth: 0,
                      borderColor: "#53BA834D",
                      borderRadius: 18,
                      backgroundColor: "#3FB950",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ width: "65%" }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "SfRegular",
                            fontWeight: "500",
                            fontSize: 13,
                            lineHeight: 19,
                            color: "#FFFFFF",
                          }}
                        >
                          TOTAL BALANCE
                        </Text>
                        {/* <TouchableOpacity onPress={()=>{fetchClientPortfolio()}}>
                         <Image
                          source={require("../../assets/icons/new_reload_icon.png")}
                          style={{ width: 22, height: 22}}
                        />
                      </TouchableOpacity> */}
                      </View>
                      <View style={{ flexDirection: "column" }}>
                        <Text
                          style={{
                            fontFamily: "SfRegular",
                            fontWeight: "400",
                            fontSize: 16,
                            lineHeight: 31,
                            color: "#FFFFFF",
                          }}
                        >
                          PKR
                        </Text>
                        <Text
                          style={{
                            fontFamily: "SfRegular",
                            fontWeight: "700",
                            fontSize: 28,
                            lineHeight: 31,
                            color: "#FFFFFF",
                            marginLeft: 2,
                          }}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.5}
                        >
                          {/* 125,450.75 */}
                          {formatPKR(ClientPorfolio?.portfolio?.grandTotal) ||
                            0}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row" }}>
                        <View
                          style={{
                            backgroundColor: "#FFFFFF40",
                            borderRadius: 8,
                            marginTop: 12,
                            width: 100,
                            height: 32,
                            alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              color: "#FFFFFF",
                              fontWeight: "600",
                              fontFamily: "SfRegular",
                              lineHeight: 19,
                            }}
                          >
                            {/* +42.00% */}
                            {/* {ClientPorfolio?.holdings.map((items) => {
                            items?.retOfInv;
                          })} */}
                            {totalReturnOfInvestment.toFixed(2)}%
                          </Text>
                        </View>
                        <View
                          style={{
                            borderRadius: 8,
                            marginTop: 12,
                            marginLeft: 10,
                            // width: 100,
                            height: 32,
                            alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#FFFFFF",
                              fontWeight: "500",
                              fontFamily: "SfRegular",
                              lineHeight: 18,
                            }}
                          >
                            Overall Return
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={{ width: "35%" }}>
                      <TouchableOpacity>
                        <Image
                          source={require("../../assets/account_new_img.png")}
                          style={{ width: 109, height: 90 }}
                        />
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                  <View
                    style={{
                      // paddingTop: 10,
                      paddingVertical: 15,
                      flexDirection: "row",
                      justifyContent: "center",
                      textAlign: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "SfRegular",
                        fontWeight: "600",
                        fontSize: 15,
                        lineHeight: 22,
                        color: "#E0E0E0",
                      }}
                    >
                      Ledger Balance: PKR{" "}
                      {formatPKR(ClientPorfolio?.portfolio?.cashUnblocked) || 0}
                    </Text>{" "}
                  </View>
                </LinearGradient>

                {/* <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    paddingVertical: 18,
                    borderRadius: 14,
                    backgroundColor:
                      isDark ? "#222222" : "#F9F9F9",
                    marginTop: 16,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "600",
                      fontSize: 15,
                      lineHeight: 22,
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    Ledger Balance: PKR{" "}
                    {formatPKR(ClientPorfolio?.portfolio?.cashUnblocked) || 0}
                  </Text>{" "}
                </View> */}
                <View>
                  <View
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
                        borderWidth: 1,
                        borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
                        borderRadius: 14,
                        width: "48%",
                        height: 127,
                        backgroundColor: isDark ? "#222222" : "#F9F9F9",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",

                          alignItems: "center",
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            backgroundColor: "#53BA83",
                            boxShadow: "0px 0px 8px 0px #3FB950",
                            borderRadius: 100,
                          }}
                        ></View>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "SfRegular",
                              fontWeight: "500",
                              fontSize: 11,
                              lineHeight: 16,
                              color: "#8A8A8A",
                              marginLeft: 6,
                            }}
                          >
                            Total Change
                          </Text>
                          <TouchableOpacity onPress={refreshPortfolioSummary}>
                            <Image
                              source={require("../../assets/icons/new_reload_icon.png")}
                              style={{ width: 14, height: 14, marginLeft: 10 }}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View>
                        <Text
                          style={{
                            fontFamily: "SfRegular",
                            fontWeight: "500",
                            fontSize: 14,
                            lineHeight: 25,
                            // color: color,
                            color: isDark ? "#FFFFFF" : "#0B1B0C",
                            marginTop: 6,
                          }}
                        >
                          {" "}
                          PKR
                        </Text>
                        <Text
                          style={{
                            fontFamily: "SfRegular",
                            fontWeight: "600",
                            fontSize: 20,
                            lineHeight: 25,
                            // color: color,
                            color:
                              ClientPorfolio?.portfolio?.totalProfitLoss > 0
                                ? isDark
                                  ? "#53BA83"
                                  : "#3FB950"
                                : isDark
                                  ? "#FF6B6B"
                                  : "#E00000",
                            // marginTop: 12,
                          }}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.5}
                        >
                          {/* {sign}
                          {formatPKR(Math.abs(dailyPriceChange)) || 0}{" "} */}
                          {formatPKR(
                            ClientPorfolio
                              ? ClientPorfolio?.portfolio?.totalProfitLoss
                              : 0,
                          )}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 6,
                        }}
                      >
                        {/* <Image
                          source={require("../../assets/increment_new.png")}
                          style={{ width: 8, height: 7 }}
                        /> */}
                        <Text
                          style={{
                            fontFamily: "SfRegular",
                            fontWeight: "600",
                            fontSize: 13,
                            lineHeight: 19,
                            // color: "#3FB950",
                            // color: color,
                            color:
                              ClientPorfolio &&
                              (ClientPorfolio?.portfolio?.totalProfitLoss /
                                ClientPorfolio?.portfolio?.custodyValue) *
                                100 >
                                0
                                ? isDark
                                  ? "#53BA83"
                                  : "#3FB950"
                                : ClientPorfolio &&
                                    (ClientPorfolio?.portfolio
                                      ?.totalProfitLoss /
                                      ClientPorfolio?.portfolio?.custodyValue) *
                                      100 <
                                      0
                                  ? isDark
                                    ? "#FF6B6B"
                                    : "#E00000"
                                  : isDark
                                    ? "#E0E0E0"
                                    : "#0B1B0C",
                            marginLeft: 2,
                          }}
                        >
                          {/* ({sign}
                          {Math.abs(dailyPercentChange).toFixed(2)}%) */}
                          {ClientPorfolio
                            ? `${(
                                (ClientPorfolio?.portfolio?.totalProfitLoss /
                                  ClientPorfolio?.portfolio?.custodyValue) *
                                100
                              ).toFixed(2)}%`
                            : "0.00%"}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={{
                        padding: 17,
                        borderWidth: 1,
                        borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
                        borderRadius: 14,
                        width: "48%",
                        height: 127,
                        backgroundColor: isDark ? "#222222" : "#F9F9F9",
                      }}
                      onPress={() => router.push("/Reports")}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            backgroundColor: "#FFA500",
                            borderRadius: 100,
                            boxShadow: "0px 0px 8px 0px #FFA500",
                          }}
                        ></View>
                        <Text
                          style={{
                            fontFamily: "SfRegular",
                            fontWeight: "500",
                            fontSize: 11,
                            lineHeight: 16,
                            color: "#8A8A8A",
                            marginLeft: 8,
                          }}
                        >
                          Pending Orders
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontFamily: "SfRegular",
                          fontWeight: "600",
                          fontSize: 20,
                          lineHeight: 30,
                          color: isDark ? "#E0E0E0" : "#0B1B0C",
                          marginTop: 12,
                        }}
                      >
                        {CompletedOrders.length || 0}
                      </Text>

                      <Text
                        style={{
                          fontFamily: "SfRegular",
                          fontWeight: "500",
                          fontSize: 10,
                          lineHeight: 15,
                          color: "#8A8A8A",
                          marginLeft: 2,
                        }}
                      >
                        Awaiting execution
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "center",gap: 16 }}>
                  <TouchableOpacity
                    style={{
                      borderWidth: 2,
                      borderColor: "#53BA83",
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      paddingVertical: 18,
                      borderRadius: 14,
                      backgroundColor: isDark ? "transparent" : "#FFFFFF",
                      marginTop: 16,
                      width: "48%",
                    }}
                    onPress={() => router.push("/Portfolio")}
                  >
                    <Text
                      style={{
                        fontFamily: "SfRegular",
                        fontWeight: "600",
                        fontSize: 15,
                        lineHeight: 22,
                        color: "#53BA83",
                      }}
                    >
                      View Full Portfolio
                    </Text>{" "}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      borderWidth: 2,
                      borderColor: "#53BA83",
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      paddingVertical: 18,
                      borderRadius: 14,
                      backgroundColor: isDark ? "transparent" : "#FFFFFF",
                      marginTop: 16,
                      width: "48%",
                    }}
                    onPress={() => router.push("/RaastId")}
                  >
                    <Text
                      style={{
                        fontFamily: "SfRegular",
                        fontWeight: "600",
                        fontSize: 15,
                        lineHeight: 22,
                        color: "#53BA83",
                      }}
                    >
                      Raast Id
                    </Text>{" "}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* New If User have Account */}
            {/* <View style={{ width: "100%", overflow:"hidden" }}>
              <TradingViewChart
                symbol="MCB"
                interval="60"
                theme="dark"
                height={600}
              />
            </View> */}

            {/* {error && <Text style={styles.errorText}>{error}</Text>} */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={require("../../assets/icons/market_new_icon.png")}
                style={{ width: 19, height: 19, marginRight: 8, marginTop: 7 }}
              />
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: isDark ? "#FFFFFF" : "#0B1B0C",
                  },
                ]}
              >
                Indices
              </Text>
            </View>
            <IndicesView
              isConnected={isConnected}
              setIsConnected={setIsConnected}
              // storeStockInHistory={storeStockInHistory}
            />

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={require("../../assets/icons/new_gainers.png")}
                style={{ width: 19, height: 19, marginRight: 8, marginTop: 7 }}
              />
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: isDark ? "#FFFFFF" : "#0B1B0C",
                  },
                ]}
              >
                Gainers
              </Text>
              <Popover
                from={
                  <TouchableOpacity
                    style={{ marginLeft: 8, marginTop: 7 }}
                    activeOpacity={0.7}
                  >
                    <InfoIcon color={isDark ? "#FFFFFF" : "#0B1B0C"} />
                  </TouchableOpacity>
                }
              >
                <Text
                  style={{
                    minWidth: "max-content",
                    padding: 4,
                    fontFamily: "SfRegular",
                    fontWeight: "500",
                    fontSize: 12,
                  }}
                >
                  Top percentage sorted stocks​​
                </Text>
              </Popover>
            </View>
            {loading ? (
              <ActivityIndicator size="large" color="#58BA83" />
            ) : (
              <FlatList
                data={marketStats?.gainers || []}
                renderItem={renderGainers}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                accessibilityElementsHidden={false}
              />
            )}

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={require("../../assets/icons/new_decliners.png")}
                style={{ width: 19, height: 19, marginRight: 8, marginTop: 7 }}
              />
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: isDark ? "#FFFFFF" : "#0B1B0C",
                  },
                ]}
              >
                Decliners
              </Text>

              <Popover
                from={
                  <TouchableOpacity
                    style={{ marginLeft: 8, marginTop: 7 }}
                    activeOpacity={0.7}
                  >
                    <InfoIcon color={isDark ? "#FFFFFF" : "#0B1B0C"} />
                  </TouchableOpacity>
                }
              >
                <Text
                  style={{
                    minWidth: "max-content",
                    padding: 4,
                    fontFamily: "SfRegular",
                    fontWeight: "500",
                    fontSize: 12,
                  }}
                >
                  Bottom percentage sorted stocks​
                </Text>
              </Popover>
            </View>
            {loading ? (
              <ActivityIndicator size="large" color="#58BA83" />
            ) : (
              <FlatList
                data={marketStats?.losers || []}
                renderItem={renderDecliners}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                accessibilityElementsHidden={false}
              />
            )}

            {/* <LinearGradient
                colors={
                  isDark
                    ? ["#53BA831F", "#3FB95014"]
                    : ["#FFFFFF", "#F9F9F9"]
                } */}
            {MarketingBannerData && (
              <LinearGradient
                // source={require("../../assets/background_img.png")}
                colors={["#53BA83", "#3FB950"]}
                style={[
                  styles.researchButton,
                  { backgroundColor: "#7FBB5159" },
                ]}
              >
                <View>
                  <Text style={styles.researchText}>
                    {/* View IELTrade Research {"\n"}Report for FY2024 */}
                    {MarketingBannerData[0]?.des}
                  </Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#FFFFFF",

                      borderRadius: 8,
                      marginTop: 12,
                      width: 117,
                      height: 30,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      // fontFamily: "Outfit",
                    }}
                    onPress={() => router.push(MarketingBannerData[0]?.link)}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#53BA83",
                        fontWeight: "600",
                        fontFamily: "SfRegular",
                      }}
                    >
                      Take a look
                    </Text>
                  </TouchableOpacity>
                </View>
                <View>
                  <Image
                    source={require("../../assets/Research_new.png")}
                    style={{ width: 75, height: 75 }}
                  />
                </View>
              </LinearGradient>
            )}

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={require("../../assets/icons/recent_new.png")}
                style={{ width: 19, height: 19, marginRight: 8, marginTop: 7 }}
              />
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: isDark ? "#FFFFFF" : "#0B1B0C",
                  },
                ]}
              >
                Recently Visited
              </Text>
            </View>
            <FlatList
              data={recentlyVisitedData}
              renderItem={renderRecentVisited}
              keyExtractor={(item, index) => index.toString()}
              numColumns={1}
              key={`flatlist-${1}`}
              contentContainerStyle={styles.verticalList}
              accessibilityElementsHidden={false}
            />
            {/* <Text style={styles.seeMore}>
            <Text style={styles.seeMoreText}>See More</Text>
          </Text> */}

            {/* <View > */}

            {/* </View> */}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                // marginTop: 24,
                // marginBottom: 16,
              }}
            >
              {/* <Text
              style={{
                fontWeight: "600",
                fontSize: 16,
                fontFamily: "SfRegular",
              }}
            >
              More Trending Stocks
            </Text> */}

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={require("../../assets/icons/new_gainers.png")}
                  style={{
                    width: 19,
                    height: 19,
                    marginRight: 8,
                    marginTop: 7,
                  }}
                />
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: isDark ? "#FFFFFF" : "#0B1B0C",
                    },
                  ]}
                >
                  Trending Stocks
                </Text>

                <Popover
                  from={
                    <TouchableOpacity
                      style={{ marginLeft: 8, marginTop: 7 }}
                      activeOpacity={0.7}
                    >
                      <InfoIcon color={isDark ? "#FFFFFF" : "#0B1B0C"} />
                    </TouchableOpacity>
                  }
                >
                  <Text
                    style={{
                      minWidth: "max-content",
                      padding: 4,
                      fontFamily: "SfRegular",
                      fontWeight: "500",
                      fontSize: 12,
                    }}
                  >
                    Top volume sorted stocks​​
                  </Text>
                </Popover>
              </View>
              <Text
                style={{
                  color: "#58BA83",
                  fontWeight: "600",
                  fontSize: 14,
                  textDecorationLine: "underline",
                  fontFamily: "SfRegular",
                }}
              >
                {/* View All */}
              </Text>
            </View>
            {loading ? (
              <ActivityIndicator size="large" color="#58BA83" />
            ) : (
              <FlatList
                data={marketStats?.trending || []}
                renderItem={renderTrendingStocks}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                accessibilityElementsHidden={false}
              />
            )}
          </View>

          {/* <TouchableOpacity
          style={{
            backgroundColor: "#58BA83",
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderRadius: 20,
            marginTop: 12,
            width: 110,
            height: 34,
            alignItems: "center",
          }}
          onPress={() => router.push("/Form")}
        >
          <Text style={{ fontSize: 12, color: "#fff" }}>Test Form</Text>
        </TouchableOpacity> */}
        </View>
      </ScrollView>
      <Modal animationType="slide" transparent={true} visible={IsModalVisible}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: isDark ? "#1A1A1A" : "#fff",
              },
            ]}
          >
            <Image
              source={
                isDark
                  ? require("../../assets/icons/user_block_dark.png")
                  : require("../../assets/icons/user_block.png")
              }
              style={{ width: 200, height: 200 }}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: 124,
                height: 30,
                paddingHorizontal: 12,
                borderRadius: 100,
                alignItems: "center",
                borderWidth: 1,
                borderColor: isDark ? "#674824" : "#FFD6A7",
                backgroundColor: isDark ? "#272522" : "#FFF7ED",
                marginTop: 24,
              }}
            >
              <Image
                source={require("../../assets/icons/security_hold.png")}
                style={{ width: 14, height: 14 }}
              />
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontWeight: "500",
                  fontSize: 12,
                  lineHeight: 16,
                  color: "#CA3500",
                }}
              >
                Security Hold
              </Text>
            </View>
            <Text
              style={{
                marginTop: 12,
                fontFamily: "SfRegular",
                fontWeight: "600",
                fontSize: 18,
                lineHeight: 22,
                color: isDark ? "#FFFFFF" : "#0B1B0C",
                textAlign: "center",
              }}
            >
              Account Temporarily Blocked
            </Text>
            <Text
              style={{
                fontFamily: "SfRegular",
                marginTop: 12,
                fontSize: 16,
                lineHeight: 24,
                color: "#8A8A8A",
                textAlign: "center",
              }}
            >
              For your security, we have temporarily restricted access to your
              account due to unusual activity detected.
            </Text>

            <LinearGradient
              colors={["#53BA830D", "#3FB9500D"]}
              style={{
                padding: 17,
                width: "100%",
                marginTop: 24,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#53BA831A",
              }}
            >
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontWeight: "500",
                  fontSize: 12,
                  lineHeight: 16,
                  color: isDark ? "#8A8A8A" : "#4A5565",
                }}
              >
                Need immediate help?
              </Text>
              <View
                style={{
                  marginTop: 10,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Image
                  source={
                    isDark
                      ? require("../../assets/icons/Modal_Email_dark.png")
                      : require("../../assets/icons/Modal_Email.png")
                  }
                  style={{ width: 28, height: 28 }}
                />
                <Text
                  style={{
                    marginLeft: 10,
                    fontFamily: "SfRegular",
                    fontSize: 14,
                    fontWeight: "400",
                    lineHeight: 20,
                    color: isDark ? "#8A8A8A" : "#364153",
                  }}
                >
                  support@investapp.com
                </Text>
              </View>
              <View
                style={{
                  marginTop: 10,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Image
                  source={
                    isDark
                      ? require("../../assets/icons/Modal_Phone_dark.png")
                      : require("../../assets/icons/Modal_Phone.png")
                  }
                  style={{ width: 28, height: 28 }}
                />
                <Text
                  style={{
                    marginLeft: 10,
                    fontFamily: "SfRegular",
                    fontSize: 14,
                    fontWeight: "400",
                    lineHeight: 20,
                    color: isDark ? "#8A8A8A" : "#364153",
                  }}
                >
                  +92 300 1234567
                </Text>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: isDark ? "#FFFFFF" : "#0B1B0C" },
              ]}
            >
              Bottom percentage sorted stocks​
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    // backgroundColor: "#fff",
    minHeight: "100vh",
    // marginBottom: 200,
    paddingTop: 30,
  },
  scrollView: {
    flex: 1,
    // backgroundColor: "#fff",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  modalContainer: {
    width: 440,

    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  Newcontainer: {
    marginLeft: 20,
    marginRight: 20,
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  websocketButton: {
    borderRadius: 20,
    alignItems: "center",
    width: 56,
    // maxWidth:"auto",
    height: 26,
    flexDirection: "row",
    justifyContent: "center",
    textAlign: "center",
  },
  openButton: {
    backgroundColor: "#3FB9501A",
    color: " #3FB9501A",
    borderWidth: 1,
    borderColor: "#3FB95033",
  },
  closeButton: {
    backgroundColor: "#FF7276",
  },
  // buttonText: {
  //   color: "#fff",
  //   fontSize: 14,
  //   fontWeight: "600",
  // },
  searchBar: {
    marginTop: 10,
    height: 41,
    width: "70%",

    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    backgroundColor: "transparent",
    fontFamily: "SfRegular",
    color: "black",
    marginRight: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 10,
    fontFamily: "SfRegular",
  },
  item: {
    padding: 10,
    marginRight: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
    width: 143,
    height: 52,
    shadowColor: "#0000001A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    borderRadius: 8,
    borderLeftColor: "red",
    borderLeftWidth: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemText: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "SfRegular",
  },
  changeText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "SfRegular",
  },
  verticalList: {
    paddingBottom: 10,
  },
  horizontalList: {
    paddingVertical: 5,
  },
  seeMore: {
    alignItems: "center",
    width: 100,
  },
  seeMoreText: {
    color: "#58BA83",
    fontSize: 16,
    fontWeight: "600",
  },
  researchButton: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 10,
    // marginVertical: 10,
    overflow: "hidden",
  },
  researchText: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "SfRegular",
    color: "#FFFFFF",
    maxWidth: 150,
  },
  marketStatus: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    color: "#E00000",
    marginBottom: 10,
  },
});

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
  TextInput,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseConfig";
import { useFocusEffect } from "@react-navigation/native"; // Import useFocusEffect
import { BaseUrl } from "../../constants/baseUrl";
import { ThemedText } from "@/components/ThemedText";
import WatchListSearch from "../../components/WatchListSearch";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { StockLogo } from "../../components/StockLogo";
import Toast from "react-native-toast-message";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useToastConfig } from "../../Services/toastConfig";
import { useTheme } from "../../hooks/ThemeContext";
import { Svg, Path } from "react-native-svg";

export default function WatchList() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const toastConfig = useToastConfig();

  const [userId, setUserId] = useState(null);
  const [watchlistSymbols, setWatchlistSymbols] = useState(new Set());
  const [SymboleForNews, setSymboleForNews] = useState([]);
  const [WatchListData, setWatchListData] = useState([]);
  // const [SocketWatchListData, setSocketWatchListData] = useState([]);
  const [WatchListNewsData, setWatchListNewsData] = useState([]);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [IsEditEnable, setIsEditEnable] = useState(false);
  const [IsSearchEnable, setIsSearchEnable] = useState(false);
  const [showBriefing, setShowBriefing] = useState(true); // Always start with briefing visible
  const [sortBy, setSortBy] = useState("stock"); // 'stock', 'price', 'change'
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc', 'desc'

  const [stockDetails, setStockDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const lastScrollY = useRef(0);
  const translateY = useSharedValue(0);
  const screenHeight = Dimensions.get("window").height;
  const fullHeight = screenHeight * 0.85;
  const peekHeight = 100;
  const peekOffset = fullHeight - peekHeight;
  const tabHeight = Platform.OS === "web" ? 0 : 83; // Corrected tab bar height; was likely a typo
  const startOffset = useSharedValue(0);

  console.log("Socket Updated Data", WatchListData);
  // WebSocket & Animation
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const priceAnimations = useRef({});
  const changeAnimations = useRef({});

  const watchlistSymbolsArray = useMemo(() => {
    return Array.from(watchlistSymbols);
  }, [watchlistSymbols]);

  const fetchDetail = async (symbol) => {
    try {
      const response = await fetch(
        `${BaseUrl}/api/psxApi/stock-detail/detail/?stock=${symbol}`,
      );
      const data = await response.json();
      return { symbol, ...data };
    } catch (err) {
      setError("Failed to fetch stocks. Please try again later.");
    }
  };

  const formatLargeNumber = (number, decimals = 2) => {
    if (!number || isNaN(number)) return "0";

    const num = Number(number);
    const absNum = Math.abs(num);

    // Under 1,000 → show full number (no K)
    if (absNum < 1000) {
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      });
    }

    // 1,000 to 999,999 → show in K (Thousands)
    if (absNum < 1_000_000) {
      const thousands = num / 1000;
      return `${thousands.toFixed(decimals)}K`;
    }

    // 1,000,000 to 999,999,999 → show in M (Millions)
    if (absNum < 1_000_000_000) {
      const millions = num / 1_000_000;
      return `${millions.toFixed(decimals)}M`;
    }

    // 1 billion and above → show in B (Billions)
    const billions = num / 1_000_000_000;
    return `${billions.toFixed(decimals)}B`;
  };

  useEffect(() => {
    const fetchAllStockDetails = async () => {
      if (!SymboleForNews || SymboleForNews.length === 0) {
        setStockDetails([]);
        // setLoading(false);
        return;
      }

      // setLoading(true);
      setError(null);

      try {
        // Fetch all in parallel
        const promises = SymboleForNews.map((item) =>
          fetchDetail(item?.symbol).catch(() => ({
            symbol: item?.symbol,
            error: "Network error",
          })),
        );

        const results = await Promise.all(promises);

        // Filter out complete failures if needed, or keep all
        setStockDetails(results);
      } catch (err) {
        setError("Failed to fetch stock details");
      } finally {
        setLoading(false);
      }
    };

    fetchAllStockDetails();
  }, [SymboleForNews]);
  // useEffect(() => {
  //   SymboleForNews.map((items, index) => {
  //     fetchDetail(items?.symbol);
  //   });
  // }, [SymboleForNews]);
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
    if (showBriefing) {
      translateY.value = withSpring(peekOffset);
    } else {
      translateY.value = withSpring(fullHeight);
    }
  }, [showBriefing]);

  const sheetContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      "worklet";
      startOffset.value = translateY.value;
    })
    .onUpdate((event) => {
      "worklet";
      // Limit between 0 (full open) and peekOffset (peeked)
      translateY.value = Math.max(
        0,
        Math.min(peekOffset, startOffset.value + event.translationY),
      );
    })
    .onEnd((event) => {
      "worklet";
      const currentOffset = translateY.value;
      // Snap to full open (0) or peeked (peekOffset), no hiding
      if (event.velocityY < -500 || currentOffset < peekOffset / 2) {
        translateY.value = withSpring(0);
      } else {
        translateY.value = withSpring(peekOffset);
      }
    });

  const fetchWatchlist = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("watchlist")
        .select("symbol")
        .eq("userid", userId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching watchlist:", error);
        setIsLoading(false);
      } else {
        const symbols = new Set(data?.map((d) => d.symbol) || []);
        setSymboleForNews(data);
        setWatchlistSymbols(symbols);
        if (symbols.size === 0) {
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error("Fetch watchlist error:", err);
    }
  }, [userId, IsSearchEnable]);

  const deleteWatchlistItem = useCallback(
    async (symbol) => {
      if (!userId) return;
      try {
        const { error } = await supabase
          .from("watchlist")
          .delete()
          .eq("userid", userId)
          .eq("symbol", symbol);
        if (error) {
          console.error("Error deleting watchlist item:", error);
        } else {
          // Update local state
          setWatchlistSymbols((prev) => {
            const newSet = new Set(prev);
            newSet.delete(symbol);
            return newSet;
          });
          // Refetch data to update WatchListData
          // await fetchRecentDataValues();
          Toast.show({
            type: "success",
            text1: "WatchList Delete",
            text2: "Delete Successfully",
          });
          setIsEditEnable(false);
        }
      } catch (err) {
        console.error("Delete watchlist error:", err);
      }
    },
    [userId],
  );

  const sortedWatchListData = useMemo(() => {
    if (WatchListData.length === 0) return [];
    return [...WatchListData].sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case "stock":
          valA = a.symbol.toLowerCase();
          valB = b.symbol.toLowerCase();
          return sortOrder === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        case "price":
          valA = a.data?.close_price || 0;
          valB = b.data?.close_price || 0;
          return sortOrder === "asc" ? valA - valB : valB - valA;
        case "change":
          valA = a.data?.change || 0;
          valB = b.data?.change || 0;
          return sortOrder === "asc" ? valA - valB : valB - valA;
        default:
          return 0;
      }
    });
  }, [WatchListData, sortBy, sortOrder]);

  const renderWatchlistItem = useCallback(
    ({ item, index }) => (
      <View
        style={{
          paddingVertical: 10,
          borderBottomColor: isDark ? "" : "#ECECEC",
          borderBottomWidth: 1,
          paddingHorizontal: 24,
        }}
      >
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          onPress={() => router.push(`/StockDetail?symbol=${item?.symbol}`)}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {IsEditEnable ? (
              <TouchableOpacity
                onPress={() => deleteWatchlistItem(item.symbol)}
              >
                <Image
                  source={require("../../assets/delete_icon.png")}
                  style={{
                    width: 22,
                    height: 22,
                    marginRight: 18,
                  }}
                />
              </TouchableOpacity>
            ) : (
              <>
                {/* <Image
                  source={require("../../assets/test_icon.png")}
                  style={{
                    width: 32,
                    height: 32,
                    marginRight: 6,
                    borderRadius: 40,
                  }}
                /> */}
                <View style={{ marginRight: 6 }}>
                  {" "}
                  <StockLogo symbol={item.symbol} size={32} />
                </View>
              </>
            )}

            <Text
              style={{
                fontSize: 14,
                fontFamily: "SfRegular",
                fontWeight: "500",
                color: isDark ? "#E0E0E0" : "#0B1B0C",
              }}
            >
              {item?.symbol}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "flex-end",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: "SfRegular",
                fontWeight: "600",
                color: isDark ? "#E0E0E0" : "#0B1B0C",
              }}
            >
              <Text style={{ fontSize: 10 }}>PKR</Text>{" "}
              {item?.data?.close_price}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ marginRight: 3 }}>
                {isDark ? (
                  item.data?.percent_change > 0 ? (
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
                ) : item.data?.percent_change > 0 ? (
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
                  fontSize: 12,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  color: isDark
                    ? item.data?.percent_change > 0
                      ? "#3FB950"
                      : "#FF6B6B"
                    : item.data?.percent_change > 0
                      ? "#3FB950"
                      : "#E00000",
                  // color: "white",
                  paddingVertical: 6,
                }}
              >
                {Math.abs(item?.data?.change)} (
                {(Math.abs(item?.data?.percent_change) * 100).toFixed(2)}%)
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        {/* <Text
            style={{
              marginStart: 36,
              marginTop: 4,
              color: "#6E6E6E",
              fontSize: 11,
              fontFamily: "SfRegular",
              fontWeight: "400",
            }}
          >
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Officiis
            hic dolorum libero minimsdkfmsdfsldknf
          </Text> */}

        <View
          style={{
            flexDirection: "row",
            gap: 25,
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            marginTop: 10,
            marginRight: 10,
            backgroundColor: isDark ? "#1A1A1A" : "#F9F9F9",
            padding: 10,
            borderRadius: 6,
            width: "100%",
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 12,
                color: "#8A8A8A",
                fontWeight: "500",
                fontFamily: "SfRegular",
              }}
            >
              Bid Price
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: isDark ? "#FFFFFF" : "#0B1B0C",
                marginTop: 6,
                fontFamily: "SfRegular",
              }}
            >
              {formatLargeNumber(item?.data?.bid_price)}
            </Text>
          </View>

          <View>
            <Text
              style={{
                fontSize: 12,
                color: "#8A8A8A",
                fontWeight: "500",
                fontFamily: "SfRegular",
              }}
            >
              Bid Volume
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: isDark ? "#FFFFFF" : "#0B1B0C",
                marginTop: 6,
                fontFamily: "SfRegular",
              }}
            >
              {formatLargeNumber(item?.data?.bid_volume)}
            </Text>
          </View>

          <View>
            <Text
              style={{
                fontSize: 12,
                color: "#8A8A8A",
                fontWeight: "500",
                fontFamily: "SfRegular",
              }}
            >
              Ask Price
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: isDark ? "#FFFFFF" : "#0B1B0C",
                marginTop: 6,
                fontFamily: "SfRegular",
              }}
            >
              {formatLargeNumber(item?.data?.ask_price)}
            </Text>
          </View>

          <View>
            <Text
              style={{
                fontSize: 12,
                color: "#8A8A8A",
                fontWeight: "500",
                fontFamily: "SfRegular",
              }}
            >
              Ask Volume
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: isDark ? "#FFFFFF" : "#0B1B0C",
                marginTop: 6,
                fontFamily: "SfRegular",
              }}
            >
              {formatLargeNumber(item?.data?.ask_volume)}
            </Text>
          </View>
        </View>
      </View>
    ),
    [IsEditEnable, IsSearchEnable, deleteWatchlistItem],
  );

  const formatDate = (dateString) => {
    const defaultDate = "20/11/2024";
    if (!dateString) return defaultDate;
    const date = new Date(dateString);
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

  // Removed handleScroll since briefing is always visible and no longer triggered by scroll

  const renderWatchlistContent = () => {
    if (isLoading) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color="#58BA83" />
        </View>
      );
    }

    if (IsSearchEnable) {
      return (
        <WatchListSearch
          setValue={setIsSearchEnable}
          colorScheme={colorScheme}
        />
      );
    }

    if (WatchListData.length > 0) {
      return (
        <>
          <View
            style={{
              paddingHorizontal: 24,
              paddingVertical: 10,
            }}
          >
            {/* <TouchableOpacity
              style={[styles.websocketButton, styles.openButton]}
              accessible={true}
            >
              <Text
                style={{
                  color: "#3FB950",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Open
              </Text>
            </TouchableOpacity> */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <View>
                <Text style={styles.textdesign}>Stock</Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginRight: 10,
                }}
              >
                <Text style={styles.textdesign}>Price/</Text>
                <Text style={styles.textdesign}>Change</Text>
              </View>
            </View>
          </View>
          <FlatList
            data={sortedWatchListData}
            renderItem={renderWatchlistItem}
            keyExtractor={(item, index) => `${item.symbol}-${index}`}
            scrollEnabled={false}
            style={{ marginTop: 10, paddingBottom: 250 }}
          />
        </>
      );
    }

    // Empty state (no search, no data)
    return (
      <View style={{ marginHorizontal: 24, marginTop: 80 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: isDark ? "#E0E0E0" : "#0B1B0C",
            fontFamily: "SfRegular",
          }}
        >
          Create a Watchlist
        </Text>
        <Text
          style={{
            marginTop: 18,
            fontSize: 16,
            fontWeight: "400",
            color: isDark ? "#8A8A8A" : "#444B44",
            fontFamily: "SfRegular",
          }}
        >
          The purpose of watchlist is to provide you with the functionality to
          select specific stocks from the full list.
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => setIsSearchEnable(true)}
        >
          <ThemedText type="defaultSemiBold" style={styles.loginButtonText}>
            Start Exploring
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBriefingSheet = () => (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "transparent",
        zIndex: 1000,
      }}
      pointerEvents="box-none"
    >
      {/* Removed backdrop TouchableOpacity to allow interaction with watchlist */}
      {/* Sheet */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: fullHeight,
            backgroundColor: isDark ? "#222222" : "#F0F0F0",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            // paddingBottom: tabHeight,
          },
          sheetContainerStyle,
        ]}
      >
        {/* Handle Bar */}
        <GestureDetector gesture={panGesture}>
          <View>
            <View
              style={{
                alignItems: "center",
                paddingVertical: 10,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: isDark ? "#000000" : "#ccc",
                  borderRadius: 2,
                }}
              />
            </View>

            {/* Modal Header */}
            <View style={styles.header}>
              {/* <TouchableOpacity
            onPress={() => setShowBriefing(false)}
            style={{ padding: 10 }}
          >
            <Image
              source={require("../../assets/crose_icon.png")} // Assume close icon asset
              style={{ width: 24, height: 24 }}
            />
          </TouchableOpacity> */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={[
                    styles.headerTitle,
                    {
                      color: isDark ? "#E0E0E0" : "",
                    },
                  ]}
                >
                  Daily Briefing
                </Text>
              </View>
              {/* <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Image
              source={require("../../assets/notification_new.png")}
              style={{ width: 26, height: 26, marginRight: 4 }}
            />
          </View> */}
            </View>

            {/* <TextInput
              style={styles.searchBar}
              placeholder="Search"
              placeholderTextColor="#8A8A8A"
            /> */}
          </View>
        </GestureDetector>
        {/* News Content */}
        <ScrollView style={{ flex: 1, paddingBottom: 20 }}>
          <View style={{ paddingHorizontal: 24, marginVertical: 12 }}>
            {/* {stockDetails?.map((stocks, stockIndex) => {
              <View key={stockIndex}>
                <Text>{stocks?.symbol}</Text>

                {stocks?.news?.map((item, index) => {
                  <TouchableOpacity
                    style={{
                      flexDirection: "column",
                      width: "auto",
                      backgroundColor: "#F9F9F9",
                      borderRadius: 8,
                      padding: 8,
                      marginVertical: 12,
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
                      <View style={{ width: "60%" }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "500",
                            color: "#8A8A8A",
                            flex: 1,
                            flexWrap: "wrap",
                            paddingTop: 12,
                            fontFamily: "SfRegular",
                            alignItems: "center",
                          }}
                        >
                          Reuters . 21m ago
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "black",
                            flex: 1,
                            flexWrap: "wrap",
                            paddingTop: 12,
                            fontFamily: "SfRegular",
                          }}
                        >
                          BlackRock, Nvidia-backed group strikes $40 billion AI
                          data centre deal
                        </Text>
                        <View
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
                        </View>
                      </View>
                      <Image
                        source={
                          item?.image
                            ? { uri: item.image }
                            : require("../../assets/new_image.png")
                        }
                        style={{
                          width: 106,
                          height: 106,
                          // marginLeft: 10,
                          borderRadius: 8,
                        }}
                        resizeMode="cover"
                        defaultSource={require("../../assets/new_image.png")}
                      />
                    </View>
                  </TouchableOpacity>;
                })}
              </View>;
            })} */}
            {loading ? (
              <Text
                style={{
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                }}
              >
                Loading News
              </Text>
            ) : (
              stockDetails?.map((stocks, stockIndex) => (
                <View key={stockIndex}>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "600",
                      fontSize: 22,
                      lineHeight: 26,
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    {stocks?.name}
                  </Text>

                  {stocks?.news?.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={{
                        flexDirection: "column",
                        width: "auto",
                        backgroundColor: isDark ? "#1A1A1A" : "#F9F9F9",
                        borderRadius: 8,
                        padding: 8,
                        marginVertical: 12,
                        borderWidth: isDark ? 1 : 0,
                        borderColor: isDark ? "#FFFFFF14" : "",
                      }}
                      onPress={() => router.push(item.link)}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <View style={{ width: "60%" }}>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "500",
                              color: "#8A8A8A",
                              flexWrap: "wrap",
                              // paddingTop: 4,
                              fontFamily: "SfRegular",
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
                              : ""}{" "}
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: isDark ? "#E0E0E0" : "#0B1B0C",
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
                              : require("../../assets/new_image.png")
                          }
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 8,
                          }}
                          resizeMode="cover"
                          defaultSource={require("../../assets/new_image.png")}
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );

  const { width: screenWidth } = Dimensions.get("window");

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          // Fetch watchlist if user is logged in
          if (userId) {
            await fetchWatchlist();
          }
        } catch (err) {
          console.error("Error loading cached data:", err);
          setError("Failed to load data. Please try again.");
        } finally {
        }
      };

      loadData();

      return () => {};
    }, [fetchWatchlist, userId]), // Dependencies
  );

  useFocusEffect(
    useCallback(() => {
      const resetStatesOnFocus = () => {
        // Reset all UI states to default when tab is focused
        setIsEditEnable(false);
        setIsSearchEnable(false);
        setShowMenu(false);
        setShowSortMenu(false);
        // setShowBriefing(true);        // Uncomment if you want to reset briefing too
        setSortBy("stock");
        setSortOrder("asc");
      };

      resetStatesOnFocus();

      // Cleanup function (optional)
      return () => {
        // You can do cleanup here if needed
      };
    }, []), // Important: add dependencies
  );

  const fetchRecentDataValues = useCallback(async () => {
    if (watchlistSymbols.size === 0) {
      setWatchListData([]);
      return;
    }

    setIsLoading(true);

    try {
      const symbolsParam = Array.from(watchlistSymbols).join(",");
      const response = await fetch(
        `${BaseUrl}/api/stocks/stock/latest-stock-data/?symbols=${symbolsParam}`,
      );

      const responseData = await response.json();

      let dataArray = Array.isArray(responseData)
        ? responseData
        : responseData.data || [];

      const formatted = dataArray.map((item) => ({
        symbol: item.symbol,
        data: {
          close_price: parseFloat(item.data?.close_price || 0),
          change: parseFloat(item.data?.change || 0),
          percent_change: parseFloat(item.data?.percent_change || 0),
          bid_price: parseFloat(item.data?.bid_price || 0),
          bid_volume: parseFloat(item.data?.bid_volume || 0),
          ask_price: parseFloat(item.data?.ask_price || 0),
          ask_volume: parseFloat(item.data?.ask_volume || 0),
        },
      }));

      setWatchListData(formatted);
    } catch (err) {
      setError("Failed to fetch initial data.");
      setWatchListData([]);
    } finally {
      setIsLoading(false);
    }
  }, [watchlistSymbols]);

  useEffect(() => {
    fetchRecentDataValues();
  }, [fetchRecentDataValues]);

  // WebSocket Connection (Real-time updates)
  // ------------------ ✅ FIX 4: WEBSOCKET REAL-TIME UPDATE ------------------
  useEffect(() => {
    if (watchlistSymbolsArray.length === 0) return;

    let websocket = null;
    let reconnectTimeout = null;

    // const connect = () => {
    //   if (wsRef.current) {
    //     wsRef.current.close();
    //   }

    //   websocket = new WebSocket("wss://ielapis.u2ventures.io/ws/market/feed/");

    //   websocket.onopen = () => {
    //     setIsConnected(true);

    //     const symbols = Array.from(watchlistSymbols);
    //     websocket.send(JSON.stringify({ type: "subscribe", symbols }));
    //   };

    //   websocket.onmessage = (event) => {
    //     try {
    //       const msg = JSON.parse(event.data);

    //       if (msg.message === "Received tick" && msg.data?.data?.s) {
    //         const tick = msg.data.data;
    //         const symbol = tick.s;

    //         if (!watchlistSymbols.has(symbol)) return;

    //         setWatchListData((prevData) => {
    //           const index = prevData.findIndex(
    //             (item) => item.symbol === symbol,
    //           );

    //           const newItem = {
    //             symbol,
    //             data: {
    //               close_price: Number(tick.c || 0),
    //               change: Number(tick.ch || 0),
    //               percent_change: Number(tick.pch || 0), // ✅ FIXED
    //               bid_price: tick?.bp || 0,
    //               bid_volume: tick?.bv || 0,
    //               ask_price: tick?.ap || 0,
    //               ask_volume: tick?.av || 0,
    //             },
    //           };

    //           // 🔥 Trigger animations
    //           const priceAnim = priceAnimations.current[symbol];
    //           const changeAnim = changeAnimations.current[symbol];

    //           if (priceAnim) {
    //             Animated.sequence([
    //               Animated.timing(priceAnim, {
    //                 toValue: 1.12,
    //                 duration: 120,
    //                 useNativeDriver: true,
    //               }),
    //               Animated.timing(priceAnim, {
    //                 toValue: 1,
    //                 duration: 180,
    //                 useNativeDriver: true,
    //               }),
    //             ]).start();
    //           }

    //           if (changeAnim) {
    //             Animated.sequence([
    //               Animated.timing(changeAnim, {
    //                 toValue: 1.15,
    //                 duration: 140,
    //                 useNativeDriver: true,
    //               }),
    //               Animated.timing(changeAnim, {
    //                 toValue: 1,
    //                 duration: 220,
    //                 useNativeDriver: true,
    //               }),
    //             ]).start();
    //           }

    //           if (index !== -1) {
    //             const updated = [...prevData];
    //             updated[index] = newItem;
    //             return updated;
    //           }

    //           return [...prevData, newItem];
    //         });
    //       }
    //     } catch (err) {
    //       console.log("WS parse error", err);
    //     }
    //   };

    //   websocket.onclose = () => {
    //     setIsConnected(false);
    //     reconnectTimeout = setTimeout(connect, 3000); // ✅ reconnect
    //   };

    //   websocket.onerror = () => {
    //     setIsConnected(false);
    //   };

    //   wsRef.current = websocket;
    // };

    const connect = () => {
      // Close any existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      websocket = new WebSocket("wss://feed.iel.net.pk");

      // Important: Enable proper binary data handling
      websocket.binaryType = "arraybuffer";

      websocket.onopen = () => {
        setIsConnected(true);
        console.log("[WS] ✅ Connected → subscribing to watchlist symbols");

        const symbols = Array.from(watchlistSymbols);
        if (symbols.length > 0) {
          websocket.send(
            JSON.stringify({
              type: "subscribe",
              symbols,
            }),
          );
          console.log("[WS] 📤 Subscribed to:", symbols);
        }
      };

      // Updated onmessage with async binary (Blob) support
      websocket.onmessage = async (event) => {
        let textData;

        try {
          // Handle binary Blob or text data
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
            console.warn("[WS] ⚠️ Unknown data type received");
            return;
          }

          const msg = JSON.parse(textData);

          if (msg?.type === "tick" && msg.data?.s) {
            const tick = msg.data;
            const symbol = tick.s;

            // Safety check
            if (!watchlistSymbols.has(symbol)) return;

            setWatchListData((prevData) => {
              const index = prevData.findIndex(
                (item) => item.symbol === symbol,
              );

              const newItem = {
                symbol,
                data: {
                  close_price: Number(tick.c || 0),
                  change: Number(tick.ch || 0),
                  percent_change: Number(tick.pch || 0),
                  bid_price: tick?.bp || 0,
                  bid_volume: tick?.bv || 0,
                  ask_price: tick?.ap || 0,
                  ask_volume: tick?.av || 0,
                },
              };

              // Trigger animations
              const priceAnim = priceAnimations.current[symbol];
              const changeAnim = changeAnimations.current[symbol];

              if (priceAnim) {
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
              }

              if (changeAnim) {
                Animated.sequence([
                  Animated.timing(changeAnim, {
                    toValue: 1.15,
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

              if (index !== -1) {
                const updated = [...prevData];
                updated[index] = newItem;
                return updated;
              }

              return [...prevData, newItem];
            });
          }
        } catch (err) {
          console.error("[WS] ❌ Parse/processing error:", err);

          // Debug raw data when parsing fails
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
        console.log(`[WS] 🔌 Disconnected (code: ${e.code})`);
        setIsConnected(false);

        // Reconnect only on abnormal close (not clean shutdown)
        if (e.code !== 1000) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };

      // Store reference
      wsRef.current = websocket;
    };
    connect();

    return () => {
      if (websocket) websocket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [watchlistSymbolsArray]);
  const handleSortModalButtonClick = () => {
    setShowMenu(false);
    setShowSortMenu(!showSortMenu);
  };

  const handleShowModalButtonClick = () => {
    setShowSortMenu(false);
    setShowMenu(!showMenu);
  };

  const handleOustSideClick = () => {
    setShowMenu(false);
    setShowSortMenu(false);
  };
  return (
    <>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ScrollView
          style={[
            styles.scrollView,
            {
              backgroundColor: isDark ? "" : "#fff",
            },
          ]}
          scrollEventThrottle={16}
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
                }}
              >
                <Text
                  style={[
                    styles.headerTitle,
                    {
                      color: isDark ? "#E0E0E0" : "",
                    },
                  ]}
                >
                  Watchlist
                </Text>{" "}
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <TouchableOpacity onPress={()=>router.push("/Search")}>
                  <Image
                    source={
                      isDark
                        ? require("../../assets/icons/add_dark.png")
                        : require("../../assets/plus_new_design.png")
                    }
                    style={{ width: 32, height: 32, marginRight: 8 }}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSortModalButtonClick}>
                  <Image
                    source={
                      isDark
                        ? require("../../assets/icons/portfolio_sorting_dark.png")
                        : require("../../assets/sorts_new.png")
                    }
                    style={{ width: 32, height: 32, marginRight: 8 }}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShowModalButtonClick}>
                  <Image
                    source={
                      isDark
                        ? require("../../assets/icons/dots_dark.png")
                        : require("../../assets/dots_new.png")
                    }
                    style={{ width: 32, height: 32, marginRight: 4 }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {renderWatchlistContent()}
          </View>

          {showMenu && (
            <View
              style={{
                backgroundColor: "#ECECEC",
                opacity: 0.8,
                width: 193,
                // height: 50,
                position: "absolute",
                top: 90,
                right: 20,
                padding: 12,
                borderRadius: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setIsEditEnable(!IsEditEnable);
                  setShowMenu(false);
                }}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("../../assets/tick_icon.png")}
                    style={{
                      width: 11,
                      height: 9,
                      marginRight: 4,
                      marginTop: 2,
                      display: IsEditEnable ? "flex" : "none",
                    }}
                  />
                  <Text style={{ marginLeft: IsEditEnable ? 0 : 16 }}>
                    Edit Watchlist
                  </Text>
                </View>
                <Image
                  source={require("../../assets/edit_icon_new.png")}
                  style={{ width: 9, height: 9, marginRight: 4 }}
                />
              </TouchableOpacity>

              {/* <TouchableOpacity
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("../../assets/tick_icon.png")}
                    style={{
                      width: 11,
                      height: 9,
                      marginTop: 2,
                      display: "none",
                    }}
                  />
                  <Text style={{ marginLeft: 16 }}>Show Currency</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("../../assets/tick_icon.png")}
                    style={{
                      width: 11,
                      height: 9,
                      marginTop: 2,
                      display: "none",
                    }}
                  />
                  <Text style={{ marginLeft: 16 }}>Watchlist Shows</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("../../assets/tick_icon.png")}
                    style={{
                      width: 11,
                      height: 9,
                      marginTop: 2,
                      display: "none",
                    }}
                  />
                  <Text style={{ marginLeft: 16 }}>Price Change</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("../../assets/tick_icon.png")}
                    style={{
                      width: 11,
                      height: 9,
                      marginTop: 2,
                      display: "none",
                    }}
                  />
                  <Text style={{ marginLeft: 16 }}>Percentage Change</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("../../assets/tick_icon.png")}
                    style={{
                      width: 11,
                      height: 9,
                      marginTop: 2,
                      display: "none",
                    }}
                  />
                  <Text style={{ marginLeft: 16 }}>Market Cap</Text>
                </View>
              </TouchableOpacity> */}
            </View>
          )}
          {showSortMenu && (
            <View
              style={{
                backgroundColor: "#ECECEC",
                opacity: 0.8,
                width: 240,
                // height: 210,
                position: "absolute",
                top: 90,
                right: 60,
                padding: 12,
                borderRadius: 8,
              }}
            >
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onPress={() => {
                  setSortBy("stock");
                  setSortOrder("asc");
                  setShowSortMenu(false);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("../../assets/tick_icon.png")}
                    style={{
                      width: 11,
                      height: 9,
                      marginRight: 4,
                      marginTop: 2,
                      display:
                        sortBy === "stock" && sortOrder === "asc"
                          ? "flex"
                          : "none",
                    }}
                  />
                  <Text
                    style={{
                      marginLeft:
                        sortBy === "stock" && sortOrder === "asc" ? 0 : 16,
                    }}
                  >
                    Stock Name (A to Z)
                  </Text>
                </View>
                <Image
                  source={require("../../assets/edit_icon_new.png")}
                  style={{ width: 9, height: 9, marginRight: 4 }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                }}
                onPress={() => {
                  setSortBy("stock");
                  setSortOrder("desc");
                  setShowSortMenu(false);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("../../assets/tick_icon.png")}
                    style={{
                      width: 11,
                      height: 9,
                      marginTop: 2,
                      marginRight: 4,
                      display:
                        sortBy === "stock" && sortOrder === "desc"
                          ? "flex"
                          : "none",
                    }}
                  />
                  <Text
                    style={{
                      marginLeft:
                        sortBy === "stock" && sortOrder === "desc" ? 0 : 16,
                    }}
                  >
                    Stock Name (Z to A)
                  </Text>
                </View>
                <Image
                  source={require("../../assets/edit_icon_new.png")}
                  style={{ width: 9, height: 9, marginRight: 4 }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                }}
                onPress={() => {
                  setSortBy("price");
                  setSortOrder("asc");
                  setShowSortMenu(false);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("../../assets/tick_icon.png")}
                    style={{
                      width: 11,
                      height: 9,
                      marginTop: 2,
                      marginRight: 4,
                      display:
                        sortBy === "price" && sortOrder === "asc"
                          ? "flex"
                          : "none",
                    }}
                  />
                  <Text
                    style={{
                      marginLeft:
                        sortBy === "price" && sortOrder === "asc" ? 0 : 16,
                    }}
                  >
                    Price (Low to High)
                  </Text>
                </View>
                <Image
                  source={require("../../assets/edit_icon_new.png")}
                  style={{ width: 9, height: 9, marginRight: 4 }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                }}
                onPress={() => {
                  setSortBy("price");
                  setSortOrder("desc");
                  setShowSortMenu(false);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("../../assets/tick_icon.png")}
                    style={{
                      width: 11,
                      height: 9,
                      marginTop: 2,
                      marginRight: 4,
                      display:
                        sortBy === "price" && sortOrder === "desc"
                          ? "flex"
                          : "none",
                    }}
                  />
                  <Text
                    style={{
                      marginLeft:
                        sortBy === "price" && sortOrder === "desc" ? 0 : 16,
                    }}
                  >
                    Price (High to Low)
                  </Text>
                </View>
                <Image
                  source={require("../../assets/edit_icon_new.png")}
                  style={{ width: 9, height: 9, marginRight: 4 }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                }}
                onPress={() => {
                  setSortBy("change");
                  setSortOrder("asc");
                  setShowSortMenu(false);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("../../assets/tick_icon.png")}
                    style={{
                      width: 11,
                      height: 9,
                      marginTop: 2,
                      marginRight: 4,
                      display:
                        sortBy === "change" && sortOrder === "asc"
                          ? "flex"
                          : "none",
                    }}
                  />
                  <Text
                    style={{
                      marginLeft:
                        sortBy === "change" && sortOrder === "asc" ? 0 : 16,
                    }}
                  >
                    Pricechange (Low to High)
                  </Text>
                </View>
                <Image
                  source={require("../../assets/edit_icon_new.png")}
                  style={{ width: 9, height: 9, marginRight: 4 }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                }}
                onPress={() => {
                  setSortBy("change");
                  setSortOrder("desc");
                  setShowSortMenu(false);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("../../assets/tick_icon.png")}
                    style={{
                      width: 11,
                      height: 9,
                      marginTop: 2,
                      marginRight: 4,
                      display:
                        sortBy === "change" && sortOrder === "desc"
                          ? "flex"
                          : "none",
                    }}
                  />
                  <Text
                    style={{
                      marginLeft:
                        sortBy === "change" && sortOrder === "desc" ? 0 : 16,
                    }}
                  >
                    Pricechange (High to Low)
                  </Text>
                </View>
                <Image
                  source={require("../../assets/edit_icon_new.png")}
                  style={{ width: 9, height: 9, marginRight: 4 }}
                />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
        {WatchListData.length > 0 && renderBriefingSheet()}
      </GestureHandlerRootView>
      <Toast config={toastConfig} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#fff",
    paddingTop: 50, // Adjust for status bar
  },

  scrollView: {
    flex: 1,
    // backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    // borderBottomWidth: 1,
    // borderBottomColor: "#eee",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    fontFamily: "SfRegular",
  },

  textdesign: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "SfRegular",
    color: "#8A8A8A",
  },
  searchBar: {
    marginTop: 10,
    height: 36,
    borderWidth: 1,
    borderColor: "#ECECEC",
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    backgroundColor: "#F4F4F4",
    marginHorizontal: 24,
    fontFamily: "SfRegular",
  },
  loginButton: {
    backgroundColor: "#58BA83",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    width: "100%",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "SfRegular",
  },
  websocketButton: {
    borderRadius: 20,
    alignItems: "center",
    width: 70,
    height: 26,
    flexDirection: "row",
    justifyContent: "center",
    textAlign: "center",
    marginVertical: 10,
  },
  openButton: {
    backgroundColor: "#3FB9501A",
    color: "#3FB950",
  },
});

import { useState, useEffect, useCallback, useMemo } from "react";
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
  AppState,
  ImageBackground,
  Modal,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { supabase } from "../../supabaseConfig";
import { useColorScheme } from "@/hooks/useColorScheme";
import { StockLogo } from "../../components/StockLogo";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../hooks/ThemeContext";

export default function Portfolio() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();

  console.log(colorScheme);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortBy, setSortBy] = useState("stock"); // 'stock', 'price', 'change'
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedStock, setSelectedStock] = useState(null);
  const [isAccount, setisAccount] = useState(false);
  const router = useRouter();
  const [profileuser, setprofileUser] = useState(null);
  const [ClientPorfolio, setClientPorfolio] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ClientData, setClientData] = useState([]);

  const [refreshing, setRefreshing] = useState(false);

  const screenHeight = Dimensions.get("window").height;
  // const translateY = useSharedValue(0);
  const fullHeight = screenHeight * 0.85;
  const peekHeight = 100;
  const peekOffset = fullHeight - peekHeight;
  const SHEET_HEIGHT = screenHeight * 0.8;
  const translateY = useSharedValue(SHEET_HEIGHT);

  const formatPKR = (num) => {
    if (!num) return;
    const parts = Number(num).toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const sortedHoldings = useMemo(() => {
    if (!ClientPorfolio?.holdings?.length) return [];

    return [...ClientPorfolio.holdings].sort((a, b) => {
      if (sortBy === "stock") {
        const valA = (a.security || "").toUpperCase();
        const valB = (b.security || "").toUpperCase();
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (sortBy === "price") {
        const valA = Number(a.currentValue ?? a.totalCost ?? 0);
        const valB = Number(b.currentValue ?? b.totalCost ?? 0);
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }

      if (sortBy === "change") {
        const getPct = (item) => {
          const gain = Number(item.capGainLoss ?? 0);
          const base = Number(item.totalCost ?? 1);
          return (gain / base) * 100;
        };
        const pctA = getPct(a);
        const pctB = getPct(b);
        return sortOrder === "asc" ? pctA - pctB : pctB - pctA;
      }

      return 0;
    });
  }, [ClientPorfolio?.holdings, sortBy, sortOrder]);
  const fetchProfileUser = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
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
        setisAccount(data?.account);
        setLoading(false);
        console.log("Profile fetched:", data);
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
      setLoading(false);
    }
  }, [userId]);

  // Call fetchProfileUser after userId is set
  // useFocusEffect(() => {
  //   if (userId) {
  //     fetchProfileUser();
  //   }
  // }, [userId]);

  console.log(profileuser);

  const fetchClientCode = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("ClientCode")
        .select("*")
        .eq("userId", userId)
        .maybeSingle();
      console.log(data);
      setClientData(data);
    } catch (err) {
      console.error("Fetch Client Code error:", err);
    }
  }, [userId]);

  // useEffect(() => {
  //   if (userId) {
  //     fetchClientCode();
  //   }
  // }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchProfileUser();
        fetchClientCode();
      }
    }, [userId, fetchProfileUser, fetchClientCode]), // ← dependencies here
  );

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
            // clientCode: "0031",
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

  // useEffect(() => {
  //   if (!ClientData?.cliendCode) return;
  //   const loadPortfolio = async () => {
  //     try {
  //       setLoading(true);

  //       const data = await fetchClientPortfolio();
  //       setClientPorfolio(data?.detailInformation[0]);
  //     } catch (err) {
  //       console.log(err.message || "Failed to load portfolio");
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   loadPortfolio();
  // }, [ClientData]);

  useFocusEffect(
    useCallback(() => {
      if (!ClientData?.cliendCode) return; // fixed typo

      const loadPortfolio = async () => {
        try {
          setLoading(true);
          const data = await fetchClientPortfolio();
          setClientPorfolio(data?.detailInformation?.[0]);
        } catch (err) {
          // setError(err.message || "Failed to load portfolio");
          console.log(err.message || "Failed to load portfolio");
        } finally {
          setLoading(false);
        }
      };

      loadPortfolio();

      // Optional: cleanup (good practice)
      return () => {
        // If you need to cancel requests or reset state on blur
        // e.g. abortController.abort();
      };
    }, [ClientData?.cliendCode]), // ← Only depend on what actually changes
  );
  console.log(ClientPorfolio);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const Data = [
    {
      symbol: "OG",
      numberOfShares: 500,
      price: 343.45,
      totalPrice: "171,725.00",
      change: "+14.48%",
    },
    {
      symbol: "EN",
      numberOfShares: 500,
      price: 343.45,
      totalPrice: "171,725.00",
      change: "-14.48%",
    },
    {
      symbol: "PS",
      numberOfShares: 500,
      price: 343.45,
      totalPrice: "171,72574832.00",
      change: "+14.48%",
    },
  ];

  const getSortedData = () => {
    let sorted = [...Data];
    sorted.sort((a, b) => {
      let valA, valB;
      if (sortBy === "stock") {
        valA = a.symbol;
        valB = b.symbol;
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else if (sortBy === "price") {
        valA = a.price;
        valB = b.price;
        return sortOrder === "asc" ? valA - valB : valB - valA;
      } else if (sortBy === "change") {
        const parseChange = (ch) => {
          const num = parseFloat(ch.replace("%", "").replace(/[+-]/, ""));
          return ch.includes("-") ? -num : num;
        };
        valA = parseChange(a.change);
        valB = parseChange(b.change);
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      return 0;
    });
    return sorted;
  };

  const sortedData = getSortedData();

  useEffect(() => {
    if (selectedStock) {
      translateY.value = withSpring(0);
    } else {
      translateY.value = withSpring(SHEET_HEIGHT);
    }
  }, [selectedStock]);

  const context = useSharedValue({ y: 0 });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = Math.max(
        0,
        Math.min(SHEET_HEIGHT, event.translationY + context.value.y),
      );
    })
    .onEnd(() => {
      if (translateY.value > SHEET_HEIGHT * 0.4) {
        runOnJS(setSelectedStock)(null);
        translateY.value = withSpring(SHEET_HEIGHT);
      } else {
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const renderStockCard = (item) => {
    const Chnage = item?.capGainLoss;
    const isPositiveChange = Chnage > 0;
    return (
      <TouchableOpacity
        style={[
          styles.stockCard,
          {
            backgroundColor: isDark ? "" : "#fff",
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "#FFFFFF14" : "#E0E0E0",
          },
        ]}
        onPress={() => setSelectedStock(item)}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.symbolContainer,
              {
                backgroundColor: isDark ? "#222222" : "#EBEBEB",
              },
            ]}
          >
            <Text
              style={[
                styles.symbolText,
                {
                  color: "#53BA83",
                },
              ]}
              numberOfLines={1} // ← prevents wrapping to 2 lines
              adjustsFontSizeToFit // ← iOS only – auto-shrinks text
              minimumFontScale={0.7}
            >
              {item.security}
            </Text>
            {/* <StockLogo symbol={item?.security} size={52} /> */}
          </View>
          <View style={styles.sharesContainer}>
            <Text
              style={{
                fontFamily: "SfRegular",
                fontSize: 16,
                fontWeight: "600",
                lineHeight: 24,
                color: isDark ? "#E0E0E0" : "#0B1B0C",
              }}
            >
              {item.security}
            </Text>
            <View style={{ flexDirection: "row" }}>
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontSize: 12,
                  fontWeight: "400",
                  lineHeight: 18,
                  color: "#8A8A8A",
                }}
              >
                {item.quantity} {"\n"}shares
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginLeft: 20,
                }}
              >
                <View
                  style={{
                    width: 3,
                    height: 3,
                    backgroundColor: "#D0D0D0",
                    borderRadius: "100%",
                  }}
                ></View>
                <Text
                  style={{
                    fontFamily: "SfRegular",
                    fontSize: 12,
                    fontWeight: "400",
                    lineHeight: 18,
                    color: "#8A8A8A",
                    marginLeft: 6,
                  }}
                >
                  PKR {"\n"}
                  {item.currentPrice}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontFamily: "SfRegular",
                fontSize: 16,
                lineHeight: 24,
                fontWeight: "600",
                color: isDark ? "#E0E0E0" : "#0B1B0C",
              }}
            >
              PKR {formatPKR(item.currentValue)}
            </Text>
            <View
              style={[
                styles.changeContainer,
                {
                  backgroundColor: isPositiveChange ? "#3FB9501A" : "#E000001A",
                },
              ]}
            >
              <Text
                style={[
                  {
                    color: isDark
                      ? isPositiveChange
                        ? "#3FB950"
                        : "#FF6B6B"
                      : isPositiveChange
                        ? "#3FB950"
                        : "#E00000",
                    fontFamily: "SfRegular",
                    fontWeight: "600",
                    fontSize: 12,
                    lineHeight: 18,
                    // alignItems:"center"
                  },
                ]}
              >
                {/* {isPositiveChange ? "+" : ""} */}
                {( (Math.abs(Chnage) / item.totalCost) * 100).toFixed(2)} %
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderModalContent = () => {
    if (!selectedStock) return null;
    const isPositiveChange = selectedStock.capGainLoss > 0;

    console.log("Selected Stock status", isPositiveChange);

    // const getSortedHoldings = () => {
    //   if (!ClientPorfolio?.holdings) return [];

    //   let holdings = [...ClientPorfolio.holdings];

    //   holdings.sort((a, b) => {
    //     let valA, valB;

    //     if (sortBy === "stock") {
    //       valA = a.security || "";
    //       valB = b.security || "";
    //       return sortOrder === "asc"
    //         ? valA.localeCompare(valB)
    //         : valB.localeCompare(valA);
    //     }

    //     if (sortBy === "price") {
    //       // Assuming you want to sort by currentValue or costPerUnit
    //       // Change field name according to what you actually want
    //       valA = Number(a.currentValue) || 0;
    //       valB = Number(b.currentValue) || 0;
    //       return sortOrder === "asc" ? valA - valB : valB - valA;
    //     }

    //     if (sortBy === "change") {
    //       // percentage change
    //       const parseChange = (item) => {
    //         const gain = Number(item.capGainLoss) || 0;
    //         const cost = Number(item.totalCost) || 1; // avoid /0
    //         return (gain / cost) * 100;
    //       };

    //       valA = parseChange(a);
    //       valB = parseChange(b);
    //       return sortOrder === "asc" ? valA - valB : valB - valA;
    //     }

    //     return 0;
    //   });

    //   return holdings;
    // };

    // // Then in render:
    // const NewSortedHolding = getSortedHoldings();

    return (
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            position: "absolute",
            bottom: 0,
            // height: fullHeight,
            top: screenHeight - fullHeight,
            backgroundColor: isDark ? "#222222" : "#fff",
            paddingHorizontal: isDark ? 24 : 24,
          },
          animatedStyle,
        ]}
      >
        <GestureDetector gesture={panGesture}>
          <View
            style={[
              styles.sheetHandle,
              {
                backgroundColor: isDark ? "#222222" : "#fff",
              },
            ]}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: isDark ? "#000000" : "#D3D3D3",
                borderRadius: 2,
              }}
            />
          </View>
        </GestureDetector>
        <ScrollView style={styles.sheetContent}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={[
                  styles.symbolContainer,
                  {
                    backgroundColor: "#EBEBEB",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.symbolText,
                    {
                      color: "#53BA83",
                    },
                  ]}
                  numberOfLines={1} // ← prevents wrapping to 2 lines
                  adjustsFontSizeToFit // ← iOS only – auto-shrinks text
                  minimumFontScale={0.7}
                >
                  {selectedStock.security}
                </Text>
              </View>
              <View style={{ marginLeft: 14 }}>
                <Text
                  style={{
                    fontSize: 22,
                    lineHeight: 30,
                    fontWeight: "600",
                    fontFamily: "SfRegular",
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                  }}
                >
                  {selectedStock.security}
                </Text>
                {/* <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 21,
                    fontWeight: "400",
                    fontFamily: "SfRegular",
                    color: "#8A8A8A",
                  }}
                >
                  MCB Bank
                </Text> */}
              </View>
            </View>
            <TouchableOpacity onPress={() => setSelectedStock(null)}>
              <Image
                source={require("../../assets/icons/cross_icon.png")}
                style={{ width: 24, height: 24 }}
              />
            </TouchableOpacity>
          </View>
          {/* Gradient View */}
          <LinearGradient
            colors={
              isPositiveChange
                ? ["#53BA830D", "#53BA831A"]
                : ["#FF475726", "#FF47570D"]
            }
            style={{
              padding: 24,
              borderWidth: 1,
              borderColor: !isPositiveChange ? "#FF6B6B40" : "#53BA834D",
              borderRadius: 18,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <View style={{ width: "60%" }}>
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontWeight: "500",
                  fontSize: 11,
                  lineHeight: 16,
                  color: "#8A8A8A",
                }}
              >
                Current Price
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  // textAlign:"center",
                  lineHeight: 42,
                  fontFamily: "SfRegular",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "500",
                    top: 4,
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                  }}
                >
                  PKR
                </Text>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "700",
                    marginLeft: 4,
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.5}
                >
                  {formatPKR(selectedStock.currentValue)}
                  {/* 200000000 */}
                </Text>
              </View>
            </View>
            <View style={{ width: "40%", alignItems: "flex-end" }}>
              {" "}
              <View
                // colors={["#3FB950", "#2FA842"]}
                style={[
                  {
                    // isPositiveChange ? "#3FB950" : "#E00000"
                    backgroundColor: isPositiveChange ? "#2FA842" : "#FB2C36",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 8,
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Text
                  style={[
                    {
                      // color: isPositiveChange ? "#3FB950" : "#E00000",
                      color: "#FFFFFF",
                      fontFamily: "SfRegular",
                      fontWeight: "600",
                      fontSize: 15,
                      lineHeight: 22,
                    },
                  ]}
                >
                  {isPositiveChange ? "+" : ""}
                  {/* {selectedStock?.capGainLoss}/{selectedStock?.totalCost} *100 */}
                  {(
                    (selectedStock?.capGainLoss / selectedStock?.totalCost) *
                    100
                  ).toFixed(2)}
                  %
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={{ marginTop: 24, marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: "SfRegular",
                fontWeight: "600",
                fontSize: 16,
                lineHeight: 24,
                color: isDark ? "#E0E0E0" : "#0B1B0C",
              }}
            >
              Holdings Details
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
              <View
                style={{
                  padding: 17,
                  borderWidth: 1,
                  borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
                  borderRadius: 14,
                  width: "48%",
                  height: 115,
                  backgroundColor: isDark ? "#222222" : "#FFFFFF",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",

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
                      textTransform: "uppercase",
                    }}
                  >
                    Quantity
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
                  {selectedStock.quantity}
                </Text>

                <Text
                  style={{
                    fontFamily: "SfRegular",
                    fontWeight: "400",
                    fontSize: 11,
                    lineHeight: 16,
                    color: "#8A8A8A",
                    marginTop: 12,
                  }}
                >
                  shares
                </Text>
              </View>

              <View
                style={{
                  padding: 17,
                  borderWidth: 1,
                  borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
                  borderRadius: 14,
                  width: "48%",
                  height: 115,
                  backgroundColor: isDark ? "#222222" : "#FFFFFF",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",

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
                      textTransform: "uppercase",
                    }}
                  >
                    Buy Price
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",

                    lineHeight: 30,
                    fontFamily: "SfRegular",
                    marginTop: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      top: 4,
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    PKR
                  </Text>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "600",
                      marginLeft: 4,
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.5}
                  >
                    {selectedStock.costPerUnit}
                  </Text>
                </View>

                <Text
                  style={{
                    fontFamily: "SfRegular",
                    fontWeight: "400",
                    fontSize: 11,
                    lineHeight: 16,
                    color: "#8A8A8A",
                    marginTop: 12,
                  }}
                >
                  per share
                </Text>
              </View>
            </View>

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
                  height: 115,
                  backgroundColor: isDark ? "#222222" : "#FFFFFF",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",

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
                      textTransform: "uppercase",
                    }}
                  >
                    Total Cost
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "column",
                    // alignItems: "center",

                    lineHeight: 30,
                    fontFamily: "SfRegular",
                    marginTop: 12,
                    overflow: "hidden",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      top: 4,
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    PKR
                  </Text>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "600",
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.5}
                  >
                    {/* 20000000
                      {Number("20000000").toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })} */}
                    {/* 20000000000000000000000000000000000 */}
                    {formatPKR(selectedStock?.totalCost)}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  padding: 17,
                  borderWidth: 1,
                  borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
                  borderRadius: 14,
                  width: "48%",
                  height: 115,
                  backgroundColor: isDark ? "#222222" : "#FFFFFF",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
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
                      textTransform: "uppercase",
                    }}
                  >
                    Current Value
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "column",

                    lineHeight: 30,
                    fontFamily: "SfRegular",
                    marginTop: 12,
                    overflow: "hidden",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      top: 4,
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    PKR
                  </Text>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "600",
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.5}
                  >
                    {formatPKR(selectedStock.currentValue)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={{ marginTop: 24, marginBottom: 32 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                alignContent: "center",
                paddingVertical: 16,
                backgroundColor: isDark ? "transparent" : "#fff",
                // borderTopWidth: 1,
                // borderTopColor:
                //   isDark ? "#FFFFFF14" : "#E0E0E0",
              }}
            >
              <TouchableOpacity
                style={{ width: "48%" }}
                onPress={() =>
                  router.push(
                    `/Stockbuy?symbol=${selectedStock.security}&order=Sell&NumberOfShares=${selectedStock.quantity}`,
                  )
                }
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
              <TouchableOpacity
                style={{ width: "48%" }}
                onPress={() =>
                  router.push(
                    `/Stockbuy?symbol=${selectedStock.security}&order=Buy`,
                  )
                }
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
                  Buy More
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
      // </GestureDetector>
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);

    try {
      if (userId) {
        await fetchProfileUser();
        await fetchClientCode();

        if (ClientData?.cliendCode) {
          const portfolioData = await fetchClientPortfolio();
          setClientPorfolio(portfolioData?.detailInformation?.[0] || {});
        }
      }
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [
    userId,
    fetchProfileUser,
    fetchClientCode,
    ClientData?.cliendCode,
    fetchClientPortfolio,
  ]);

  return (
    <>
      {loading ? (
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? "" : "#fff",
            },
          ]}
        >
          <ActivityIndicator
            size="large"
            color="#58BA83"
            style={{ flex: 1, justifyContent: "center" }}
          />
        </View>
      ) : isAccount ? (
        <GestureHandlerRootView
          style={{
            flex: 1,
            backgroundColor: isDark ? "" : "#fff",
          }}
        >
          <ScrollView
            style={[
              styles.scrollView,
              {
                backgroundColor: isDark ? "" : "#fff",
              },
            ]}
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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  justifyContent: "space-between",
                }}
              >
                <TouchableOpacity onPress={() => router.back()}>
                  <Image
                    source={
                      isDark
                        ? require("../../assets/icons/white_back_icon.png")
                        : require("../../assets/icons/back_icon.png")
                    }
                    style={{ width: 8, height: 12 }}
                  />
                </TouchableOpacity>
                {/* <View style={{ flex: 1, alignItems: "center" }}> */}
                <Text
                  style={{
                    fontFamily: "SfRegular",
                    fontWeight: "600",
                    fontSize: 24,
                    color: isDark ? "#FFFFFF" : "#0B1B0C",
                    textAlign: "center",
                    marginLeft: 20,
                  }}
                >
                  My Portfolio
                </Text>
                {/* </View> */}
                <TouchableOpacity onPress={() => router.push("/Notification")}>
                  <Image
                    source={require("../../assets/icons/new_notification.png")}
                    style={{ width: 44, height: 44 }}
                  />
                </TouchableOpacity>
              </View>
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
                    // marginTop: 12,
                  }}
                >
                  <View style={{ width: "65%" }}>
                    <View style={{ flexDirection: "row",justifyContent:"space-between", alignItems: "center" }}>
                    <Text
                      style={{
                        fontFamily: "SfRegular",
                        fontWeight: "500",
                        fontSize: 13,
                        lineHeight: 19,
                        color: "#FFFFFF",
                      }}
                    >
                      Total Holdings Value
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
                          fontSize: 26,
                          lineHeight: 31,
                          color: "#FFFFFF",
                          marginLeft: 2,
                        }}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.5}
                      >
                        {/* 537,215.000 */}
                        {formatPKR(ClientPorfolio?.portfolio?.grandTotal) || 0}
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
                          {/* {ClientPorfolio?.holdings.length} Holdings */}
                          {ClientPorfolio?.holdings?.length || 0} Holdings
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => router.push("/Reports")}>
                        <View
                          style={{
                            borderRadius: 8,
                            marginTop: 12,
                            marginLeft: 10,
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
                              textDecorationLine: "underline",
                            }}
                          >
                            View Trade Logs
                          </Text>
                        </View>
                      </TouchableOpacity>
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

              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginTop: 24,
                }}
                onPress={() => setShowSortMenu(!showSortMenu)}
              >
                <Image
                  source={
                    isDark
                      ? require("../../assets/icons/portfolio_sorting_dark.png")
                      : require("../../assets/sorts_new.png")
                  }
                  style={{ width: 38, height: 38 }}
                />
              </TouchableOpacity>

              <View style={{ marginTop: 12 }}>
                {sortedHoldings?.map((item, index) => (
                  <View key={index} style={{ marginBottom: 16 }}>
                    {renderStockCard(item)}
                  </View>
                ))}
              </View>

              {showSortMenu && (
                <View
                  style={{
                    backgroundColor: "#ECECEC",
                    opacity: 0.8,
                    width: 240,
                    height: 200,
                    position: "absolute",
                    top: 340,
                    right: 40,
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
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
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
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
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
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
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
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
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
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
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
                        Return (Low to High)
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
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
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
                            sortBy === "change" && sortOrder === "desc"
                              ? 0
                              : 16,
                        }}
                      >
                        Return (High to Low)
                      </Text>
                    </View>
                    <Image
                      source={require("../../assets/edit_icon_new.png")}
                      style={{ width: 9, height: 9, marginRight: 4 }}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Backdrop */}
            </View>
          </ScrollView>
          {selectedStock && (
            <TouchableOpacity
              //   style={styles.backdrop}
              activeOpacity={1}
              onPress={() => setSelectedStock(null)}
            />
          )}
          {/* Gesture Modal (Bottom Sheet) */}
          {renderModalContent()}
        </GestureHandlerRootView>
      ) : (
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
                <Image
                  source={
                    isDark
                      ? require("../../assets/icons/white_back_icon.png")
                      : require("../../assets/icons/back_icon.png")
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
                    color: isDark ? "#FFFFFF" : "#0B1B0C",
                    textAlign: "center",
                  }}
                >
                  My Portfolio
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/Notification")}>
                <Image
                  source={require("../../assets/icons/new_notification.png")}
                  style={{ width: 44, height: 44 }}
                />
              </TouchableOpacity>
            </View>

            <LinearGradient
              colors={
                colorScheme !== "dark"
                  ? ["#F8FAFB", "#FFFFFF"]
                  : ["transparent", "transparent"]
              }
              // colors={["#1A1A1A", "#1A1A1A"]}
              style={{
                borderRadius: 24,
                alignItems: "center",
                textAlign: "center",
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
                borderWidth: 1,
                borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
                padding: 33,
              }}
            >
              <Image
                source={require("../../assets/icons/no_account_portfolio.png")}
                style={{ width: 200, height: 160 }}
              />
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontWeight: "700",
                  fontSize: 24,
                  lineHeight: 28,
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                  marginTop: 28,
                  textAlign: "center",
                }}
              >
                Your Portfolio is Empty
              </Text>
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontWeight: "400",
                  fontSize: 15,
                  lineHeight: 22,
                  color: isDark ? "#8A8A8A" : "#5A5A5A",
                  marginTop: 10,
                  textAlign: "center",
                }}
              >
                Start your investment journey today and watch your wealth grow!
              </Text>
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontWeight: "500",
                  fontSize: 14,
                  lineHeight: 21,
                  color: "#53BA83",
                  marginTop: 10,
                  textAlign: "center",
                }}
              >
                Build your financial future
              </Text>

              {/* <View
                style={{
                  width: "100%",
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
                    borderColor: "#F0F0F0",
                    borderRadius: 16,
                    width: "48%",
                    height: 126,
                    backgroundColor: "#FFFFFF",
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    elevation: 5,
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "500",
                      fontSize: 13,
                      lineHeight: 19,
                      color: "#8A8A8A",
                      marginTop: 12,
                      textAlign: "center",
                    }}
                  >
                    Holdings
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "700",
                      fontSize: 20,
                      lineHeight: 30,
                      color: "#0B1B0C",
                      textAlign: "center",
                    }}
                  >
                    0
                  </Text>
                </View>

                <View
                  style={{
                    padding: 17,
                    borderWidth: 1,
                    borderColor: "#F0F0F0",
                    borderRadius: 16,
                    width: "48%",
                    height: 126,
                    backgroundColor: "#FFFFFF",
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    elevation: 5,
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "500",
                      fontSize: 13,
                      lineHeight: 19,
                      color: "#8A8A8A",
                      marginTop: 12,
                      textAlign: "center",
                    }}
                  >
                    Total Value
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "700",
                      fontSize: 20,
                      lineHeight: 30,
                      color: "#0B1B0C",
                      textAlign: "center",
                    }}
                  >
                    PKR 0
                  </Text>
                </View>
              </View> */}
              {profileuser?.status === "need_credentials" ? (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    paddingVertical: 18,
                    borderRadius: 12,
                    backgroundColor: "#53BA83",
                    marginTop: 28,
                    width: "100%",
                  }}
                  onPress={() => router.push("/ClientForm")}
                >
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "600",
                      fontSize: 14,
                      lineHeight: 21,
                      color: isDark ? "#1A1A1A" : "#FFFFFF",
                    }}
                  >
                    Need Credentials
                  </Text>{" "}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    paddingVertical: 18,
                    borderRadius: 12,
                    backgroundColor: "#53BA83",
                    marginTop: 28,
                    width: "100%",
                  }}
                  onPress={() => router.push("/openAccount")}
                >
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "600",
                      fontSize: 14,
                      lineHeight: 21,
                      color: isDark ? "#1A1A1A" : "#FFFFFF",
                    }}
                  >
                    Open Account
                  </Text>{" "}
                </TouchableOpacity>
              )}
            </LinearGradient>

            <View style={{ marginTop: 24 }}>
              <LinearGradient
                colors={
                  isDark
                    ? ["#726AFF0D", "#5B54E80D"]
                    : ["#726AFF0D", "#5B54E80D"]
                }
                style={{
                  padding: 21,
                  borderWidth: 1,
                  borderColor: "#726AFF1A",
                  borderRadius: 16,
                  flexDirection: "row",
                }}
              >
                <Image
                  source={require("../../assets/icons/portfolio_no_account_1.png")}
                  style={{ width: 44, height: 44 }}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "600",
                      fontSize: 16,
                      lineHeight: 24,
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    Discover Top Stocks
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "400",
                      fontSize: 14,
                      lineHeight: 19,
                      color: isDark ? "#8A8A8A" : "#5A5A5A",
                      marginTop: 3,
                    }}
                  >
                    Explore trending stocks and start {"\n"}building your
                    portfolio
                  </Text>
                </View>
              </LinearGradient>

              <LinearGradient
                colors={["#53BA830D", "#3FB9500D"]}
                style={{
                  padding: 21,
                  borderWidth: 1,
                  borderColor: "#53BA831A",
                  borderRadius: 16,
                  flexDirection: "row",
                  marginTop: 12,
                }}
              >
                <Image
                  source={require("../../assets/icons/portfolio_no_account_2.png")}
                  style={{ width: 44, height: 44 }}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "600",
                      fontSize: 16,
                      lineHeight: 24,
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    Start with Small Amounts
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "400",
                      fontSize: 14,
                      lineHeight: 19,
                      color: isDark ? "#8A8A8A" : "#5A5A5A",
                      marginTop: 3,
                    }}
                  >
                    Begin investing with as little as {"\n"}you want - no
                    minimums!
                  </Text>
                </View>
              </LinearGradient>

              <LinearGradient
                colors={["#FFD54F0D", "#FFA7260D"]}
                style={{
                  padding: 21,
                  borderWidth: 1,
                  borderColor: "#FFD54F1A",
                  borderRadius: 16,
                  flexDirection: "row",
                  marginTop: 12,
                }}
              >
                <Image
                  source={require("../../assets/icons/portfolio_no_account_3.png")}
                  style={{ width: 44, height: 44 }}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "600",
                      fontSize: 16,
                      lineHeight: 24,
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    Track Your Performance
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "400",
                      fontSize: 14,
                      lineHeight: 19,
                      color: isDark ? "#8A8A8A" : "#5A5A5A",
                      marginTop: 3,
                    }}
                  >
                    Monitor your investments with real-{"\n"}time updates and
                    insights
                  </Text>
                </View>
              </LinearGradient>
            </View>
          </View>
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#fff",
    paddingTop: 30,
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  scrollView: {
    flex: 1,
    // backgroundColor: "#fff",
  },
  stockCard: {
    paddingVertical: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  symbolContainer: {
    height: 50,
    width: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  symbolText: {
    fontFamily: "SfRegular",
    fontWeight: "700",
    fontSize: 14,
  },
  sharesContainer: {
    flex: 1,
    marginLeft: 12,
  },

  changeContainer: {
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 6,
  },

  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    // borderTopLeftRadius: 20,
    // borderTopRightRadius: 20,
    // borderRadius: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: -2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 4,
    // elevation: 5,
  },
  sheetHandle: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetContent: {
    flex: 1,
    paddingVertical: 20,
    paddingBottom: 200,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  // css-view-g5y9jx:{
  //   backgroundColor: #ffffff !important;
  // }
});

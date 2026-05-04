import React, { useState, useCallback, useEffect } from "react"; // Add useEffect
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
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native"; // Import useFocusEffect
import { BaseUrl } from "../constants/baseUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StockLogo } from "../components/StockLogo";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useTheme } from "../hooks/ThemeContext";

const { width: screenWidth } = Dimensions.get("window");
import { supabase } from "../supabaseConfig";

export default function Search() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [TrendingStocksData, setTrendingStocksData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [watchlistSymbols, setWatchlistSymbols] = useState(new Set());

  const router = useRouter();

  // Clear cache when app goes to background (simulates session storage clear on app close)
  // useEffect(() => {
  //   const subscription = AppState.addEventListener('change', nextAppState => {
  //     if (nextAppState === 'background') {
  //       AsyncStorage.removeItem('cachedStocks');
  //       AsyncStorage.removeItem('cachedTrendingStocks');
  //     }
  //   });

  //   return () => subscription?.remove();
  // }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      // if (nextAppState === "background") {
      //   AsyncStorage.removeItem("cachedStocks");
      //   AsyncStorage.removeItem("cachedTrendingStocks");
      // }
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log(user);
      setUserId(user?.id);
    };
    fetchUser();
  }, []);

  // Define fetch functions inside useCallback to prevent re-creation
  const fetchStocks = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${BaseUrl}/api/psxApi/search/all-stocks/`);
      const data = await response.json();
      const stockData = Array.isArray(data.stocks) ? data.stocks : [];
      setStocks(stockData);
      setFilteredStocks(stockData); // Initially, show all stocks
      // Cache the data
      // await AsyncStorage.setItem("cachedStocks", JSON.stringify(stockData));
    } catch (err) {
      setError("Failed to fetch stocks. Please try again later.");
      console.error("Fetch stocks error:", err);
    }
  }, []);

  // const fetchTendingStocks = useCallback(async () => {
  //   try {
  //     setError(null);
  //     const response = await fetch(
  //       `${BaseUrl}/api/stocks/stock/top-volume-stocks/`
  //     );
  //     const data = await response.json();
  //     setTrendingStocksData(data);
  //     // Cache the data
  //     await AsyncStorage.setItem("cachedTrendingStocks", JSON.stringify(data));
  //   } catch (err) {
  //     // setError("Failed to fetch trending stocks. Please try again later.");
  //     console.error("Fetch trending stocks error:", err);
  //   }
  // }, []);

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
        }
      } catch (err) {
        console.error("Add to watchlist error:", err);
        alert("Failed to add to watchlist");
      }
    },
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        setLoading(true);
        try {
          if (isActive) {
            const cachedStocksStr = await AsyncStorage.getItem("cachedStocks");
            if (cachedStocksStr) {
              const cachedStocks = JSON.parse(cachedStocksStr);
              setStocks(cachedStocks);
              setFilteredStocks(cachedStocks);
            } else {
              await fetchStocks();
            }

            // Check for cached trending stocks
            const cachedTrendingStr = await AsyncStorage.getItem(
              "cachedTrendingStocks",
            );
            if (cachedTrendingStr) {
              const cachedTrending = JSON.parse(cachedTrendingStr);
              setTrendingStocksData(cachedTrending);
            } else {
              // await fetchTendingStocks();
            }

            // Fetch watchlist if user is logged in
            if (userId) {
              await fetchWatchlist();
            }
          }
        } catch (err) {
          console.error("Error loading cached data:", err);
          setError("Failed to load data. Please try again.");
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      loadData();

      return () => {
        isActive = false; // Cleanup to prevent state updates on unmounted component
      };
    }, [fetchStocks, fetchWatchlist, userId]), // Dependencies
  );

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredStocks(stocks);
    } else {
      const filtered = stocks.filter(
        (stock) =>
          stock.name?.toLowerCase().includes(query.toLowerCase()) ||
          stock.symbol?.toLowerCase().includes(query.toLowerCase()),
      );
      setFilteredStocks(filtered);
    }
  };

  const storeStockInHistory = async (symbol) => {
    try {
      // Retrieve existing history
      const storedHistory = await AsyncStorage.getItem("stockHistory");
      let history = storedHistory ? JSON.parse(storedHistory) : [];

      // Avoid duplicates and limit to 10 recent stocks
      if (!history.includes(symbol)) {
        history = [symbol, ...history].slice(0, 3); // Add new symbol at the start, limit to 10
        await AsyncStorage.setItem("stockHistory", JSON.stringify(history));
      }
    } catch (err) {
      console.error("Error storing stock in AsyncStorage:", err);
    }
  };

  const handleStockPress = (symbol) => {
    try {
      storeStockInHistory(symbol);
      router.push(`/StockDetail?symbol=${symbol}&previousPage=Search`);
    } catch (err) {
      console.error("Navigation error:", err);
      // setError("Failed to navigate to stock details.");
    }
  };

  const renderRecentVisited = ({ item }) => (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 12,
        paddingTop: 12,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? "#FFFFFF14" : "#ECECEC",
      }}
      onPress={() => handleStockPress(item.symbol)}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {/* <Image
          source={require("../assets/recentVisited.png")}
          style={{ width: 32, height: 32, marginRight: 8 }}
        /> */}
        <View style={{ marginRight: 8 }}>
          {" "}
          <StockLogo symbol={item.symbol} size={32} />
        </View>
        <View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: isDark ? "#E0E0E0" : "#000",
              fontFamily: "OutfitBold",
            }}
          >
            {item.symbol}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "400",
              color: "#6E6E6E",
              fontFamily: "OutfitRegular",
            }}
          >
            {item.name}
          </Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: "column",
          alignItems: "flex-end",
          marginLeft: 32,
        }}
      >
        <TouchableOpacity onPress={() => addToWatchlist(item.symbol)}>
          <Image
            source={
              watchlistSymbols.has(item.symbol)
                ? ""
                : isDark
                  ? require("../assets/icons/add_dark.png")
                  : require("../assets/plus_new_design.png")
            }
            style={{ width: 32, height: 32, marginRight: 8 }}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderTrendingStocks = ({ item }) => (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        width: 80,
      }}
      onPress={() => handleStockPress(item.name)}
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
            width: 60,
            height: 60,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: item.bgColor || "#ECECEC", // Fallback color
            paddingTop: 12,
            paddingBottom: 12,
            borderRadius: 50,
          }}
        >
          <Image
            source={item.src || require("../assets/google.png")}
            style={{ width: 32, height: 32 }}
          />
        </View>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: "#000",
            marginTop: 4,
            fontFamily: "OutfitMedium",
          }}
        >
          {item.name}
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: item.close_price > 0 ? "#3FB950" : "#E00000",
            marginTop: 4,
            fontFamily: "OutfitSemiBold",
          }}
        >
          {item.close_price}
        </Text>
      </View>
    </TouchableOpacity>
  );

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
        <View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginHorizontal: 24,
            }}
          >
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
            <TextInput
              style={[
                styles.searchBar,
                {
                  backgroundColor: isDark ? "#FFFFFF14" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: isDark ? "#FFFFFF14" : "#ECECEC",
                  color: isDark ? "#929292" : "#8A8A8A",
                },
              ]}
              placeholder="Search by stock name"
              placeholderTextColor={isDark ? "#929292" : "#8A8A8A"}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          {loading ? (
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
          ) : error ? (
            <>
              <View
                style={{
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: 10,
                  fontSize: 16,
                  paddingHorizontal: 20,
                }}
              >
                <Image
                  source={
                    isDark
                      ? require("../assets/icons/api_error.png")
                      : require("../assets/icons/api_error.png")
                  }
                  style={{ width: 217, height: 217 }}
                />
                <Text
                  style={{
                    fontFamily: "SfRegular",
                    fontWeight: "700",
                    fontSize: 24,
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                  }}
                >
                  Something Went Wrong
                </Text>
                <Text
                  style={{
                    marginTop: 18,
                    fontFamily: "SfRegular",
                    fontWeight: "400",
                    fontSize: 16,
                    color: isDark ? "#8A8A8A" : "#444B44",
                    textAlign: "center",
                  }}
                >
                  We’re working on fixing the issue. Please try again in a
                  moment.
                  {/* {responseData?.desc} */}
                </Text>

                <TouchableOpacity
                  style={{
                    borderWidth: 2,
                    borderColor: "#53BA83",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    paddingVertical: 18,
                    borderRadius: 14,
                    backgroundColor: isDark ? "#53BA83" : "#53BA83",
                    marginTop: 16,
                    width: "100%",
                  }}
                  onPress={() => router.back()}
                >
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "600",
                      fontSize: 15,
                      lineHeight: 22,
                      color: "#FFFFFF",
                    }}
                  >
                    Go Back
                  </Text>{" "}
                </TouchableOpacity>
              </View>
              {/* //{" "}
              <Text
                style={{ textAlign: "center", marginTop: 20, color: "red" }}
              >
                // {error}
                //{" "}
              </Text> */}
            </>
          ) : (
            <>
              {/* <Text
                style={{
                  backgroundColor: isDark ? "" : "#FAFAFA",
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  fontFamily: "OutfitMedium",
                  color: isDark ? "#E0E0E0" : "",
                }}
              >
                Stocks
              </Text> */}
              <FlatList
                data={filteredStocks}
                renderItem={renderRecentVisited}
                keyExtractor={(item) => item.symbol}
                numColumns={1}
                contentContainerStyle={styles.verticalList}
              />

              {/* <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 24,
                  marginBottom: 16,
                  paddingHorizontal: 24,
                }}
              >
                <Text style={{ fontWeight: "600", fontSize: 16 }}>
                  More Trending Stocks
                </Text>
              </View>
              <FlatList
                data={TrendingStocksData.top_10_volume}
                renderItem={renderTrendingStocks}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              /> */}
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#fff",
    paddingTop: 30,
  },
  scrollView: {
    flex: 1,
    // backgroundColor: "#fff",
  },
  searchBar: {
    marginTop: 10,
    height: 36,
    width: "95%",

    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,

    // marginHorizontal: 24,
    marginLeft: 10,
    fontFamily: "SfRegular",
  },
  verticalList: {
    paddingBottom: 10,
    paddingHorizontal: 24,
  },
  horizontalList: {
    paddingVertical: 5,
    paddingHorizontal: 24,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // backgroundColor: "#fff",
    minHeight: "100vh",
  },
});

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
import { useTheme } from "../hooks/ThemeContext";

const { width: screenWidth } = Dimensions.get("window");
import { supabase } from "../supabaseConfig";
import { setQuarter } from "date-fns";
import { StockLogo } from "../components/StockLogo";
import Toast from "react-native-toast-message";
import { useToastConfig } from "../Services/toastConfig";

export default function WatchListSearch({ setValue, colorScheme }) {
  const toastConfig = useToastConfig();
  const { isDark } = useTheme();

  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [TrendingStocksData, setTrendingStocksData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [watchlistSymbols, setWatchlistSymbols] = useState(new Set());
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState) => {},
    );

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
      await AsyncStorage.setItem("cachedStocks", JSON.stringify(stockData));
    } catch (err) {
      setError("Failed to fetch stocks. Please try again later.");
      console.error("Fetch stocks error:", err);
    }
  }, []);

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
          setValue(false);
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

  const renderRecentVisited = ({ item }) => (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 12,
        paddingTop: 12,
      }}
      //   onPress={() => handleStockPress(item.symbol)}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => addToWatchlist(item.symbol)}>
          <Image
            source={
              watchlistSymbols.has(item.symbol)
                ? ""
                : require("../assets/add_icon.png")
            }
            style={{ width: 20, height: 20, marginRight: 8 }}
          />
        </TouchableOpacity>
        {/* <Image
          source={require("../assets/test_icon.png")}
          style={{ width: 32, height: 32, marginRight: 8, borderRadius: 40 }}
        /> */}
        <View style={{ marginRight: 8 }}>
          <StockLogo symbol={item.symbol} size={32} />
        </View>
        <View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: isDark ? "#E0E0E0" : "#0B1B0C",
              //   fontFamily: "OutfitBold",
            }}
          >
            {item.symbol}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: "#8A8A8A",
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
      ></View>
    </TouchableOpacity>
  );

  const handleQueryClear = () => {
    setQuarter("");
    setValue(false);
  };

  return (
    <>
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
            <View style={styles.searchContainer}>
              <TextInput
                style={[
                  styles.searchBar,
                  {
                    backgroundColor:
                      isDark ? "#FFFFFF14" : "#FFFFFF",
                    borderWidth: 1,
                    borderColor:
                      isDark ? "#FFFFFF1A" : "#ECECEC",
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                  },
                ]}
                placeholder="Search by stock name"
                placeholderTextColor="#8A8A8A"
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearIconContainer}
                  onPress={handleQueryClear} // Clears the search query
                >
                  <Text style={styles.clearIcon}>×</Text>{" "}
                  {/* Or use <Image source={require('../../assets/close.png')} style={styles.clearIconImage} /> */}
                </TouchableOpacity>
              )}
            </View>

            <View
              style={{
                paddingHorizontal: 24,
                paddingVertical: 10,
                marginTop: 24,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {" "}
                <View>
                  <Text style={styles.textdesign}>Stock</Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginRight: 20,
                  }}
                >
                  <Text style={styles.textdesign}>Price/</Text>
                  <Text style={styles.textdesign}>Change</Text>
                </View>
              </View>
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
                    backgroundColor:
                      isDark ? "#53BA83" : "#53BA83",
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

                {/* {error} */}
              </View>
            ) : (
              <>
                <FlatList
                  data={filteredStocks}
                  renderItem={renderRecentVisited}
                  keyExtractor={(item) => item.symbol}
                  numColumns={1}
                  contentContainerStyle={styles.verticalList}
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>
      <Toast config={toastConfig} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
    // backgroundColor: "#fff",
  },
  searchBar: {
    height: 36,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    marginHorizontal: 24,
    fontFamily: "OutfitLight",
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
  searchContainer: {
    position: "relative", // Allows absolute positioning of the icon
  },
  clearIconContainer: {
    position: "absolute",
    right: 30, // Adjust padding to align with input's right padding
    top: 10,
    transform: [{ translateY: -9 }], // Centers vertically (half of icon height)
    padding: 4, // Touch area
  },
  clearIcon: {
    fontSize: 18,
    color: "#8A8A8A", // Matches placeholder color; change to '#000' for bolder
    fontWeight: "bold",
  },
  textdesign: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "OutfitMedium",
    color: "#8A8A8A",
  },
});

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../supabaseConfig";
import StompService from "../Services/webSocketConnection";
import { useTheme } from "../hooks/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { useToastConfig } from "../Services/toastConfig";

const { width } = Dimensions.get("window");

const REPORT_TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function Reports() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const router = useRouter();
  const toastConfig = useToastConfig();

  const [activeTab, setActiveTab] = useState("all");
  const [userId, setUserId] = useState(null);
  const [clientCode, setClientCode] = useState(null);
  const [clientPassword, setClientPassword] = useState(null);
  const [ApiError, setApiError] = useState(true);

  // Data states
  const [allTrades, setAllTrades] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [completedTrades, setCompletedTrades] = useState([]);
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [responseData, setresponseData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const formatPKR = (num) => {
    if (num == null || isNaN(num)) return ""; // or "0" or whatever you prefer

    const number = Number(num);
    const fixed = number.toFixed(2);

    const [integer, decimal] = fixed.split(".");

    const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    if (decimal === "00") {
      return formattedInteger;
    }

    return formattedInteger + "." + decimal;
  };

  const formatLargePKR = (num) => {
    if (num == null || isNaN(num)) return "—";

    const n = Number(num);

    if (n >= 1_000_000_000)
      return (n / 1_000_000_000).toFixed(2).replace(/\.00$/, "") + "B";
    if (n >= 1_000_000)
      return (n / 1_000_000).toFixed(2).replace(/\.00$/, "") + "M";
    if (n >= 10_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";

    // Small numbers - normal formatting
    const fixed = n.toFixed(2);
    const [int, dec] = fixed.split(".");
    const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return dec === "00" ? formatted : formatted + "." + dec;
  };

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
  // Fetch user & client code once
  const fetchUserAndClientCode = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data: clientData } = await supabase
        .from("ClientCode")
        .select("*")
        .eq("userId", user.id)
        .maybeSingle();

      if (clientData?.cliendCode) {
        setClientCode(clientData?.cliendCode);
        setClientPassword(clientData?.Password);
      }
    } catch (err) {
      console.error("Error fetching user/client:", err);
    }
  }, []);

  useEffect(() => {
    fetchUserAndClientCode();
  }, [fetchUserAndClientCode]);

  const fetchAllReports = useCallback(async () => {
    if (!clientCode) return;

    setLoading(true);
    setError(null);

    try {
      const [tradesRes, pendingRes, cancelledRes] = await Promise.all([
        fetch("https://trade.iel.net.pk:1219/iel/tradesList", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientCode }),
        }).then((r) => r.json()),

        fetch("https://trade.iel.net.pk:1219/iel/pendingOrders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientCode }),
        }).then((r) => r.json()),

        fetch("https://trade.iel.net.pk:1219/iel/cancelledOrders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientCode }),
        }).then((r) => r.json()),
      ]);

      let allItems = [];

      if (tradesRes.responseCode === "200") {
        const trades = tradesRes.detailInformation || [];
        setCompletedTrades(trades);
        allItems = [...allItems, ...trades];
      }

      if (pendingRes.responseCode === "200") {
        const pending = pendingRes.detailInformation || [];
        setPendingOrders(pending);
        allItems = [...allItems, ...pending];
      }

      if (cancelledRes.responseCode === "200") {
        const cancelled = cancelledRes.detailInformation || [];
        setCancelledOrders(cancelled);
        allItems = [...allItems, ...cancelled];
      }

      setAllTrades(allItems);
    } catch (err) {
      console.error("Fetch reports error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientCode]);

  useEffect(() => {
    if (clientCode) {
      fetchAllReports();
    }
  }, [clientCode, fetchAllReports]);

  // Get current data & count based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case "all":
        return allTrades;
      case "pending":
        return pendingOrders;
      case "completed":
        return completedTrades;
      case "cancelled":
        return cancelledOrders;
      default:
        return [];
    }
  };

  const getTabLabelWithCount = (tab) => {
    const countMap = {
      all: allTrades.length,
      pending: pendingOrders.length,
      completed: completedTrades.length,
      cancelled: cancelledOrders.length,
    };
    return `${tab.label} (${countMap[tab.id] || 0})`;
  };

  // const currentData = getCurrentData();

  const currentData = useMemo(() => {
    const data = getCurrentData();

    if (!searchQuery.trim()) {
      return data;
    }

    const query = searchQuery.toLowerCase().trim();

    return data.filter((item) => {
      const symbol = (item?.symbol || "").toLowerCase();
      return symbol.includes(query);
    });
  }, [getCurrentData, searchQuery]);

  useEffect(() => {
    setSearchQuery("");
  }, [activeTab]);

  const FetchNotification = async () => {
    try {
      const OrderStr = await AsyncStorage.getItem("order_notification");
      return OrderStr ? JSON.parse(OrderStr) : null;
    } catch (err) {
      console.log("Notification parse error:", err);
      return null;
    }
  };

  const ConnectWebSocket = async (item) => {
    setRefreshing(true);
    console.log(item);
    const TextPassword = byteaToString(clientPassword);
    await StompService.connect(clientCode, TextPassword);

    const deleteOrderPayload = {
      actionType: "cancelorder",
      clientCode: item?.clientCode,
      orderNo: item?.orderNumber,
      orderType: item?.orderNature,
      side: item?.buyOrCell,
      symbol: item?.symbol,
      userId: item?.clientCode,
      volume: item?.volume,
      marketType: item?.marketType,
    };

    await StompService.placeNewOrder(deleteOrderPayload);
    // setRefreshing(false);

    // Remove from pending
    setPendingOrders((prev) =>
      prev.filter((order) => order.orderNumber !== item.orderNumber),
    );

    // Add to cancelled
    const cancelledItem = {
      ...item,
      orderStatus: "CNL",
    };

    setCancelledOrders((prev) => [cancelledItem, ...prev]);

    // Update allTrades
    setAllTrades((prev) =>
      prev.map((order) =>
        order.orderNumber === item.orderNumber
          ? { ...order, orderStatus: "CNL" }
          : order,
      ),
    );

    // const getLatestNotification = async (retries = 5) => {
    //   for (let i = 0; i < retries; i++) {
    //     const data = await FetchNotification();

    //     if (data?.message) {
    //       return data;
    //     }

    //     // wait 300ms before retry
    //     await new Promise((res) => setTimeout(res, 300));
    //   }
    //   return null;
    // };

    // const notification = await getLatestNotification();

    // if (notification?.message) {
    //   setModalMessage(notification.message);
    //   setModalVisible(true);
    // }

    // setTimeout(() => setModalVisible(true), 800);

    const handleOrderNotify = (data) => {
      console.log("LIVE NOTIFICATION:", data);

      if (data?.status === "ACKNOWLEDGED") {
        Toast.show({
          type: "error",
          text1: "Order",
          text2: "Pending Order Cancelled",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Order",
          text2: "Cancellation Rejected",
        });
      }
    };

    StompService.onOrderNotify(handleOrderNotify);

    // await fetchAllReports();
    setTimeout(() => fetchAllReports(), 800);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllReports();
  }, [fetchAllReports]);

  return (
    <>
      <ScrollView
        style={[
          styles.scrollView,
          { backgroundColor: isDark ? "#000" : "#fff" },
        ]}
        accessibilityElementsHidden={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View
          style={[
            styles.container,
            { backgroundColor: isDark ? "#000" : "#fff" },
          ]}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? "#FFFFFF1A" : "#E8E8E8",
              paddingBottom: 20,
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
            <Text
              style={{
                fontFamily: "SfRegular",
                fontWeight: "600",
                fontSize: 24,
                color: isDark ? "#FFFFFF" : "#0B1B0C",
                textAlign: "center",
                marginLeft: 15,
              }}
            >
              Trade Logs
            </Text>
            <View style={{ width: 8 }} />
          </View>

          {/* Search & Report Icon */}
          {/* <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 20,
          }}
        >
        

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
            // value={searchQuery}

            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View> */}

          {/* Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {REPORT_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.7}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tabItem,
                  activeTab === tab.id && styles.tabItemActive,
                  {
                    borderColor:
                      activeTab === tab.id
                        ? "#53BA83"
                        : isDark
                          ? "#FFFFFF14"
                          : "#E8E8E8",
                    backgroundColor:
                      activeTab === tab.id
                        ? "#53BA83"
                        : isDark
                          ? "#1A1A1A"
                          : "#FFFFFF",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === tab.id
                          ? "#1A1A1A"
                          : isDark
                            ? "#8A8A8A"
                            : "#666666",
                    },
                  ]}
                >
                  {getTabLabelWithCount(tab)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Content */}
          <View style={{ paddingBottom: 60 }}>
            {loading ? (
              <ActivityIndicator
                size="large"
                color="#53BA83"
                style={{ marginTop: 60 }}
              />
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
                  {/* We’re working on fixing the issue. Please try again in a moment. */}
                  {responseData?.desc}
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

                {/* {error} */}
              </View>
            ) : currentData.length === 0 ? (
              <Text
                style={{
                  color: isDark ? "#8A8A8A" : "#666666",
                  textAlign: "center",
                  marginTop: 40,
                  fontSize: 16,
                  fontFamily: "SfRegular",
                }}
              >
                No orders found in this category
              </Text>
            ) : (
              currentData.map((item, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: isDark ? "#222222" : "#FFFFFF",
                    borderWidth: 1,
                    borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
                    padding: 20,
                    marginTop: 20,
                    borderRadius: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text
                        style={{
                          color: isDark ? "#E0E0E0" : "#0B1B0C",
                          fontFamily: "SfRegular",
                          fontWeight: "600",
                          fontSize: 17,
                        }}
                      >
                        {item?.symbol || "N/A"}
                      </Text>

                      {item?.buyOrCell === "Sell" ? (
                        <LinearGradient
                          colors={["#FF6B6B1A", "#FF6B6B1A"]}
                          style={{
                            marginLeft: 10,
                            borderWidth: 1,
                            borderColor: "#FF6B6B4D",
                            paddingHorizontal: 11,
                            paddingVertical: 4,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: "#FF6B6B",
                              fontSize: 11,
                              fontFamily: "SfRegular",
                              fontWeight: "600",
                            }}
                          >
                            SELL
                          </Text>
                        </LinearGradient>
                      ) : (
                        <LinearGradient
                          colors={["#53BA8333", "#4AAD781A"]}
                          style={{
                            marginLeft: 10,
                            borderWidth: 1,
                            borderColor: "#53BA834D",
                            paddingHorizontal: 11,
                            paddingVertical: 4,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: "#53BA83",
                              fontSize: 11,
                              fontFamily: "SfRegular",
                              fontWeight: "600",
                            }}
                          >
                            BUY
                          </Text>
                        </LinearGradient>
                      )}
                    </View>

                    <LinearGradient
                      colors={
                        item?.executedVolume == 0 && item?.orderStatus === "VLD"
                          ? ["#FFA50033", "#FFA5001A"]
                          : item?.orderStatus === "CNL"
                            ? ["#FF6B6B1A", "#FF6B6B1A"]
                            : ["#3FB95033", "#3FB9501A"]
                      }
                      style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor:
                          item?.executedVolume == 0 &&
                          item?.orderStatus === "VLD"
                            ? "#FFA5004D"
                            : item?.orderStatus === "CNL"
                              ? "#FF6B6B4D"
                              : "#3FB9504D",
                      }}
                    >
                      <Image
                        source={
                          item?.executedVolume == 0 &&
                          item?.orderStatus === "VLD"
                            ? require("../assets/icons/pending_icon.png")
                            : item?.orderStatus === "CNL"
                              ? require("../assets/icons/cancel_icon.png")
                              : require("../assets/icons/competed_icon.png")
                        }
                        style={{ width: 12, height: 12, marginRight: 4 }}
                      />
                      <Text
                        style={{
                          color:
                            item?.executedVolume == 0 &&
                            item?.orderStatus === "VLD"
                              ? "#FFA500"
                              : item?.orderStatus === "CNL"
                                ? "#FF6B6B"
                                : "#3FB950",
                          fontWeight: "600",
                          fontSize: 12,
                          fontFamily: "SfRegular",
                        }}
                      >
                        {item?.executedVolume == 0 &&
                        item?.orderStatus === "VLD"
                          ? "Pending"
                          : item?.orderStatus === "CNL"
                            ? "Cancelled"
                            : "Completed"}
                      </Text>
                    </LinearGradient>
                  </View>

                  {/* Details */}
                  <View
                    style={{
                      marginVertical: 16,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? "#FFFFFF14" : "#E8E8E8",
                      paddingBottom: 16,
                    }}
                  >
                    <View>
                      <Text style={styles.detailLabel}>Quantity</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          {
                            color: isDark ? "#E0E0E0" : "#0B1B0C",
                          },
                        ]}
                      >
                        {formatPKR(item?.orderVolume || item?.volume) || "—"}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>Price</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          {
                            color: isDark ? "#E0E0E0" : "#0B1B0C",
                          },
                        ]}
                      >
                        {item?.orderNature === "140"
                          ? item?.triggerPrice ||
                            item?.rate ||
                            item?.rateLimit ||
                            "—"
                          : item?.rate || item?.rateLimit || "—"}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>Total</Text>
                      <Text style={[styles.detailValue, { color: "#53BA83" }]}>
                        {(() => {
                          const volume = Number(
                            item?.orderVolume || item?.volume || 0,
                          );
                          const rate =
                            item?.orderNature === "140"
                              ? Number(
                                  item?.triggerPrice ||
                                    item?.rate ||
                                    item?.rateLimit,
                                )
                              : Number(item?.rate || item?.rateLimit || 0);

                          console.log(
                            `Item ${item?.symbol} → Volume: ${volume}, Rate: ${rate}`,
                          ); // ← Real debug in console

                          if (volume > 0 && rate > 0) {
                            return formatLargePKR(volume * rate);
                          }
                          return "—";
                        })()}
                      </Text>
                    </View>
                  </View>

                  {/* Footer */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Image
                        source={require("../assets/icons/report_calender.png")}
                        style={{ width: 12, height: 12 }}
                      />
                      <Text style={styles.dateText}>
                        {/* {item?.tradeDate || item?.orderDate || "—"} */}
                        {item?.tradeDate ||
                        item?.orderDate ||
                        item?.orderDateTime
                          ? new Date(
                              item?.tradeDate ||
                                item?.orderDate ||
                                item?.orderDateTime,
                            )
                              .toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                              .replace(/\//g, "/") // already in DD/MM/YYYY
                          : "—"}
                      </Text>
                    </View>

                    <View
                      style={{
                        backgroundColor: isDark ? "#333333" : "#F0F0F0",
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={styles.orderTypeText}>
                        {item?.orderNature === "140"
                          ? "Limit"
                          : item?.orderNature === "141"
                            ? "Stop Loss"
                            : "Market"}
                      </Text>
                    </View>
                  </View>
                  {item?.executedVolume == 0 && item?.orderStatus === "VLD" && (
                    <TouchableOpacity
                      style={{
                        width: "100%",
                        borderWidth: 2,
                        borderColor: "#FF6B6B",
                        marginTop: 14,
                        borderRadius: 10,
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        height: 44,
                      }}
                      onPress={() => ConnectWebSocket(item)}
                    >
                      <Image
                        source={require("../assets/icons/cancel_icon.png")}
                        style={{ width: 14, height: 14, marginRight: 4 }}
                      />
                      <Text
                        style={{
                          color: "#FF6B6B",
                          fontWeight: "600",
                          fontSize: 13,
                          lineHeight: 19.5,
                        }}
                      >
                        {" "}
                        Cancel Order
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: "80%",
              backgroundColor: isDark ? "#222" : "#fff",
              borderRadius: 16,
              padding: 20,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 10,
                color: isDark ? "#fff" : "#000",
              }}
            >
              Order Status
            </Text>

            <Text
              style={{
                fontSize: 14,
                textAlign: "center",
                color: isDark ? "#ccc" : "#333",
              }}
            >
              {modalMessage}
            </Text>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                marginTop: 20,
                backgroundColor: "#53BA83",
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast position="bottom" config={toastConfig} />
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  container: {
    flex: 1,
    paddingTop: 30,
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  searchBar: {
    height: 42,
    width: "100%",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: "SfRegular",
  },
  tabsContainer: {
    paddingVertical: 16,
    gap: 12,
  },
  tabItem: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabItemActive: {
    // Handled inline
  },
  tabText: {
    fontFamily: "SfRegular",
    fontSize: 15,
    fontWeight: "500",
  },
  detailLabel: {
    fontFamily: "SfRegular",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "500",
    color: "#8A8A8A",
  },
  detailValue: {
    marginTop: 5,
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 21,
  },
  dateText: {
    color: "#8A8A8A",
    fontWeight: "400",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "SfRegular",
    marginLeft: 6,
  },
  orderTypeText: {
    fontWeight: "500",
    fontSize: 10,
    lineHeight: 15,
    fontFamily: "SfRegular",
    color: "#8A8A8A",
  },
});

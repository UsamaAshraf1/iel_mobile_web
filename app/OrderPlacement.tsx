import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BaseUrl } from "../constants/baseUrl";
import { useTheme } from "@/hooks/ThemeContext";
export default function OrderPlacement() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const {
    // status: initialStatus,
    order,
    symbol,
    ShareNumber,
    selectedorderType,
    triggerPrice,
  } = useLocalSearchParams();
  const router = useRouter();

  const [currentStatus, setCurrentStatus] = useState("pending");
  const [orderInfo, setOrderInfo] = useState(null);
  const [SocketCloseData, setSocketCloseData] = useState([]);
  const [loading, setLoading] = useState(false);
  const FetchNotification = async () => {
    const OrderStr = await AsyncStorage.getItem("order_notification");
    setOrderInfo(JSON.parse(OrderStr));
  };

  useEffect(() => {
    FetchNotification();
  }, []);

  useEffect(() => {
    const fetchDataIfwebScoketClose = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${BaseUrl}/api/stocks/stock/latest-stock-data/?symbols=${symbol}`,
        );
        const data = await response.json();
        console.log(data);
        setSocketCloseData(data[0]?.data);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setSocketCloseData([]);
      }
    };

    fetchDataIfwebScoketClose();
  }, [symbol]);
  const isSuccess =
    orderInfo?.status === "ACTIVATE" || orderInfo?.status === "QUEUE";
  const title = isSuccess
    ? orderInfo?.status === "QUEUE"
      ? "Order Queued"
      : "Order Placed!"
    : "Order Failed";
  const subtitle = isSuccess
    ? `Your ${order} order has been\nsuccessfully placed`
    : "";

  const showTransactionDetails = true;

  console.log("Data", SocketCloseData);

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: isDark ? "#000" : "#fff" }]}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? "#000" : "#fff" },
        ]}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Processing your order...</Text>
          </View>
        ) : (
          <>
            {/* Icon */}
            <View style={{ flexDirection: "row", justifyContent: "center" }}>
              <View
                style={{
                  borderWidth: 0.78,
                  borderColor: isSuccess ? "#53BA834D" : "#FB2C364D",
                  borderRadius: 100,
                  width: 160,
                  height: 160,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Image
                  source={
                    isSuccess
                      ? require("../assets/icons/pay_success.png")
                      : require("../assets/icons/pay_fail.png")
                  }
                  style={{ width: 100, height: 100 }}
                />
              </View>
            </View>

            {/* Title & subtitle */}
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: 28,
                  fontFamily: "SfRegular",
                  color: isDark ? "#FFFFFF" : "#0B1B0C",
                  marginTop: 10,
                }}
              >
                {title}
              </Text>
              <Text
                style={{
                  textAlign: "center",
                  fontWeight: "400",
                  fontSize: 16,
                  fontFamily: "SfRegular",
                  color: isDark ? "#8A8A8A" : "#6A7282",
                  marginTop: 10,
                }}
              >
                {subtitle}
              </Text>
            </View>

            {/* Order summary card */}
            <View
              style={{
                marginHorizontal: 24,
                backgroundColor: isSuccess
                  ? isDark
                    ? "#53BA831A"
                    : "#53BA830D"
                  : "#FB2C360D",
                borderRadius: 12,
                borderWidth: 0.64,
                borderColor: isSuccess ? "#53BA8333" : "#FB2C3633",
                marginTop: 12,
                padding: 14,
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
                    {/* 1.82 */}
                    {SocketCloseData?.close_price}
                  </Text>
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? "#FFFFFF14" : "#E0E0E0",
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
                  {ShareNumber} shares {order === "Buy" ? "purchased" : "sold"}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "400",
                    fontFamily: "SfRegular",
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                  }}
                >
                  {/* Total Cost */}
                  {(SocketCloseData?.close_price * ShareNumber).toFixed(2)}
                </Text>
              </View>

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
                  Price per share
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "400",
                    fontFamily: "SfRegular",
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                  }}
                >
                  PKR {SocketCloseData?.close_price}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 12,
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
                  Transaction
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "400",
                    fontFamily: "SfRegular",
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                  }}
                >
                  {order}
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
                    fontSize: 14,
                    fontWeight: "400",
                    fontFamily: "SfRegular",
                    color: "#6B7280",
                  }}
                >
                  Order type
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "400",
                    fontFamily: "SfRegular",
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                  }}
                >
                  {selectedorderType}
                </Text>
              </View>

              {(selectedorderType === "Limit Order" ||
                selectedorderType === "Stop Loss Order") && (
                // <View
                //   style={{
                //     flexDirection: "row",
                //     justifyContent: "space-between",
                //     alignItems: "center",
                //     paddingVertical: 12,
                //   }}
                // >
                //   <Text
                //     style={{
                //       fontSize: 14,
                //       fontWeight: "400",
                //       fontFamily: "SfRegular",
                //       color: "#6B7280",
                //     }}
                //   >
                //     Limit Price
                //   </Text>
                //   <Text
                //     style={{
                //       fontSize: 14,
                //       fontWeight: "400",
                //       fontFamily: "SfRegular",
                //       color: isDark ? "#E0E0E0" : "#0B1B0C",
                //     }}
                //   >
                //     PKR (triggerPrice)
                //   </Text>
                // </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    // paddingVertical: 12,
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
                    {selectedorderType === "Limit Order"
                      ? "Limit Price"
                      : selectedorderType === "Stop Loss Order"
                        ? "Stop Loss Price"
                        : ""}{" "}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "400",
                      fontFamily: "SfRegular",
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    PKR {triggerPrice}
                  </Text>
                </View>
              )}
            </View>

            {/* Transaction Details – shown only when we have real WebSocket data */}
            {showTransactionDetails && (
              <View
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
                    fontSize: 16,
                    fontWeight: "600",
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                    fontFamily: "SfRegular",
                  }}
                >
                  Transaction Details
                </Text>

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
                    Order ID
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "400",
                      fontFamily: "SfRegular",
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    {orderInfo?.orderNo}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: 12,
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
                    Executed Time
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "400",
                      fontFamily: "SfRegular",
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    {/* {"Oct 31, 2025, 09:14 PM"} */}
                    {orderInfo?.time}
                  </Text>
                </View>

                {/* <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 12,
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
                    Status
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "400",
                      fontFamily: "SfRegular",
                      color: "#FFAA34",
                    }}
                  >
                    Pending
                  </Text>
                </View> */}
              </View>
            )}

            {/* Bottom info banner */}
            <View
              style={{
                backgroundColor: isDark ? "#53BA831A" : "#53BA830D",
                marginHorizontal: 24,
                marginVertical: 16,
                borderRadius: 12,
                borderWidth: 0.64,
                borderColor: "#53BA8333",
                paddingHorizontal: 20,
                paddingVertical: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "400",
                  fontFamily: "SfRegular",
                  color: "#6B7280",
                }}
              >
                {/* {isSuccess
                  ? "An email has been sent to your registered email address."
                  : "Add funds to your account to complete this transaction or reduce the number of shares"} */}
                {orderInfo?.message}
              </Text>
            </View>

            {/* Action buttons */}
            <View
              style={{
                marginHorizontal: 24,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 24,
                paddingBottom: 20,
              }}
            >
              {/* <TouchableOpacity
                style={{
                  width: "48%",
                  backgroundColor:
                    isDark ? "transparent" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#E0E0E0",
                  borderRadius: 16,
                  paddingVertical: 20,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: isDark ? "#E0E0E0" : "#0B1B0C",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Cancel Order
                </Text>
              </TouchableOpacity> */}

              <TouchableOpacity
                // onPress={() => router.push("/Portfolio")}
                onPress={() => {
                  if (isSuccess) {
                    router.push("/Portfolio");
                  } else {
                    router.push(`/Stockbuy?symbol=${symbol}&order=${order}`); // ← change to your actual buy screen route
                    // Alternative if you want to go back one screen:
                    // router.back();
                  }
                }}
                style={{ width: "100%" }}
              >
                <View
                  style={{
                    backgroundColor: "#53BA83",
                    borderRadius: 16,
                    paddingVertical: 20,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    {isSuccess ? "View Portfolio" : "Try Again"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 100,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
});

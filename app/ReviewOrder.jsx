import { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useRouter } from "expo-router";
import { BaseUrl } from "../constants/baseUrl";
import { useColorScheme } from "@/hooks/useColorScheme";
import StompService from "../Services/webSocketConnection";
import { useTheme } from "../hooks/ThemeContext";
import { Svg, Path } from "react-native-svg";

export default function ReviewOrder() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const [SocketCloseData, setSocketCloseData] = useState([]);
  const [StockData, setStockData] = useState(); // Default tab
  const [SocketData, setSocketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { order, symbol, ShareNumber, selectedorderType, trigger } =
    useLocalSearchParams();
  const router = useRouter();
  console.log(order);
  console.log(symbol);
  console.log(ShareNumber);

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

  const handlePlaceOrder = async () => {
    setLoading(true);

    const payload = {
      clientCode: StompService.userId,
      symbol: symbol,
      side: order,
      refNo: 0,
      price:
        selectedorderType === "Limit Order"
          ? trigger
          : SocketCloseData?.close_price,
      volume: parseInt(ShareNumber),
      triggerPrice: trigger,
      orderType:
        selectedorderType === "Market Order"
          ? "MKT"
          : selectedorderType === "Limit Order"
            ? "140"
            : selectedorderType === "Stop Loss Order"
              ? "141"
              : "",
      marketType: "REG",
      userId: StompService.userId,
      actionType: "neworder",
      orignateSource: "W",
      discVolume: 0,
      orderProperty: 111,
      subClientCode: "",
    };

    // StompService.placeNewOrder(payload);
    // router.push(
    //   `/OrderProcessing?order=${order}&symbol=${symbol}&ShareNumber=${ShareNumber}&selectedorderType=${selectedorderType}&triggerPrice=${trigger}`,
    // );
    router.push({
      pathname: "/Onetimepass",
      params: {
        orderPayload: JSON.stringify(payload),
        order,
        symbol,
        ShareNumber,
        selectedorderType,
        trigger,
      },
    });
  };

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
          (styles.container,
          {
            backgroundColor: isDark ? "" : "#fff",
          }),
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 24,
            paddingVertical: 12,
            justifyContent: "space-between",
            marginTop: 50,
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
              Review Order
            </Text>
          </View>
          <View style={{ width: 8 }} />{" "}
        </View>
        {order === "Buy" ? (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 12,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                backgroundColor: isDark ? "#DCFCE740" : "#DCFCE7",
                borderRadius: 100,
                width: 120,
                height: 40,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  color: "#53BA83",
                  fontSize: 16,
                }}
              >
                Buy Order
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 12,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                backgroundColor: "#FFE2E2",
                borderRadius: 100,
                width: 120,
                height: 40,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  color: "#E7000B",
                  fontSize: 16,
                }}
              >
                Sell Order
              </Text>
            </View>
          </View>
        )}

        <View
          style={{
            marginHorizontal: 24,
            paddingHorizontal: 24,
            // paddingTop: 16,
            // paddingBottom: 30,
            paddingVertical: 16,
            borderColor: "#53BA8333",
            borderWidth: 0.64,
            backgroundColor: isDark ? "#53BA831A" : "#53BA830D",
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
                  SocketData?.data?.data?.c || SocketCloseData?.close_price,
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
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ marginRight: 3 }}>
                {isDark ? (
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
                ) : SocketCloseData?.percent_change > 0 ? (
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
                    SocketCloseData?.percent_change > 0 ? "#3FB950" : "#FF6B6B",
                  fontWeight: "600",
                  fontFamily: "SfRegular",
                  fontSize: 14,
                }}
              >
                {formatLargeNumber(
                  Math.abs(SocketData?.data?.data?.ch) ||
                    Math.abs(SocketCloseData?.change),
                )}{" "}
                ({" "}
                {(Math.abs(SocketCloseData?.percent_change) * 100).toFixed(2) +
                  "%"}{" "}
                )
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            marginHorizontal: 24,
            backgroundColor: isDark ? "#FFFFFF14" : "#FFFFFF",
            borderRadius: 12,
            borderWidth: 0.58,
            borderColor: isDark ? "#FFFFFF1A" : "#E0E0E0",
            marginTop: 12,
            padding: 14,
            // borderBottomLeftRadius: 12,
            // borderBottomRightRadius: 12,
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
            Order Details
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
              Order Type
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
              Number of Shares
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "400",
                fontFamily: "SfRegular",
                color: isDark ? "#E0E0E0" : "#0B1B0C",
              }}
            >
              {ShareNumber}
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
              Price per Shares
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "400",
                fontFamily: "SfRegular",
                color: isDark ? "#E0E0E0" : "#0B1B0C",
              }}
            >
              PKR{" "}
              {formatLargeNumber(
                SocketData?.data?.data?.c || SocketCloseData?.close_price,
              )}
            </Text>
          </View>
          {(selectedorderType === "Limit Order" ||
            selectedorderType === "Stop Loss Order") && (
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
                {/* Limit Price */}
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
                PKR {formatLargeNumber(trigger)}
              </Text>
            </View>
          )}
        </View>

        <View
          style={{
            marginHorizontal: 24,
            backgroundColor: isDark ? "#FFFFFF14" : "#FFFFFF",
            borderRadius: 12,
            borderWidth: 0.58,
            borderColor: isDark ? "#FFFFFF1A" : "#E0E0E0",
            marginTop: 12,
            padding: 14,
            // borderBottomLeftRadius: 12,
            // borderBottomRightRadius: 12,
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
            Payment Summary
          </Text>

          {(() => {
            const shares = Number(ShareNumber) || 0;
            const price =
              trigger > 0 ? trigger : Number(SocketCloseData?.close_price);
            const subtotal = shares * price;
            // const fee = subtotal * 0.001;
            const fee = 0;
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

                {/* <View
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
                </View> */}

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
        </View>

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
              color: isDark ? "#8A8A8A" : "#6B7280",
            }}
          >
            By confirming this order, you agree to execute a market order at the
            current market price. The final execution price may vary slightly.
          </Text>
        </View>

        <View
          style={{
            marginHorizontal: 24,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            alignContent: "center",
            marginTop: 24,
            paddingBottom: 20,
          }}
        >
          <TouchableOpacity
            style={{
              width: "48%",
            }}
            onPress={() => router.back()}
          >
            <Text
              style={{
                textAlign: "center",
                backgroundColor: isDark ? "#0B1B0C" : "#FFFFFF",
                color: isDark ? "#E0E0E0" : "#0B1B0C",
                fontSize: 16,
                fontWeight: "600",
                paddingVertical: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#E0E0E0",
              }}
            >
              Edit Order
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePlaceOrder} style={{ width: "48%" }}>
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
              Confirm Order
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
});

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Pressable,
  Image,
  ScrollView,
} from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Text as SvgText,
  G,
  ClipPath,
  Rect,
  Line,
} from "react-native-svg";
import { BaseUrl } from "../constants/baseUrl";
import { useRouter } from "expo-router";

const OverViewGraph = ({ symbol, colorScheme, setActiveGraphTab }) => {
  const [selectedPeriod, setSelectedPeriod] = useState("2Y");
  const [dayData, setDayData] = useState([]);
  const [fullData, setFullData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const scrollViewRef = useRef(null);
  const router = useRouter();

  const screenWidth = Dimensions.get("window").width;
  const chartHeight = 300;

  // Fixed candle dimensions (good for scrolling + many candles)
  const FIXED_CANDLE_WIDTH = 7;
  const CANDLE_SPACING = 5;
  const CANDLE_TOTAL_WIDTH = FIXED_CANDLE_WIDTH + CANDLE_SPACING;

  // Reset on symbol change
  useEffect(() => {
    setFullData([]);
    setDayData([]);
    setLoading(true);
    setHoveredIndex(null);
  }, [symbol]);

  // Data fetching (unchanged)
  useEffect(() => {
    let isMounted = true;

    const fetchDayStocks = async () => {
      try {
        setError(null);
        const response = await fetch(
          `${BaseUrl}/api/psxApi/home/live-feed-history/?symbol=${symbol}`,
        );
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        if (isMounted) {
          setDayData(Array.isArray(data?.data) ? data.data : []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch Day Data:", err);
        if (isMounted) {
          setDayData([]);
          setError("Failed to fetch day data");
          setLoading(false);
        }
      }
    };

    const fetchFullHistory = async () => {
      try {
        setError(null);
        const response = await fetch(
          `${BaseUrl}/api/psxApi/stock-detail/stock-history-graph/?filter=2Y&stock=${symbol}`,
        );
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        if (isMounted) {
          setFullData(Array.isArray(data?.data) ? data.data : []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch Full History Data:", err);
        if (isMounted) {
          setFullData([]);
          setError("Failed to fetch history data");
          setLoading(false);
        }
      }
    };

    const loadData = async () => {
      setLoading(true);
      setError(null);
      if (selectedPeriod === "D") {
        await fetchDayStocks();
      } else {
        if (fullData.length === 0) {
          await fetchFullHistory();
        } else {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedPeriod, symbol]);

  const filteredData = useMemo(() => {
    if (selectedPeriod === "D") return dayData;
    if (fullData.length === 0) return [];

    let dataToFilter = fullData;

    if (selectedPeriod === "W") {
      dataToFilter = fullData.slice(-7);
    }

    const now = new Date();
    let daysBack;
    switch (selectedPeriod) {
      case "M":
        daysBack = 30;
        break;
      case "6M":
        daysBack = 182;
        break;
      case "Y":
        daysBack = 365;
        break;
      case "2Y":
        daysBack = 730;
        break;
      default:
        return dataToFilter.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    return dataToFilter
      .filter((item) => new Date(item.date) >= startDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [selectedPeriod, dayData, fullData]);

  // Candlestick calculations with fixed width + scrolling support
  const { candles, minPrice, maxPrice, priceRange, totalContentWidth } =
    useMemo(() => {
      if (filteredData.length === 0) {
        return {
          candles: [],
          minPrice: 0,
          maxPrice: 0,
          priceRange: 1,
          totalContentWidth: screenWidth,
        };
      }

      const allPrices = filteredData.flatMap((d) =>
        [
          Number(d.open || d.opening_price || d.openPrice || 0),
          Number(d.high || d.high_price || d.highPrice || 0),
          Number(d.low || d.low_price || d.lowPrice || 0),
          Number(d.close || d.closing_price || d.closePrice || 0),
        ].filter((v) => !isNaN(v)),
      );

      const minPriceVal = allPrices.length > 0 ? Math.min(...allPrices) : 0;
      const maxPriceVal = allPrices.length > 0 ? Math.max(...allPrices) : 1;
      const priceRangeVal = maxPriceVal - minPriceVal || 1;

      // Calculate total width needed for all candles + padding
      const contentWidth = Math.max(
        screenWidth,
        filteredData.length * CANDLE_TOTAL_WIDTH + 60, // left + right padding
      );

      const xPositions = filteredData.map(
        (_, i) => 30 + i * CANDLE_TOTAL_WIDTH + FIXED_CANDLE_WIDTH / 2,
      );

      const yScale = (price) =>
        chartHeight - ((price - minPriceVal) / priceRangeVal) * chartHeight;

      const candlesArray = filteredData.map((item, index) => {
        const open = Number(
          item.open || item.opening_price || item.openPrice || 0,
        );
        const high = Number(
          item.high || item.high_price || item.highPrice || 0,
        );
        const low = Number(item.low || item.low_price || item.lowPrice || 0);
        const close = Number(
          item.close || item.closing_price || item.closePrice || 0,
        );

        const isBullish = close >= open;
        const bodyTopPrice = Math.max(open, close);
        const bodyBottomPrice = Math.min(open, close);

        return {
          index,
          x: xPositions[index],
          yHigh: yScale(high),
          yLow: yScale(low),
          yOpen: yScale(open),
          yClose: yScale(close),
          yBodyTop: yScale(bodyTopPrice),
          yBodyBottom: yScale(bodyBottomPrice),
          isBullish,
          open,
          high,
          low,
          close,
          date: item.date || item.time || "",
        };
      });

      return {
        candles: candlesArray,
        minPrice: minPriceVal,
        maxPrice: maxPriceVal,
        priceRange: priceRangeVal,
        totalContentWidth: contentWidth,
      };
    }, [filteredData, screenWidth]);

  // Price labels (optional - currently commented out)
  const priceLabels = useMemo(() => {
    if (priceRange <= 1) return [];
    const step = priceRange / 5;
    return Array.from({ length: 6 }, (_, i) => minPrice + i * step);
  }, [minPrice, priceRange]);

  // Hover logic
  const handlePressIn = (event) => {
    const touchX = event.nativeEvent.locationX;
    if (candles.length === 0) return;

    let closest = 0;
    let minDist = Infinity;

    candles.forEach((c, i) => {
      const dist = Math.abs(c.x - touchX);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });

    if (minDist < 35) {
      setHoveredIndex(closest);
    } else {
      setHoveredIndex(null);
    }
  };

  const handlePressOut = () => setHoveredIndex(null);

  const getTooltipPosition = (index) => {
    const candle = candles[index];
    if (!candle) return 0;
    const tooltipWidth = 160;
    let left = candle.x - tooltipWidth / 2;

    // Adjust for scroll position (approximation)
    left = Math.max(8, Math.min(totalContentWidth - tooltipWidth - 8, left));
    return left;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    if (!loading && filteredData.length > 0 && scrollViewRef.current) {
      // Small delay to make sure layout is ready
      const timer = setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: false });
      }, 100); // 100ms is usually enough, you can increase to 300 if needed

      return () => clearTimeout(timer);
    }
  }, [loading, filteredData.length, selectedPeriod, symbol]);
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorScheme === "dark" ? "" : "#fff",
        },
      ]}
    >
      {loading || filteredData.length === 0 ? (
        <View style={styles.loadingContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#00CC66" />
          ) : (
            <Text style={styles.errorText}>{error || "No data available"}</Text>
          )}
        </View>
      ) : (
        <View style={styles.graphContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              width: totalContentWidth,
              paddingRight: 20,
            }}
          >
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={{ width: totalContentWidth, height: 340 }}
            >
              <Svg width={totalContentWidth} height={340}>
                <Defs>
                  <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#111111" stopOpacity="0.3" />
                    <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
                  </LinearGradient>

                  <ClipPath id="chartArea">
                    <Rect
                      x="0"
                      y="0"
                      width={totalContentWidth}
                      height={chartHeight}
                    />
                  </ClipPath>
                </Defs>

                <G clipPath="url(#chartArea)">
                  {/* Candlesticks */}
                  {candles.map((c) => (
                    <G key={c.index}>
                      {/* Wick */}
                      <Line
                        x1={c.x}
                        y1={c.yHigh}
                        x2={c.x}
                        y2={c.yLow}
                        stroke="#777777"
                        strokeWidth="1.5"
                      />

                      {/* Body */}
                      <Rect
                        x={c.x - FIXED_CANDLE_WIDTH / 2}
                        y={c.yBodyTop}
                        width={FIXED_CANDLE_WIDTH}
                        height={Math.max(1, c.yBodyBottom - c.yBodyTop)}
                        fill={c.isBullish ? "#00CC66" : "#FF4444"}
                        stroke={c.isBullish ? "#00FF88" : "#FF6666"}
                        strokeWidth="1"
                      />
                    </G>
                  ))}

                  {/* Hover indicators */}
                  {hoveredIndex !== null && candles[hoveredIndex] && (
                    <>
                      <Line
                        x1={candles[hoveredIndex].x}
                        y1={0}
                        x2={candles[hoveredIndex].x}
                        y2={chartHeight}
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth="1"
                        strokeDasharray="4 3"
                      />
                      <Circle
                        cx={candles[hoveredIndex].x}
                        cy={
                          (candles[hoveredIndex].yHigh +
                            candles[hoveredIndex].yLow) /
                          2
                        }
                        r="10"
                        fill="rgba(255,255,255,0.12)"
                      />
                    </>
                  )}
                </G>

                {/* Price labels - optional, currently commented */}
                {/* <G>
                  {priceLabels.map((price, i) => {
                    const y = chartHeight - ((price - minPrice) / priceRange) * chartHeight;
                    return (
                      <SvgText
                        key={i}
                        x={totalContentWidth - 10}
                        y={y + 4}
                        fontSize="11"
                        fill="#AAAAAA"
                        textAnchor="end"
                      >
                        {price.toFixed(2)}
                      </SvgText>
                    );
                  })}
                </G> */}
              </Svg>

              {/* Tooltip */}
              {hoveredIndex !== null && candles[hoveredIndex] && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.tooltip,
                    {
                      left: getTooltipPosition(hoveredIndex),
                      top: Math.max(20, candles[hoveredIndex].yHigh - 120),
                    },
                  ]}
                >
                  <Text style={styles.tooltipTitle}>
                    {formatDate(candles[hoveredIndex].date)}
                  </Text>
                  <Text style={styles.tooltipText}>
                    Open: {candles[hoveredIndex].open.toFixed(2)}
                  </Text>
                  <Text style={styles.tooltipText}>
                    High: {candles[hoveredIndex].high.toFixed(2)}
                  </Text>
                  <Text style={styles.tooltipText}>
                    Low: {candles[hoveredIndex].low.toFixed(2)}
                  </Text>
                  <Text style={styles.tooltipText}>
                    Close: {candles[hoveredIndex].close.toFixed(2)}
                  </Text>
                </View>
              )}
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* Period selector + resize button */}
      <View style={[styles.buttonContainer]}>
        <TouchableOpacity
          style={[colorScheme === "dark" ? styles.button : styles.buttonLight]}
          // onPress={() => setActiveGraphTab("line")}
          onPress={() => router.push(`/NewGraph?symbol=${symbol}`)}
        >
          <Image
            source={
              colorScheme === "dark"
                ? require("../assets/icons/white_resize.png")
                : require("../assets/icons/black_resize.png")
            }
            style={{ width: 20, height: 20 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  loadingContainer: {
    height: 340,
    justifyContent: "center",
    alignItems: "center",
  },
  graphContainer: {
    width: "100%",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1A1A1A",
  },
  buttonLight: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  errorText: {
    color: "#FF5555",
    fontSize: 16,
  },
  tooltip: {
    position: "absolute",
    backgroundColor: "rgba(18,18,18,0.96)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444444",
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 160,
    zIndex: 10,
  },
  tooltipTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  tooltipText: {
    color: "#DDDDDD",
    fontSize: 12,
    lineHeight: 18,
  },
});

export default OverViewGraph;

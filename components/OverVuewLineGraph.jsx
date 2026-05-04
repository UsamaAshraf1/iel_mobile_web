import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Pressable,
  Animated,
  Image,
} from "react-native";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Text as SvgText,
  G,
  ClipPath, // ← Add this
  Rect, // ← Add this
} from "react-native-svg";
import { BaseUrl } from "../constants/baseUrl";
import { useRouter } from "expo-router";
import { useTheme } from "../hooks/ThemeContext";

const OverViewLineGraph = ({
  symbol,
  colorScheme,
  setActiveGraphTab,
  currentPrice,
}) => {
  const { isDark } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState("D");
  const [dayData, setDayData] = useState([]);
  const [fullData, setFullData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const router = useRouter();

  // console.log(
  //   "OverVuewLineGraph Rendered with symbol:",
  //   symbol,
  //   "and currentPrice:",
  //   currentPrice,
  // );

  const opacity = useRef(new Animated.Value(0)).current;
  const fillOpacity = useRef(new Animated.Value(0)).current;
  const dashOffset = useRef(new Animated.Value(0)).current;
  const yAxisWidth = 70;

  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - yAxisWidth;
  const leftPadding = 20;
  const rightPadding = yAxisWidth;

  // Reset on symbol change
  useEffect(() => {
    setFullData([]);
    setDayData([]);
    setLoading(true);
    setHoveredIndex(null);
  }, [symbol]);

  // Data fetching
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
        return dataToFilter.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    return dataToFilter
      .filter((item) => new Date(item.date) >= startDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [selectedPeriod, dayData, fullData]);

  // Animation
  useEffect(() => {
    if (filteredData.length > 0 && !loading) {
      dashOffset.setValue(totalPathLength || 0);
      fillOpacity.setValue(0);
      opacity.setValue(0);

      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(dashOffset, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ]),
        Animated.timing(fillOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [filteredData, loading]);

  const timePeriods = ["D", "W", "M", "6M", "Y", "2Y"];

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    setHoveredIndex(null);
  };

  // Smooth quadratic curve path
  const svgQuadraticCurvePath = (points) => {
    if (points.length === 0) return "";
    let path = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const xMid = (points[i][0] + points[i + 1][0]) / 2;
      const yMid = (points[i][1] + points[i + 1][1]) / 2;
      const cpX1 = (xMid + points[i][0]) / 2;
      const cpX2 = (xMid + points[i + 1][0]) / 2;
      path += ` Q ${cpX1},${points[i][1]} ${xMid},${yMid}`;
      path += ` Q ${cpX2},${points[i + 1][1]} ${points[i + 1][0]},${
        points[i + 1][1]
      }`;
    }
    return path;
  };

  // Chart calculations
  const {
    points,
    linePath,
    fillPath,
    gradientId,
    strokeColor,
    totalPathLength,
    minY,
    maxY,
    prices,
  } = useMemo(() => {
    if (filteredData.length === 0)
      return {
        points: [],
        linePath: "",
        fillPath: "",
        gradientId: "gradRed",
        strokeColor: "#FF0000",
        totalPathLength: 0,
        minY: 0,
        maxY: 0,
        prices: [],
      };

    const prices = filteredData.map(
      (stock) => stock.close || stock.closing_price || 0,
    );
    const minY = Math.min(...prices);
    const maxY = Math.max(...prices);
    const height = 300;
    const chartHeight = height;

    const points = filteredData.map((stock, index) => {
      const x =
        filteredData.length <= 1
          ? chartWidth / 2
          : (index / (filteredData.length - 1)) * chartWidth;
      const normalized =
        maxY === minY ? 0.5 : (prices[index] - minY) / (maxY - minY);
      const y = chartHeight - normalized * chartHeight;
      return { x: x + 20, y };
    });

    const pointArray = points.map((p) => [p.x, p.y]);
    const linePath = svgQuadraticCurvePath(pointArray);

    // Approximate path length for dash animation
    let totalLength = 0;
    for (let i = 0; i < pointArray.length - 1; i++) {
      const dx = pointArray[i + 1][0] - pointArray[i][0];
      const dy = pointArray[i + 1][1] - pointArray[i][1];
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }

    const bottomY = chartHeight;
    const fillPath =
      linePath +
      ` L ${points[points.length - 1].x} ${bottomY} L ${
        points[0].x
      } ${bottomY} Z`;

    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const isUpward = lastPrice >= firstPrice;
    const gradientId = isUpward ? "gradGreen" : "gradRed";
    const strokeColor = isUpward ? "#00FF88" : "#FF4444"; // Bright green/red for glow

    return {
      points,
      linePath,
      fillPath,
      gradientId,
      strokeColor,
      totalPathLength: totalLength,
      minY,
      maxY,
      prices,
    };
  }, [filteredData, screenWidth]);

  // 5 price labels on the right side

  // Touch handling for hover
  const handlePressIn = (event) => {
    const touchX = event.nativeEvent.locationX;
    const index = Math.round(
      (touchX / screenWidth) * (filteredData.length - 1),
    );
    if (index >= 0 && index < filteredData.length) {
      setHoveredIndex(index);
    }
  };

  const handlePressOut = () => {
    setHoveredIndex(null);
  };

  // Tooltip position
  const getTooltipPosition = (index) => {
    const tooltipWidth = 160;
    let left = leftPadding + points[index].x - tooltipWidth / 2;
    if (left < 10) left = 10;
    if (left + tooltipWidth > screenWidth - 10)
      left = screenWidth - tooltipWidth - 10;
    return left;
  };
  // Time key
  const getTimeKey = () => (selectedPeriod === "D" ? "time" : "date");

  // Format time
  const formatTime = (timeStr) => {
    if (!timeStr) return "N/A";
    const date = new Date(timeStr);
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sept",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const priceLabels = useMemo(() => {
    if (prices.length === 0) return [];
    const step = (maxY - minY) / 5;
    return Array.from({ length: 6 }, (_, i) => minY + i * step);
  }, [minY, maxY]);

  const xLabels = useMemo(() => {
    if (filteredData.length === 0) return [];

    const steps = 4; // 5 labels
    const interval = Math.floor(filteredData.length / steps);

    const labels = [];

    const formatXAxisLabel = (value) => {
      const date = new Date(value);

      if (selectedPeriod === "D") {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      if (selectedPeriod === "W" || selectedPeriod === "M") {
        return date.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        });
      }

      if (selectedPeriod === "6M" || selectedPeriod === "Y") {
        return date.toLocaleDateString("en-US", { month: "short" });
      }

      if (selectedPeriod === "2Y") {
        return date.getFullYear().toString();
      }

      return date.toLocaleDateString();
    };

    for (let i = 0; i <= steps; i++) {
      const index = Math.min(i * interval, filteredData.length - 1);
      const rawValue =
        filteredData[index][getTimeKey()] ||
        filteredData[index].date ||
        filteredData[index].time;

      labels.push({
        // ADD yAxisWidth here
        x: leftPadding + (index / (filteredData.length - 1)) * chartWidth,
        label: formatXAxisLabel(rawValue),
      });
    }

    return labels;
  }, [filteredData, selectedPeriod]);

  const currentPriceY = useMemo(() => {
    if (!currentPrice || maxY === minY) return null;

    const normalized = (Number(currentPrice) - minY) / (maxY - minY);
    const chartHeight = 300;

    return chartHeight - normalized * chartHeight;
  }, [currentPrice, minY, maxY]);
  return (
    <View style={styles.container}>
      {loading || filteredData.length === 0 ? (
        <View style={styles.loadingContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#00FF88" />
          ) : (
            <Text style={styles.errorText}>{error || "No data available"}</Text>
          )}
        </View>
      ) : (
        <View style={styles.graphContainer}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={{ width: screenWidth }}
          >
            <Animated.View style={{ opacity }}>
              <Svg width={screenWidth} height={350}>
                <Defs style={{ marginLeft: 20 }}>
                  <LinearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#00FF88" stopOpacity="0.15" />
                    <Stop offset="1" stopColor="#00FF88" stopOpacity="0" />
                  </LinearGradient>
                  <LinearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#FF4444" stopOpacity="0.15" />
                    <Stop offset="1" stopColor="#FF4444" stopOpacity="0" />
                  </LinearGradient>

                  {/* Clip path to prevent line from overlapping price labels */}
                  <ClipPath id="chartClip">
                    <Rect
                      x={leftPadding}
                      y="0"
                      width={screenWidth}
                      height={350}
                    />
                  </ClipPath>
                </Defs>

                {/* Area fill - full width (no clipping needed) */}
                <Path
                  d={fillPath}
                  fill={`url(#${gradientId})`}
                  // opacity={fillOpacity}
                />

                {/* Line and glow - clipped to avoid overlapping labels */}
                <G clipPath="url(#chartClip)">
                  {/* Glow effect */}
                  <Path
                    d={linePath}
                    stroke={strokeColor}
                    strokeWidth="0.7"
                    fill="none"
                    opacity="0.5"
                  />

                  {/* Main sharp line */}
                  <Path
                    d={linePath}
                    stroke={strokeColor}
                    strokeWidth="0.7"
                    fill="none"
                    strokeDasharray={`${totalPathLength} ${totalPathLength}`}
                    strokeDashoffset={dashOffset}
                  />
                </G>

                {/* Hover dot - allow it near the edge, but not over labels */}
                {hoveredIndex !== null &&
                  points[hoveredIndex] &&
                  points[hoveredIndex].x < screenWidth - 50 && (
                    <Circle
                      cx={points[hoveredIndex].x}
                      cy={points[hoveredIndex].y}
                      r="7"
                      fill={strokeColor}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  )}

                {/* 🔥 Current Price Line */}
                {(selectedPeriod === "D") && currentPriceY !== null && (
                  <>
                    {/* Dashed horizontal line */}
                    <Path
                      d={`M ${leftPadding} ${currentPriceY} L ${screenWidth - 10} ${currentPriceY}`}
                      stroke="#FFD700"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.9"
                    />

                    {/* Price label on right */}
                    <SvgText
                      x={screenWidth - 6}
                      y={currentPriceY - 2}
                      fontSize="11"
                      fontFamily="SfRegular"
                      fill="#FFD700"
                      textAnchor="end"
                    >
                      {Number(currentPrice).toFixed(2)}
                    </SvgText>
                  </>
                )}

                {/* Right-side price labels - now safe from overlap */}
                <G>
                  {priceLabels.map((price, i) => {
                    const normalized =
                      maxY === minY ? 0.5 : (price - minY) / (maxY - minY);
                    const y = 280 - normalized * 270; // Match height=320
                    return (
                      <SvgText
                        key={i}
                        x={screenWidth - 6}
                        y={y + 2}
                        fontSize="11"
                        fontFamily="SfRegular"
                        fill="#AAAAAA"
                        textAnchor="end"
                      >
                        {price.toFixed(2)}
                      </SvgText>
                    );
                  })}
                </G>

                <G>
                  {xLabels.map((item, i) => (
                    <SvgText
                      key={i}
                      x={item.x - 60}
                      y={345}
                      // width={chartWidth}
                      fontSize="10"
                      fontFamily="SfRegular"
                      fill="#AAAAAA"
                      textAnchor="middle"
                      style={{ right: "30px" }}
                    >
                      {item.label}
                    </SvgText>
                  ))}
                </G>
              </Svg>
            </Animated.View>

            {/* Tooltip */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <View
                style={[
                  styles.tooltip,
                  {
                    left: getTooltipPosition(hoveredIndex),
                    // top: points[hoveredIndex].y - 90,
                  },
                ]}
              >
                <Text style={styles.tooltipText}>
                  Price:{" "}
                  {(
                    filteredData[hoveredIndex].close ||
                    filteredData[hoveredIndex].closing_price ||
                    0
                  ).toFixed(2)}
                </Text>
                <Text style={styles.tooltipText}>
                  Time: {formatTime(filteredData[hoveredIndex][getTimeKey()])}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      )}

      {/* Period buttons */}
      <View style={styles.buttonContainer}>
        {timePeriods.map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              isDark ? styles.button : styles.buttonLight,
              selectedPeriod === period && styles.selectedButton,
            ]}
            onPress={() => handlePeriodChange(period)}
          >
            <Text
              style={[
                isDark ? styles.buttonText : styles.buttonLightText,
                selectedPeriod === period && styles.selectedButtonText,
              ]}
            >
              {period}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[isDark ? styles.button : styles.buttonLight]}
          // onPress={() => handlePeriodChange(period)}
          // onPress={() => setActiveGraphTab("candle")}
          onPress={() => router.push(`/NewGraph?symbol=${symbol}`)}
        >
          <Image
            source={
              isDark
                ? require("../assets/icons/graph_new_icon_white.png")
                : require("../assets/icons/graph_new_icon_black.png")
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
    marginTop: 24,
    // backgroundColor: "#000000",
    borderRadius: 16,
    overflow: "hidden",
  },
  loadingContainer: {
    height: 350,
    justifyContent: "center",
    alignItems: "center",
  },
  graphContainer: {
    width: "100%",
    alignItems: "center",
    height: "auto",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#111111",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonLight: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedButton: {
    backgroundColor: "#53BA83",
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#CCCCCC",
  },
  buttonLightText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0B1B0C",
  },
  selectedButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  errorText: {
    color: "#FF4444",
    fontSize: 16,
  },
  tooltip: {
    position: "absolute",
    backgroundColor: "rgba(20, 20, 20, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333333",
    width: 160,
    top: 20,
  },
  tooltipText: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 18,
  },
});

export default OverViewLineGraph;

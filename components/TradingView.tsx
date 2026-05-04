import React from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import WebView from "react-native-webview";

interface TradingViewChartProps {
  symbol: string; // e.g. "PSX:MCB", "BINANCE:BTCUSDT", "NASDAQ:AAPL"
  interval?: string; // "1", "5", "15", "60", "D", "W", "M" ...
  theme?: "light" | "dark";
  height?: number | string; // optional – default 500
}

export default function TradingViewChart({
  symbol,
  interval = "60",
  theme = "dark",
  height = 500,
}: TradingViewChartProps) {
  // Use correct symbol (add PSX: if user passed plain "MCB")
  //   const finalSymbol = symbol;
  // const finalSymbol = symbol.includes(":")
  //   ? symbol
  //   : `PSX:${symbol.toUpperCase()}`;
  // Then use "${finalSymbol}" in the html template
  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
      html, body, #container {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
        overflow: hidden;
        background: ${theme === "dark" ? "#0e0e0e" : "#ffffff"};
      }
    </style>
  </head>
  <body>
    <div id="container"></div>

    <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
    <script type="text/javascript">
      try {
        new TradingView.widget({
          "width": "100%",
          "height": "100%",
          "symbol": "${symbol}",
          "interval": "${interval}",
          "timezone": "Etc/UTC+5",
          "theme": "${theme}",
          "style": "1",                    // 1 = candlestick
          "locale": "en",
          "enable_publishing": false,
          "allow_symbol_change": true,
          "container_id": "container",
          "hide_side_toolbar": false,
          "withdateranges": true,
          "save_image": false,
          "details": true,
          "studies_overrides": {
            "volume.volume.color.0": "${theme === "dark" ? "#26a69a" : "#26a69a"}",
            "volume.volume.color.1": "${theme === "dark" ? "#ef5350" : "#ef5350"}"
          }
        });
      } catch(e) {
        console.error("TradingView widget error:", e);
        document.body.innerHTML += "<h3 style='color:red;text-align:center;'>Chart failed to load</h3>";
      }
    </script>
  </body>
</html>
  `;

  return (
    <View
      style={[
        styles.container,
        { height: typeof height === "number" ? height : undefined },
      ]}
    >
      <WebView
        source={{ html }}
        style={{ flex: 1 }}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        androidLayerType="hardware"
        androidHardwareAccelerationDisabled={false}
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        // Helpful for debugging
        onError={(s) => {
          const { nativeEvent } = s;
          console.warn("WebView error:", nativeEvent);
        }}
        onHttpError={(s) => {
          const { nativeEvent } = s;
          console.warn(
            "WebView HTTP error:",
            nativeEvent.statusCode,
            nativeEvent.description,
          );
        }}
        onMessage={(event) => {
          console.log("WebView → RN:", event.nativeEvent.data);
        }}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: Dimensions.get("window").width,
    backgroundColor: "#000", // fallback
  },
});

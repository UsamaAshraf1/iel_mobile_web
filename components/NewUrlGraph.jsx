import React, { useEffect, useState } from "react";
import {
  Button,
  View,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  Text,
} from "react-native";
import { WebView } from "react-native-webview";

const NewUrlGraph = ({ symbol }) => {
  const [loading, setLoading] = useState(false);
  const [graphUrl, setGraphUrl] = useState(null);

  const ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeG1mYWFrdWZybXpjeGh0Z2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTQzMTIsImV4cCI6MjA3NTM5MDMxMn0.qtNn0qXNhn8ol8fTSb2Hp9nQkYfFA2Y_Zec4LuISPZQ";

  const openChartSameTab = (url) => {
    if (Platform.OS === "web") {
      window.location.href = url;
    }
  };

  const fetchGraphUrl = async (shouldOpenOnWeb = false) => {
    try {
      setLoading(true);

      const formData = {
        username: "rashid.irshad",
        password: "rashid123",
        ip: "1.1.1.1",
        client: "admin.iel",
        brokerUserCode: "J8y290WHt7Qf5o++SR54Aw==",
        isUserDemo: "0",
        symbol,
        page: "trading-view-iframe",
      };

      const body = new URLSearchParams(formData).toString();

      const response = await fetch(
        "https://bfxmfaakufrmzcxhtgfw.supabase.co/functions/v1/Graph_url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            Authorization: `Bearer ${ANON_KEY}`,
          },
          body,
        },
      );

      if (!response.ok) {
        throw new Error(`Proxy error: ${response.status}`);
      }

      const data = await response.json();

      if (!data?.link) {
        throw new Error("Invalid response from server");
      }

      setGraphUrl(data.link);

      if (Platform.OS === "web" && shouldOpenOnWeb) {
        openChartSameTab(data.link);
      }
    } catch (error) {
      console.error("Fetch failed:", error);
      Alert.alert("Error", "Unable to fetch chart URL");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setGraphUrl(null);
    fetchGraphUrl(false);
  }, [symbol]);

  if (loading && !graphUrl) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1A73E8" />
      </View>
    );
  }

  if (graphUrl && Platform.OS === "web") {
    return <View style={styles.container}>{openChartSameTab(graphUrl)}</View>;
  }

  if (graphUrl) {
    return (
      <WebView
        source={{ uri: graphUrl }}
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#1A73E8" />
          </View>
        )}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Button title="Load Chart" onPress={() => fetchGraphUrl(true)} />
    </View>
  );
};

export default NewUrlGraph;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 300,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  webview: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 14,
    marginBottom: 12,
    color: "#333",
    textAlign: "center",
  },
});

// import React, { useEffect, useState } from "react";
// import { Button, View, ActivityIndicator, Alert } from "react-native";
// import * as WebBrowser from "expo-web-browser";

// const NewUrlGraph = ({ symbol }) => {
//   const [loading, setLoading] = useState(false);
//   const [graphUrl, setGraphUrl] = useState(null);

//   const ANON_KEY =
//     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeG1mYWFrdWZybXpjeGh0Z2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTQzMTIsImV4cCI6MjA3NTM5MDMxMn0.qtNn0qXNhn8ol8fTSb2Hp9nQkYfFA2Y_Zec4LuISPZQ";

//   useEffect(() => {
//     WebBrowser.warmUpAsync();
//     return () => {
//       WebBrowser.coolDownAsync();
//     };
//   }, []);

//   const fetchGraphUrl = async () => {
//     try {
//       setLoading(true);

//       const formData = {
//         username: "rashid.irshad",
//         password: "rashid123",
//         ip: "1.1.1.1",
//         client: "admin.iel",
//         brokerUserCode: "J8y290WHt7Qf5o++SR54Aw==",
//         isUserDemo: "0",
//         symbol: symbol,
//         page: "advance-charting",
//       };

//       const body = new URLSearchParams(formData).toString();

//       const response = await fetch(
//         "https://bfxmfaakufrmzcxhtgfw.supabase.co/functions/v1/Graph_url",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
//             Authorization: `Bearer ${ANON_KEY}`,
//           },
//           body,
//         },
//       );

//       if (!response.ok) {
//         throw new Error(`Proxy error: ${response.status}`);
//       }

//       const data = await response.json();

//       console.log("Proxy response:", data);

//       // 👇 adjust based on your actual API structure
//       if (data?.link) {
//         setGraphUrl(data.link);
//         openLink(data.link); // auto open when ready
//       } else {
//         throw new Error("Invalid response from server");
//       }
//     } catch (error) {
//       console.error("Fetch failed:", error);
//       Alert.alert("Error", "Unable to fetch dashboard URL");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const openLink = async (url) => {
//     try {
//       await WebBrowser.openBrowserAsync(url, {
//         toolbarColor: "#1A73E8",
//         showTitle: true,
//         enableDefaultShareMenuItem: true,
//       });
//     } catch (error) {
//       Alert.alert("Error", "Unable to open dashboard");
//     }
//   };

//   useEffect(() => {
//     fetchGraphUrl();
//   }, []);

//   return (
//     <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//       {loading ? (
//         <ActivityIndicator size="large" color="#1A73E8" />
//       ) : (
//         <Button
//           title="Open Chart"
//           onPress={() => graphUrl && openLink(graphUrl)}
//           disabled={!graphUrl}
//         />
//       )}
//     </View>
//   );
// };

// export default NewUrlGraph;

import React, { useEffect, useState } from "react";
import {
  Button,
  View,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { WebView } from "react-native-webview";

const NewUrlGraph = ({ symbol }) => {
  const [loading, setLoading] = useState(false);
  const [graphUrl, setGraphUrl] = useState(null);

  const ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeG1mYWFrdWZybXpjeGh0Z2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTQzMTIsImV4cCI6MjA3NTM5MDMxMn0.qtNn0qXNhn8ol8fTSb2Hp9nQkYfFA2Y_Zec4LuISPZQ";

  const fetchGraphUrl = async () => {
    try {
      setLoading(true);

      const formData = {
        username: "rashid.irshad",
        password: "rashid123",
        ip: "1.1.1.1",
        client: "admin.iel",
        brokerUserCode: "J8y290WHt7Qf5o++SR54Aw==",
        isUserDemo: "0",
        symbol: symbol,
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
      console.log("Proxy response:", data);

      if (data?.link) {
        setGraphUrl(data.link); // ✅ show WebView in same screen
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Fetch failed:", error);
      Alert.alert("Error", "Unable to fetch dashboard URL");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphUrl();
  }, []);

  if (graphUrl) {
    return (
      <WebView
        source={{ uri: graphUrl }}
        style={{ flex: 1 }}
        // startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#1A73E8" />
          </View>
        )}
      />
    );
  }

  // Default loading / button screen
  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#1A73E8" />
      ) : (
        <Button title="Open Chart" onPress={fetchGraphUrl} />
      )}
    </View>
  );
};

export default NewUrlGraph;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

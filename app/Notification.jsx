import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../supabaseConfig";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useTheme } from "../hooks/ThemeContext";

// Helper: Convert ISO timestamp to relative time
const formatRelativeTime = (isoString) => {
  if (!isoString) return "";

  const now = new Date();
  const past = new Date(isoString);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return past.toLocaleDateString(); // fallback
};

export default function Notification() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();

  const router = useRouter();
  const [notificationData, setNotificationData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Format sent_at into relative time
      const formattedData = (data || []).map((item) => ({
        ...item,
        timeAgo: formatRelativeTime(item.created_at),
      }));

      setNotificationData(formattedData);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: "10%" }}
          >
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
              style={[
                styles.title,
                {
                  color: isDark ? "#E0E0E0" : "#0B1B0C",
                },
              ]}
            >
              Notification
            </Text>
          </View>
          <View style={{ width: 8 }} />
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.center}>
            <Text>Loading...</Text>
          </View>
        )}

        {/* Notifications List */}
        {!loading && notificationData.length === 0 && (
          <View style={styles.center}>
            <Image
              source={
                isDark
                  ? require("../assets/icons/notification_default.png")
                  : require("../assets/icons/light_notification_default.png")
              }
              style={{ width: 200, height: 200 }}
            />
            <Text
              style={{
                fontFamily: "SfRegular",
                fontWeight: "600",
                fontSize: 24,
                lineHeight: 34,
                color: isDark ? "#E0E0E0" : "#0B1B0C",
                textAlign: "center",
              }}
            >
              No Notifications Yet
            </Text>
            <Text
              style={{
                fontFamily: "SfRegular",
                fontWeight: "400",
                fontSize: 16,
                lineHeight: 24,
                color: "#8A8A8A",
                textAlign: "center",
                marginTop: 12,
              }}
            >
              You'll receive alerts for price changes, market news, and
              important updates about your investments here.
            </Text>
          </View>
        )}

        {!loading &&
          notificationData.map((item) => (
            <View
              key={item.id}
              style={[
                styles.notificationItem,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? "" : "#F5F5F5",
                },
              ]}
            >
              <Image
                source={require("../assets/icons/notification_img.png")}
                style={styles.icon}
              />
              <View style={styles.content}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      {
                        color: isDark ? "#E0E0E0" : "#0B1B0C",
                      },
                    ]}
                  >
                    {item.title}
                    {"          "}
                    <Text style={styles.timeAgo}>{item.timeAgo}</Text>{" "}
                  </Text>
                  {/* <Text style={styles.dot}>.</Text> */}
                  {/* <Text style={styles.timeAgo}>{item.timeAgo}</Text> */}
                </View>
                <Text
                  style={[
                    styles.body,
                    {
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    },
                  ]}
                >
                  {item.body}
                </Text>
              </View>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#fff",
    paddingTop: 50,
    marginHorizontal: 24,
    marginBottom: 100,
  },
  scrollView: {
    flex: 1,
    // backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  title: {
    fontFamily: "SfRegular",
    fontWeight: "600",
    fontSize: 24,
    textAlign: "center",
  },
  notificationItem: {
    flexDirection: "row",
    paddingVertical: 17,
  },
  icon: {
    width: 44,
    height: 44,
  },
  content: {
    marginLeft: 14,
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationTitle: {
    fontFamily: "SfRegular",
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 22,
  },
  dot: {
    marginLeft: 3,
    color: "#0B1B0C",
  },
  timeAgo: {
    fontFamily: "SfRegular",
    fontWeight: "400",
    fontSize: 14,
    lineHeight: 21,
    color: "#8A8A8A",
    marginLeft: 3,
  },
  body: {
    fontFamily: "SfRegular",
    fontWeight: "400",
    fontSize: 15,
    lineHeight: 21,

    marginTop: 2,
    textAlign: "start",
  },
  center: {
    paddingVertical: 40,
    alignItems: "center",
  },
});

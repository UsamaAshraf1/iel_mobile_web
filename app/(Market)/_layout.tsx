import { Tabs } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import { Platform, Image, StyleSheet, View, ActivityIndicator, Text } from "react-native";
import { useRouter } from "expo-router";

import TabBarBackground from "@/components/ui/TabBarBackground";
import { useColorScheme } from "@/hooks/useColorScheme";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";

import { StatusBar } from "expo-status-bar";
import { supabase } from "@/supabaseConfig";
import { useFocusEffect } from "@react-navigation/native";

import { ThemeProvider, useTheme } from "@/hooks/ThemeContext";

function TabsLayout() {
  const { isDark } = useTheme();
  const colorScheme = useColorScheme();

  const [initializing, setInitializing] = useState(false);
  const [user, setUser] = useState(null);
  const [profileuser, setprofileUser] = useState(null);

  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfileUser = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);

        if (error.code === "PGRST116") {
          await supabase.from("profiles").insert({ id: user.id });
          return fetchProfileUser();
        }
      } else {
        setprofileUser(data ?? null);
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchProfileUser();
      }
    }, [user?.id, fetchProfileUser])
  );

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: isDark ? "#121212" : "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#58BA83" />
        <Text style={{ marginTop: 10, color: isDark ? "#fff" : "#000" }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#53BA83",
          headerShown: false,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: { position: "absolute" },
            default: {},
          }),
        }}
      >
        <Tabs.Screen
          name="Market"
          options={{
            title: "Market",
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../assets/icons/market_new.png")}
                style={[
                  styles.icon,
                  { tintColor: focused ? "#53BA83" : "#999" },
                ]}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="WatchList"
          options={{
            title: "Watchlist",
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../assets/wishlist_icon.png")}
                style={[
                  styles.icon,
                  { tintColor: focused ? "#53BA83" : "#999" },
                ]}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="Portfolio"
          options={{
            title: "Portfolio",
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../assets/portfolio.png")}
                style={[
                  styles.icon,
                  { tintColor: focused ? "#53BA83" : "#999" },
                ]}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="More"
          options={{
            title: "More",
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../assets/icons/more_new.png")}
                style={[
                  styles.icon,
                  { tintColor: focused ? "#53BA83" : "#999" },
                ]}
              />
            ),
          }}
        />
      </Tabs>

      <StatusBar style={isDark ? "light" : "dark"} />
    </NavigationThemeProvider>
  );
}

export default function MarketLayout() {
  return (
      <TabsLayout />
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
});
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { useRouter, Stack } from "expo-router";
import { View, ActivityIndicator, Text } from "react-native";

import { StatusBar } from "expo-status-bar";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";

import { supabase } from "../../supabaseConfig";

import { ThemeProvider, useTheme } from "@/hooks/ThemeContext";

function AuthStack() {
  const { isDark } = useTheme();

    console.log("From Tabs Layout isDark", isDark)

  const [loaded] = useFonts({
    Outfit: require("../../assets/fonts/Outfit-VariableFont_wght.ttf"),
  });

  const [initializing, setInitializing] = useState(false);
  const [user, setUser] = useState(null);

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

  // Redirect if logged in
  useEffect(() => {
    if (!initializing && user) {
      router.replace("/Market");
    }
  }, [user, initializing]);

  if (!loaded || initializing) {
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

  if (user) return null;

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="forgot" options={{ headerShown: false }} />
        <Stack.Screen name="reset" options={{ headerShown: false }} />
        <Stack.Screen name="message" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboardingnewData"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>

      <StatusBar style={isDark ? "light" : "dark"} />
    </NavigationThemeProvider>
  );
}

export default function TabLayout() {
  return (
      <AuthStack />
  );
}
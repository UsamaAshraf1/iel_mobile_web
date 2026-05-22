import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { ThemeProvider, useTheme } from "@/hooks/ThemeContext";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";

import { useColorScheme } from "@/hooks/useColorScheme";
import { supabase } from "@/supabaseConfig";
import { ActivityIndicator, View, Text, Alert, Appearance } from "react-native";

import { Platform, PermissionsAndroid } from "react-native";
import * as Device from "expo-device";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedView } from "@/components/ThemedView";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function AuthStack() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const router = useRouter();

  const [themeKey, setThemeKey] = useState(0);
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [loaded] = useFonts({
    Outfit: require("../assets/fonts/Outfit-VariableFont_wght.ttf"),
    OutfitBold: require("../assets/fonts/OutfitBold.ttf"),
    OutfitMedium: require("../assets/fonts/OutfitMedium.ttf"),
    OutfitSemiBold: require("../assets/fonts/OutfitSemiBold.ttf"),
    OutfitRegular: require("../assets/fonts/OutfitRegular.ttf"),
    OutfitLight: require("../assets/fonts/OutfitLight.ttf"),
    SfRegular: require("../assets/new_font/sf_regular.otf"),
    sfMedium: require("../assets/new_font/sf_medium.otf"),
    sfLight: require("../assets/new_font/sf_light.otf"),
  });

  /* ------------------------------------------------------------- */
  /* DEVICE ID (Persistent) */
  /* ------------------------------------------------------------- */

  async function getDeviceId() {
    let deviceId = await AsyncStorage.getItem("DEVICE_ID");

    if (!deviceId) {
      if (Platform.OS === "android") {
        deviceId = Application.androidId;
      } else {
        deviceId = await Application.getIosIdForVendorAsync();
      }

      if (!deviceId) {
        deviceId = `${Device.manufacturer}-${Device.modelName}`;
      }

      await AsyncStorage.setItem("DEVICE_ID", deviceId || "");
    }

    return deviceId;
  }

  /* ------------------------------------------------------------- */
  /* SAVE TOKEN TO SUPABASE */
  /* ------------------------------------------------------------- */

  async function saveTokensToSupabase(deviceId: string, token: string) {
    if (!token || !deviceId) return;

    try {
      const { data } = await supabase
        .from("devices")
        .select("fcm_token")
        .eq("device_id", deviceId)
        .single();

      if (data?.fcm_token !== token) {
        const { error } = await supabase.from("devices").upsert(
          {
            device_id: deviceId,
            fcm_token: token,
            platform: Platform.OS,
          },
          { onConflict: "device_id" },
        );

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error saving token:", error);
    }
  }

  /* ------------------------------------------------------------- */
  /* REGISTER PUSH NOTIFICATIONS */
  /* ------------------------------------------------------------- */

  async function registerForPushNotificationsAsync() {
    let pushToken: string | null = null;

    if (Platform.OS === "android") {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("Permission denied for notifications");
          return null;
        }
      }

      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    if (!Device.isDevice) {
      Alert.alert("Push notifications require a physical device");
      return null;
    }

    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;

    if (status !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert("Notification permission not granted");
      return null;
    }

    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      pushToken = deviceToken.data;
    } catch (error) {
      console.error("Push token error:", error);
    }

    return pushToken;
  }

  /* ------------------------------------------------------------- */
  /* INIT PUSH NOTIFICATIONS */
  /* ------------------------------------------------------------- */

  useEffect(() => {
    async function initPush() {
      try {
        const token = await registerForPushNotificationsAsync();

        if (!token) return;

        const deviceId = await getDeviceId();

        await saveTokensToSupabase(deviceId, token);
      } catch (error) {
        console.error("Push init error:", error);
      }
    }

    initPush();
  }, []);

  /* ------------------------------------------------------------- */
  /* HANDLE NOTIFICATION TAP */
  /* ------------------------------------------------------------- */

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const url = response.notification.request.content.data?.url;

        if (url) {
          router.push(url);
        } else {
          router.push("/Market");
        }
      },
    );

    return () => subscription.remove();
  }, []);

  /* ------------------------------------------------------------- */
  /* AUTH SESSION */
  /* ------------------------------------------------------------- */

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

  /* ------------------------------------------------------------- */
  /* THEME CHANGE */
  /* ------------------------------------------------------------- */

  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      setTimeout(() => {
        setThemeKey((prev) => prev + 1);
      }, 100);
    });

    return () => subscription.remove();
  }, []);

  /* ------------------------------------------------------------- */
  /* LOADING SCREEN */
  /* ------------------------------------------------------------- */

  if (!loaded || initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#58BA83" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  /* ------------------------------------------------------------- */
  /* APP NAVIGATION */
  /* ------------------------------------------------------------- */

  return (
    <NavigationThemeProvider
      value={isDark ? DarkTheme : DefaultTheme}

      // key={themeKey}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          width: "100%",
          maxWidth: 460,
          alignSelf: "center",
        }}
      >
        <Stack screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <Stack.Screen name="(Market)" />
              <Stack.Screen name="AccountDetail" />
              <Stack.Screen name="Privacy" />
              <Stack.Screen name="Terms" />
              <Stack.Screen name="Help" />
              <Stack.Screen name="Search" />
              <Stack.Screen name="StockDetail" />
              <Stack.Screen name="Form" />
              <Stack.Screen name="SupabasePage" />
              <Stack.Screen name="Stockbuy" />
              <Stack.Screen name="ReviewOrder" />
              <Stack.Screen name="OrderPlacement" />
              <Stack.Screen name="Notification" />
              <Stack.Screen name="openAccount" />
              <Stack.Screen name="OrderProcessing" />
              <Stack.Screen name="ClientForm" />
              <Stack.Screen name="ClientResetForm" />
              <Stack.Screen name="Reports" />
              <Stack.Screen name="Trading" />
              <Stack.Screen name="NewGraph" />
              <Stack.Screen name="RaastId" />
              <Stack.Screen name="Onetimepass" />
            </>
          ) : (
            <>
              <Stack.Screen name="(tabs)" />
            </>
          )}

          <Stack.Screen name="+not-found" />
        </Stack>
      </View>
      <StatusBar style={isDark ? "light" : "dark"} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    // ← add return
    <ThemeProvider>
      <AuthStack />
    </ThemeProvider>
  );
}

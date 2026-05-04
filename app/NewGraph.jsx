import React, { useEffect } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import NewUrlGraph from "../components/NewUrlGraph";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function NewGraph() {
  const { symbol } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Lock the screen to landscape
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE
    );

    // Unlock orientation on unmount
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <View style={{ paddingTop: 20, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: "100%" }}>
          <Image
            source={require("../assets/icons/back_icon.png")}
            style={{ width: 12, height: 16 }}
          />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        <NewUrlGraph symbol={symbol} />
      </View>
    </View>
  );
}
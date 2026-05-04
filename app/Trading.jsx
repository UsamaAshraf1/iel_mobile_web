import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  ActivityIndicator,
  AppState,
  ImageBackground,
  Modal,
  RefreshControl,
} from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";
import TradingViewChart from "../components/TradingView";
import { useRouter } from "expo-router";
import { useTheme } from "../hooks/ThemeContext";

export default function Trading() {
  const colorScheme = useColorScheme();
  const { isDark } = useTheme();
  const router = useRouter();

  return (
    <View
      style={[
        styles.scrollView,
        {
          backgroundColor: isDark ? "" : "#fff",
        },
      ]}
    >
      <ScrollView
        style={[
          styles.scrollView,
          {
            backgroundColor: isDark ? "" : "#fff",
            marginTop: 50,
          },
        ]}
        accessibilityElementsHidden={false}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            justifyContent: "space-between",
            paddingHorizontal: 24,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Image
              source={
                isDark
                  ? require("../assets/icons/white_back_icon.png")
                  : require("../assets/icons/back_icon.png")
              }
              style={{ width: 8, height: 12 }}
            />
          </TouchableOpacity>
          {/* <View style={{ flex: 1, alignItems: "center" }}> */}
          <Text
            style={{
              fontFamily: "SfRegular",
              fontWeight: "600",
              fontSize: 24,
              color: isDark ? "#FFFFFF" : "#0B1B0C",
              textAlign: "center",
              marginLeft: 20,
            }}
          >
            Trading View
          </Text>
          {/* </View> */}
          <TouchableOpacity>
            {/* <Image
              source={require("../assets/icons/new_notification.png")}
              style={{ width: 44, height: 44 }}
            /> */}
          </TouchableOpacity>
        </View>
        {/* New If User have Account */}
        <View style={{ width: "100%", overflow: "hidden" }}>
          <TradingViewChart
            symbol="MCB"
            interval="60"
            theme="dark"
            height={600}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    // backgroundColor: "#fff",
    minHeight: "100vh",
    // marginBottom: 200,
    paddingTop: 30,
  },
  scrollView: {
    flex: 1,
  },
});

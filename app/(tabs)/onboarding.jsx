// App.jsx
import React from "react";
import {
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { ICarouselInstance } from "react-native-reanimated-carousel";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DATA = [
  {
    title: "Build Your ",
    Newtitle: "Wealth",
    subtitle:
      "Start investing with tools designed to \n grow your financial future.",
    image: require("../../assets/icons/new_slider_1.png"),
  },
  {
    title: "Smart Insights,",
    Newtitle: " Decisions",
    subtitle:
      "Access real-time market trends and \n expert guidance whenever you need.",
    image: require("../../assets/icons/new_slider_2.png"),
  },
  {
    title: "Track & Grow ",
    Newtitle: "Seamlessly",
    subtitle:
      "Monitor your portfolio and stay on top \n of your gains anytime.",
    image: require("../../assets/icons/new_slider_3.png"),
  },
];

const CarouselItem = React.memo(({ item, index, progressValue, onSkip }) => {
  const PaginationDot = ({ dotIndex }) => {
    const animatedStyle = useAnimatedStyle(() => {
      const width = interpolate(
        progressValue.value,
        [dotIndex - 1, dotIndex, dotIndex + 1],
        [8, 24, 8],
        Extrapolation.CLAMP,
      );
      const opacity = interpolate(
        progressValue.value,
        [dotIndex - 1, dotIndex, dotIndex + 1],
        [0.5, 1, 0.5],
        Extrapolation.CLAMP,
      );
      return { width, opacity };
    });

    return <Animated.View style={[styles.dot, animatedStyle]} />;
  };

  return (
    <View style={styles.page}>
      {/* <Text style={styles.skipText}>Skip</Text> */}
      <TouchableOpacity
        onPress={onSkip}
        activeOpacity={0.7}
        style={{ alignSelf: "flex-end", padding: 16 }}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.Newtitle}>{item.Newtitle}</Text>
        </View>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>

      <Image source={item.image} style={styles.image} resizeMode="contain" />

      <View style={styles.bottomContainer}>
        <View style={styles.pagination}>
          {DATA.map((_, i) => (
            <PaginationDot key={i} dotIndex={i} />
          ))}
        </View>
      </View>
    </View>
  );
});

export default function OnboardingCarousel() {
  const { email, password } = useLocalSearchParams();
  const progressValue = useSharedValue(0);
  const { height } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const carouselRef = React.useRef(null);
  const handleGetStarted = () => {
    router.push({
      pathname: "/onboardingnewData",
      params: { email, password },
    });
  };
  const handleSkip = () => {
    if (currentIndex < DATA.length - 1) {
      // Not last → go to next slide
      carouselRef.current?.next();
    } else {
      handleGetStarted();
    }
  };

  const renderItem = React.useCallback(
    ({ item, index }) => {
      return (
        <CarouselItem
          item={item}
          index={index}
          progressValue={progressValue}
          onSkip={handleSkip}
        />
      );
    },
    [progressValue],
  );

  return (
    <>
      {/* <StatusBar barStyle="light-content" backgroundColor="#000" /> */}

      {/* <LinearGradient
        colors={["#0F2027", "#203A43", "#2C5364"]}
        style={StyleSheet.absoluteFillObject}
      /> */}

      <View style={styles.container}>
        <Carousel
          ref={carouselRef}
          width={SCREEN_WIDTH}
          height={height}
          data={DATA}
          loop={false}
          pagingEnabled
          onProgressChange={(_, absoluteProgress) => {
            progressValue.value = absoluteProgress;
          }}
          onSnapToItem={(index) => setCurrentIndex(index)}
          renderItem={renderItem}
        />

        <View style={styles.buttonContainer}>
          <Text
            style={{
              paddingBottom: 10,
              color: "#8B8B8B",
              fontFamily: "SfRegular",
              fontWeight: "400",
              fontSize: 16,
            }}
          >
            Already a user?{" "}
            <Text
              onPress={() => router.push("/login")}
              style={{ textDecorationLine: "underline" }}
            >
              Sign in
            </Text>
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0C1B17", height: "120vh" },
  page: {
    flex: 1,
    // justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 50,
    backgroundColor: "#0C1B17",
    height: "100vh",
  },
  image: { width: "100%", height: "50%", marginTop: 20 },

  title: {
    fontFamily: "SfRegular",
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  Newtitle: {
    fontFamily: "SfRegular",
    fontSize: 24,
    fontWeight: "700",
    color: "#53BA83",
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "SfRegular",
    fontSize: 16,
    color: "#C8C8C8",
    fontWeight: "400",
    marginTop: 16,
    // lineHeight: 24,
    textAlign: "center",
  },
  bottomContainer: { width: "100%" },
  skipText: {
    color: "#B0BEC5",
    fontSize: 16,
    textAlign: "right",
    marginBottom: 20,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
    gap: 10,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#53BA83",
  },
  button: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#53BA83",
    borderRadius: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: "center",

    marginHorizontal: 24,
  },
});

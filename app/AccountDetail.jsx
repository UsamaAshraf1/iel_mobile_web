import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker"; // Added
import { supabase } from "../supabaseConfig";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
// import { File } from "expo-file-system";
import Toast from "react-native-toast-message";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useFocusEffect } from "@react-navigation/native";
import { useToastConfig } from "../Services/toastConfig";
import { useTheme } from "../hooks/ThemeContext";

const { width: screenWidth } = Dimensions.get("window");

// const uriToBlob = async (uri, asset) => {
//   if (Platform.OS === "web") {
//     // Web: Fetch as usual
//     const resp = await fetch(uri);
//     return await resp.blob();
//   }

//   try {
//     const file = new File(uri);
//     return file; // Return the File object (acts as Blob)
//   } catch (error) {
//     console.error("uriToBlob error:", error);
//     throw error;
//   }
// };
const uriToBlob = async (uri, asset) => {
  if (Platform.OS === "web") {
    const resp = await fetch(uri);
    return await resp.blob();
  }

  try {
    // For mobile: Read file bytes and create Blob
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error("File does not exist at URI: " + uri);
    }

    const fileBytes = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const byteArray = Uint8Array.from(atob(fileBytes), (c) => c.charCodeAt(0));

    const fileName = asset?.fileName || `image_${Date.now()}.jpg`;
    const mimeType = asset?.mimeType || "image/jpeg";

    // Create Blob from bytes (acts like File for upload)
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], fileName, { type: mimeType });
  } catch (error) {
    console.error("uriToBlob error:", error);
    throw error;
  }
};
export default function AccountDetail() {
  const colorScheme = useColorScheme();
    const { isDark } = useTheme();
  
  const toastConfig = useToastConfig();

  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setemail] = useState("");
  const [phone, setphone] = useState("");
  const [dob, setDob] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(""); // Added
  const [uploading, setUploading] = useState(false); // Added

  const [modalVisible, setModalVisible] = useState(false);
  const [emailmodalVisible, setemailModalVisible] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [dobModalVisible, setDobModalVisible] = useState(false);
  const [PassModalVisible, setPassModalVisible] = useState(false);
  const [PasswordModalVisible, setPasswordModalVisible] = useState(false);

  const [tempName, setTempName] = useState(name);
  const [tempEmail, setTempEmail] = useState(email);
  const [tempPhone, setTempPhone] = useState(phone);
  const [tempDob, setTempDob] = useState(dob);
  const [oldpass, setoldpass] = useState("");
  const [newpass, setnewpass] = useState("");
  const [renewpass, setrenewpass] = useState("");

  const [user, setUser] = useState(null);
  const [profileUser, setprofileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [ClientData, setClientData] = useState([]);

  // Request permission on mount

  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return "";

    // Try parsing common formats from Supabase / user_metadata
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // 2023-05-15
      /^\d{4}-\d{2}-\d{2}T/, // 2023-05-15T...
      /^\d{2}\/\d{2}\/\d{4}$/, // 15/05/2023
      /^\d{2}-\d{2}-\d{4}$/, // 15-05-2023 or 05-15-2023
    ];

    let date;

    // First try: if it's already in DD/MM/YYYY → just return
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return dateStr;
    }

    // Try parsing as ISO (most common from Supabase)
    date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Fallback: try manual parsing for DD-MM-YYYY or MM-DD-YYYY
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      // Try DD-MM-YYYY
      let [day, month, year] = parts.map(Number);
      if (day > 12 && month <= 12) {
        // Looks like DD-MM-YYYY
        return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
      }
      // Try MM-DD-YYYY
      [month, day, year] = parts.map(Number);
      if (month <= 12 && day <= 31) {
        return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
      }
    }

    // If we can't parse → return original or empty
    return "";
  };
  console.log(dob);
  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate;
    setDatePickerVisibility(Platform.OS === "ios");

    if (currentDate) {
      // setDobDate(currentDate);
      setTempDob(currentDate.toLocaleDateString("en-GB")); // DD/MM/YYYY
    }
  };
  useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Please allow access to your photo library.",
        );
      }
    })();
  }, []);

  // const pickImage = async () => {
  //   let result = await ImagePicker.launchImageLibraryAsync({
  //     mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //     allowsEditing: true,
  //     aspect: [1, 1],
  //     quality: 0.7,
  //   });

  //   if (!result.canceled) {
  //     await uploadImage(result.assets[0].uri);
  //   }
  // };

  // const uploadImage = async (uri) => {
  //   if (!user?.id) {
  //     Alert.alert("Error", "User not found. Please log in again.");
  //     return;
  //   }

  //   try {
  //     setUploading(true);

  //     const response = await fetch(uri);
  //     const blob = await response.blob();
  //     const fileExt = uri
  //       .split(".")
  //       .pop()
  //       .split(/[\?\#]/)[0];
  //     const fileName = `${Date.now()}.${fileExt}`;
  //     const filePath = `public/${user.id}/${fileName}`;

  //     const { error: uploadError } = await supabase.storage
  //       .from("Avatar")
  //       .upload(filePath, blob, {
  //         cacheControl: "3600",
  //         upsert: true,
  //         contentType: blob.type || "image/jpeg",
  //       });

  //     if (uploadError) throw uploadError;

  //     const { data: urlData } = supabase.storage
  //       .from("Avatar")
  //       .getPublicUrl(filePath);

  //     const publicUrl = urlData.publicUrl;

  //     const { error: updateError } = await supabase.auth.updateUser({
  //       data: { avatar_url: publicUrl },
  //     });

  //     if (updateError) throw updateError;

  //     setAvatarUrl(publicUrl);
  //     // Alert.alert("Success", "Profile picture updated!");
  //   } catch (err) {
  //     Alert.alert("Upload Failed", err.message || "Please try again.");
  //   } finally {
  //     setUploading(false);
  //   }
  // };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [1, 1],
      quality: 0.8,
      base64: true, // ← CRITICAL: Enables Base64 encoding
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      // Pass both URI (for preview) and base64 (for upload)
      await uploadImage(asset.uri, asset);
    }
  };

  const uploadImage = async (uri, asset) => {
    if (!user?.id) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    try {
      setUploading(true);

      // Get Base64 from asset (from ImagePicker with base64: true)
      const base64 = asset.base64;
      if (!base64) {
        throw new Error("Base64 data not available. Try picking again.");
      }

      // Decode Base64 to ArrayBuffer (Supabase-compatible binary data)
      const arrayBuffer = decode(base64);

      // Determine file extension and name
      let fileExt = "jpg";
      if (asset?.fileName) {
        const parts = asset.fileName.split(".");
        if (parts.length > 1) fileExt = parts.pop().toLowerCase();
      } else if (uri.includes(".")) {
        const parts = uri.split(".");
        fileExt = parts.pop().split(/[\?#]/)[0].toLowerCase();
      }

      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `public/${user.id}/${fileName}`;

      // Upload ArrayBuffer directly (fixes blank/0-byte issue)
      const { error: uploadError } = await supabase.storage
        .from("Avatar")
        .upload(filePath, arrayBuffer, {
          cacheControl: "3600",
          upsert: true,
          contentType: asset.mimeType || `image/${fileExt}`, // Accurate MIME type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("Avatar")
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      Alert.alert("Success", "Profile picture updated!");
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Upload Failed", err.message || "Please try again.");
    } finally {
      setUploading(false);
    }
  };
  // const uploadImage = async (uri, asset) => {
  //   if (!user?.id) {
  //     Alert.alert("Error", "User not found. Please log in again.");
  //     return;
  //   }

  //   try {
  //     setUploading(true);

  //     // 1. Get a real Blob (mobile = manual, web = fetch)
  //     const fileBlob = await uriToBlob(uri, asset);

  //     // 2. Determine extension + content-type
  //     let fileExt = "jpg";
  //     let contentType = "image/jpeg";

  //     if (asset.fileName) {
  //       const parts = asset.fileName.split(".");
  //       if (parts.length > 1) fileExt = parts.pop().toLowerCase();
  //     } else if (uri.includes(".")) {
  //       const parts = uri.split(".");
  //       fileExt = parts
  //         .pop()
  //         .split(/[\?\#]/)[0]
  //         .toLowerCase();
  //     }
  //     contentType =
  //       asset.mimeType ?? `image/${fileExt === "png" ? "png" : "jpeg"}`;

  //     // 3. Upload to Supabase
  //     const fileName = `${Date.now()}.${fileExt}`;
  //     const filePath = `public/${user.id}/${fileName}`;

  //     const { error: uploadError } = await supabase.storage
  //       .from("Avatar")
  //       .upload(filePath, fileBlob, {
  //         cacheControl: "3600",
  //         upsert: true,
  //         contentType,
  //       });

  //     if (uploadError) throw uploadError;

  //     // 4. Get public URL
  //     const { data: urlData } = supabase.storage
  //       .from("Avatar")
  //       .getPublicUrl(filePath);
  //     const publicUrl = urlData.publicUrl;

  //     // 5. Save URL in user_metadata
  //     const { error: updateError } = await supabase.auth.updateUser({
  //       data: { avatar_url: publicUrl },
  //     });
  //     if (updateError) throw updateError;

  //     setAvatarUrl(publicUrl);
  //     Alert.alert("Success", "Profile picture updated!");
  //   } catch (err) {
  //     console.error("Upload error:", err);
  //     Alert.alert("Upload Failed", err.message || "Please try again.");
  //   } finally {
  //     setUploading(false);
  //   }
  // };
  const handleEditName = () => {
    setTempName(name);
    setModalVisible(true);
  };

  const handleEditBrokeragePassword = () => {
    setPasswordModalVisible(true);
  };
  const handleCancelBrokeragePassword = () => {
    setPasswordModalVisible(false);
  };
  const handleYesBrokeragePassword = () => {
    setPasswordModalVisible(false);
    router.push("/ClientResetForm");
  };

  const handleEditPhone = () => {
    setTempPhone(phone);
    setPhoneModalVisible(true);
  };

  const handleEditDob = () => {
    setTempDob(dob);
    setDobModalVisible(true);
  };

  const handleEditEmail = () => {
    setTempEmail(email);
    setemailModalVisible(true);
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({
        data: { first_name: tempName },
      });
      if (error) throw error;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: tempName })
        .eq("id", user.id);

      if (profileError) {
        console.error("Profile table update failed:", profileError);
        // You can decide whether to show error or silently continue
        // For now we continue (auth is more critical)
      }
      setName(tempName);
      // Alert.alert("Success", "Name updated successfully!");
      Toast.show({
        type: "success",
        text1: "User Update",
        text2: "Name Update Successfully",
      });
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setModalVisible(false);
    }
  };

  const handleSavePhone = async () => {
    if (!tempPhone.trim()) {
      Alert.alert("Error", "Phone number cannot be empty.");
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({
        data: { phone_number: tempPhone },
      });
      if (error) throw error;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ phone_number: tempPhone })
        .eq("id", user.id);

      if (profileError) {
        console.error("Profile table update failed:", profileError);
        // You can decide whether to show error or silently continue
        // For now we continue (auth is more critical)
      }
      setphone(tempPhone);
      // Alert.alert("Success", "Phone number updated successfully!");
      Toast.show({
        type: "success",
        text1: "User Update",
        text2: "Phone Update Successfully",
      });
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setPhoneModalVisible(false);
    }
  };

  const handleSaveDob = async () => {
    if (!tempDob.trim()) {
      Alert.alert("Error", "Date of birth cannot be empty.");
      return;
    }
    // const dobRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
    // if (!dobRegex.test(tempDob)) {
    //   Alert.alert("Error", "Please enter date of birth in DD-MM-YYYY format.");
    //   return;
    // }
    try {
      const { error } = await supabase.auth.updateUser({
        data: { date_of_birth: tempDob },
      });
      if (error) throw error;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ date_of_birth: tempDob })
        .eq("id", user.id);

      if (profileError) {
        console.error("Profile table update failed:", profileError);
        // You can decide whether to show error or silently continue
        // For now we continue (auth is more critical)
      }
      setDob(tempDob);
      // Alert.alert("Success", "Date of birth updated successfully!");
      Toast.show({
        type: "success",
        text1: "User Update",
        text2: "DOB Update Successfully",
      });
    } catch (err) {
      // Alert.alert("Error", err.message);
    } finally {
      setDobModalVisible(false);
    }
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleCancelPhone = () => {
    setPhoneModalVisible(false);
  };

  const handleCancelDob = () => {
    setDobModalVisible(false);
  };

  const handleSaveEmail = async () => {
    if (!tempEmail.trim()) {
      Alert.alert("Error", "Email cannot be empty.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tempEmail)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({
        email: tempEmail,
      });
      if (error) throw error;
      setemail(tempEmail);
      Alert.alert(
        "Success",
        "Email update requested. Please check your inbox for a confirmation link.",
      );
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setemailModalVisible(false);
    }
  };

  const handleCancelEmailModal = () => {
    setemailModalVisible(false);
  };

  const handleSavePassword = async () => {
    if (!oldpass.trim() || !newpass.trim() || !renewpass.trim()) {
      Alert.alert("Error", "All password fields are required.");
      return;
    }
    if (newpass !== renewpass) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }
    if (newpass.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters long.");
      return;
    }
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email,
        password: oldpass,
      });
      if (verifyError) {
        Alert.alert("Error", "Invalid old password.");
        return;
      }
      const { error } = await supabase.auth.updateUser({
        password: newpass,
      });
      if (error) throw error;
      // Alert.alert("Success", "Password updated successfully!");
      await supabase.auth.signOut();
      router.push("/login");
      setoldpass("");
      setnewpass("");
      setrenewpass("");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setPassModalVisible(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;

      setUser(user);
      setName(user?.user_metadata?.first_name || "");
      setemail(user?.email || "");
      setphone(user?.user_metadata?.phone_number || "");
      const rawDob = user?.user_metadata?.date_of_birth || "";
      const formattedDob = formatDateToDDMMYYYY(rawDob);
      console.log("Formatted DOB:", formattedDob);
      setDob(formattedDob);
      setAvatarUrl(user?.user_metadata?.first_name || ""); // Load avatar
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientCode = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("ClientCode")
        .select("*")
        .eq("userId", user?.id)
        .maybeSingle();
      console.log(data);
      setClientData(data);
    } catch (err) {
      console.error("Fetch Client Code error:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchClientCode();
    }
  }, [user?.id]);

  const fetchProfileUser = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*") // Explicitly select all fields to ensure "all data"
        .eq("id", user?.id)
        .maybeSingle(); // Use .maybeSingle() instead of .single() – returns data=null on zero rows, no error

      if (error) {
        console.error("Error fetching profile:", error);
        // Optionally: Create a default profile if not found
        if (error.code === "PGRST116") {
          await supabase
            .from("profiles")
            .insert({ id: userId /* default fields */ });
          // Retry fetch
          return fetchProfileUser();
        }
      } else {
        setprofileUser(data ?? null); // Fallback to null if missing
        console.log("Profile fetched:", data);
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
    }, [user?.id, fetchProfileUser]), // ← dependencies here
  );

  const formatStatus = (status) => {
    if (!status) return "";

    // Replace underscores with spaces and convert to title case
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };
  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? "" : "#fff",
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color="#58BA83"
          style={{ flex: 1, justifyContent: "center" }}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? "" : "#fff",
          },
        ]}
      >
        <Text>Error: {error}</Text>
      </View>
    );
  }

  const parseDateString = (dateStr) => {
  if (!dateStr) return null;

  // Expected format: DD/MM/YYYY
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JS months are 0-based
  const year = parseInt(parts[2], 10);

  const date = new Date(year, month, day);

  // Validate the date is real (handles invalid like 31/02/2023)
  if (
    isNaN(date.getTime()) ||
    date.getDate() !== day ||
    date.getMonth() !== month ||
    date.getFullYear() !== year
  ) {
    return null;
  }

  return date;
};

  const today = new Date();
  const eighteenYearsAgo = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate(),
  );

  return (
    <>
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
          <View
            style={{
              paddingHorizontal: 24,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <TouchableOpacity onPress={() => router.back()}>
              {isDark ? (
                <Image
                  source={
                    isDark
                      ? require("../assets/white_back_icon.png")
                      : require("../assets/move_backward.png")
                  }
                  style={{
                    width: 8,
                    height: 14,
                    marginRight: 2,
                    marginTop: 1,
                  }}
                />
              ) : (
                <Image
                  source={require("../assets/move_backward.png")}
                  style={{
                    width: 24,
                    height: 24,
                    marginRight: 2,
                    marginTop: 1,
                  }}
                />
              )}
            </TouchableOpacity>
            <Text
              style={[
                styles.headerTitle,
                { color: isDark ? "#E0E0E0" : "#0B1B0C" },
              ]}
            >
              Account Detail
            </Text>
            <View />
          </View>

          {/* Avatar Section */}
          <View
            style={{
              marginTop: 30,
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* <TouchableOpacity onPress={pickImage} disabled={uploading}> */}
            <View style={{ position: "relative" }}>
              {uploading ? (
                <View
                  style={{
                    width: 100,
                    height: 100,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <ActivityIndicator size="small" color="#58BA83" />
                </View>
              ) : avatarUrl ? (
                <>
                  {/* <Image
                      source={{ uri: avatarUrl }}
                      style={{ width: 100, height: 100, borderRadius: 50 }}
                      resizeMode="cover"
                    /> */}
                  <View
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: "100%",
                      backgroundColor: "#D9E7FF",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#1B58C1",
                        fontSize: 32,
                        fontWeight: "500",
                        letterSpacing: 0.5,
                      }}
                    >
                      {/* {avatarUrl} */}
                      {getInitials(avatarUrl)}
                    </Text>
                  </View>
                </>
              ) : (
                <Image
                  source={require("../assets/default_avatar.png")}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                />
              )}
              {/* Camera Icon Overlay */}
              {/* <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
               
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: "#fff",
                  }}
                >
                  <Image
                    source={require("../assets/icons/camera_icon.jpg")} // Add this icon
                    style={{ width: 18, height: 18 }}
                  />
                </View> */}
            </View>
            {/* </TouchableOpacity> */}

            <Text
              style={{
                fontSize: 22,
                fontWeight: "600",
                fontFamily: "SfRegular",
                // color: "#0B1B0C",
                color: isDark ? "#E0E0E0" : "#0B1B0C",
                marginTop: 16,
              }}
            >
              {name}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "400",
                fontFamily: "SfRegular",
                color: "#8A8A8A",
                marginTop: 5,
              }}
            >
              {/* Client Code: {user?.id ? ClientData?.cliendCode : ""} */}
              {ClientData?.cliendCode ? `Client Code: ` : "ID: "}
              {ClientData?.cliendCode ? ClientData?.cliendCode : user?.id}
            </Text>
          </View>

          {/* Account Info Cards */}
          <View
            style={{
              marginHorizontal: 24,
              marginTop: 24,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                padding: 15,
                borderWidth: 1,
                borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
                borderRadius: 12,
                width: 100,
                height: 85,
                backgroundColor: isDark ? "#222222" : "",
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  color: "#8A8A8A",
                  lineHeight: 15,
                }}
              >
                Account {"\n"} Status
              </Text>
              <Text
                style={{
                  marginTop: 7,
                  fontSize: 13,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  color: "#3FB950",
                  lineHeight: 20,
                }}
              >
                Active
              </Text>
            </View>
            <View
              style={{
                padding: 15,
                borderWidth: 1,
                borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
                borderRadius: 12,
                width: 100,
                height: 85,
                backgroundColor: isDark ? "#222222" : "",
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  color: "#8A8A8A",
                  lineHeight: 15,
                }}
              >
                Member {"\n"}Since
              </Text>
              <Text
                style={{
                  marginTop: 7,
                  fontSize: 13,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  color: "#3FB950",
                  lineHeight: 20,
                }}
              >
                {/* Jan 2023 */}
                {/* {user?.created_at} */}
                {user?.created_at && (
                  <Text>
                    {new Date(user.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                )}
              </Text>
            </View>
            <View
              style={{
                padding: 15,
                borderWidth: 1,
                borderColor: isDark ? "#FFFFFF14" : "#E8E8E8",
                borderRadius: 12,
                width: 100,
                height: 85,
                backgroundColor: isDark ? "#222222" : "",
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  color: "#8A8A8A",
                  lineHeight: 15,
                }}
              >
                Account {"\n"}Type
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  color: "#FFA500",
                  lineHeight: 16,
                }}
                numberOfLines={2}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.2}
              >
                {/* {profileUser?.status || ""} */}
                {profileUser?.status ? formatStatus(profileUser.status) : ""}
              </Text>
            </View>
          </View>

          {/* Personal Information */}
          <View
            style={{
              marginHorizontal: 24,
              marginTop: 24,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 4,
                height: 4,
                backgroundColor: "#53BA83",
                borderRadius: 100,
              }}
            />
            <Text
              style={{
                textTransform: "uppercase",
                marginLeft: 4,
                fontFamily: "SfRegular",
                fontWeight: "600",
                fontSize: 12,
                lineHeight: 18,
                color: "#8A8A8A",
              }}
            >
              Personal Information
            </Text>
          </View>

          {/* Info List */}
          <View
            style={{
              borderWidth: 1,
              borderColor: isDark ? "" : "#FFFFFF",
              marginHorizontal: 24,
              marginTop: 27,
              // backgroundColor: "white",
            }}
          >
            {/* Name */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isDark ? "#FFFFFF14" : "#E6E6E6",
                padding: 17,
                borderRadius: 14,
                backgroundColor: isDark ? "#222222" : "",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={require("../assets/icons/user_icon.png")}
                  style={{ width: 38, height: 38 }}
                />
                <View style={{ marginLeft: 14 }}>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontSize: 11,
                      fontWeight: "500",
                      lineHeight: 16,
                      color: "#8A8A8A",
                      textTransform: "uppercase",
                    }}
                  >
                    Full Name
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "400",
                      fontFamily: "SfRegular",
                      lineHeight: 21,
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    {name || "No name set"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleEditName}>
                <Image
                  source={require("../assets/icons/cart_edit_icon.png")}
                  style={{ width: 32, height: 32 }}
                />
              </TouchableOpacity>
            </View>

            {/* Email */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isDark ? "#FFFFFF14" : "#E6E6E6",
                padding: 17,
                borderRadius: 14,
                marginTop: 12,
                backgroundColor: isDark ? "#222222" : "",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={require("../assets/icons/email_icon.png")}
                  style={{ width: 38, height: 38 }}
                />
                <View style={{ marginLeft: 14 }}>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontSize: 11,
                      fontWeight: "500",
                      lineHeight: 16,
                      color: "#8A8A8A",
                      textTransform: "uppercase",
                    }}
                  >
                    Email address
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "400",
                      fontFamily: "SfRegular",
                      lineHeight: 21,
                      // color: "#0B1B0C",
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    {email || "No email set"}
                  </Text>
                </View>
              </View>
              {/* <TouchableOpacity onPress={handleEditEmail}>
              <Image
                source={require("../assets/icons/cart_edit_icon.png")}
                style={{ width: 32, height: 32 }}
              />
            </TouchableOpacity> */}
            </View>

            {/* Phone */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isDark ? "#FFFFFF14" : "#E6E6E6",
                padding: 17,
                borderRadius: 14,
                marginTop: 12,
                backgroundColor: isDark ? "#222222" : "",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={require("../assets/icons/phone_icon.png")}
                  style={{ width: 38, height: 38 }}
                />
                <View style={{ marginLeft: 14 }}>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontSize: 11,
                      fontWeight: "500",
                      lineHeight: 16,
                      color: "#8A8A8A",
                      textTransform: "uppercase",
                    }}
                  >
                    Phone Number
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "400",
                      fontFamily: "SfRegular",
                      lineHeight: 21,
                      // color: "#0B1B0C",
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    {phone || "No phone set"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleEditPhone}>
                <Image
                  source={require("../assets/icons/cart_edit_icon.png")}
                  style={{ width: 32, height: 32 }}
                />
              </TouchableOpacity>
            </View>

            {/* DOB */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isDark ? "#FFFFFF14" : "#E6E6E6",
                padding: 17,
                borderRadius: 14,
                marginTop: 12,
                backgroundColor: isDark ? "#222222" : "",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={require("../assets/icons/dob_icon.png")}
                  style={{ width: 38, height: 38 }}
                />
                <View style={{ marginLeft: 14 }}>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontSize: 11,
                      fontWeight: "500",
                      lineHeight: 16,
                      color: "#8A8A8A",
                      textTransform: "uppercase",
                    }}
                  >
                    Date of Birth
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "400",
                      fontFamily: "SfRegular",
                      lineHeight: 21,
                      // color: "#0B1B0C",
                      color: isDark ? "#E0E0E0" : "#0B1B0C",
                    }}
                  >
                    {dob || "No DOB set"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleEditDob}>
                <Image
                  source={require("../assets/icons/cart_edit_icon.png")}
                  style={{ width: 32, height: 32 }}
                />
              </TouchableOpacity>
            </View>

            {/* Brokerage Password */}
            {ClientData && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isDark ? "#FFFFFF14" : "#E6E6E6",
                  padding: 17,
                  borderRadius: 14,
                  backgroundColor: isDark ? "#222222" : "",
                  marginTop: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("../assets/icons/brokerage_password.png")}
                    style={{ width: 38, height: 38 }}
                  />
                  <View style={{ marginLeft: 14 }}>
                    <Text
                      style={{
                        fontFamily: "SfRegular",
                        fontSize: 11,
                        fontWeight: "500",
                        lineHeight: 16,
                        color: "#8A8A8A",
                        textTransform: "uppercase",
                      }}
                    >
                      Brokerage Password
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "400",
                        fontFamily: "SfRegular",
                        lineHeight: 21,
                        color: isDark ? "#E0E0E0" : "#0B1B0C",
                      }}
                    >
                      *****************
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleEditBrokeragePassword}>
                  <Image
                    source={require("../assets/icons/cart_edit_icon.png")}
                    style={{ width: 32, height: 32 }}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Edit Profile Button */}
          <View
            style={{
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 24,
              paddingBottom: 50,
              marginHorizontal: 24,
            }}
          >
            <View
              style={{
                backgroundColor: "#53BA83",
                borderRadius: 14,
                marginTop: 12,
                width: "100%",
                height: 52,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={require("../assets/icons/button_edit_icon.png")}
                style={{ width: 18, height: 18 }}
              />
              <Text
                style={{
                  fontSize: 15,
                  color: "#FFFFFF",
                  fontFamily: "SfRegular",
                  fontWeight: "600",
                  lineHeight: 22,
                  marginLeft: 4,
                }}
              >
                Edit Profile
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      {/* Modals */}
      {/* Name Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={{ position: "absolute", top: 12, right: 24 }}
              onPress={handleCancel}
            >
              <Image
                source={require("../assets/crose_icon.png")}
                style={{ width: 20, height: 20 }}
              />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Name</Text>
            <Text
              style={{
                textAlign: "center",
                fontWeight: "400",
                color: "#6E6E6E",
                fontFamily: "OutfitRegular",
                marginBottom: 24,
              }}
            >
              Enter a new name and tap save to update the changes.
            </Text>
            <TextInput
              style={styles.input}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Full Name"
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: tempName.trim() ? "#58BA83" : "#cccccc" },
              ]}
              onPress={handleSaveName}
              disabled={!tempName.trim()}
            >
              <Text style={styles.modalButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Phone Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={phoneModalVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={{ position: "absolute", top: 12, right: 24 }}
              onPress={handleCancelPhone}
            >
              <Image
                source={require("../assets/crose_icon.png")}
                style={{ width: 20, height: 20 }}
              />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Phone Number</Text>
            <Text
              style={{
                textAlign: "center",
                fontWeight: "400",
                color: "#6E6E6E",
                fontFamily: "OutfitRegular",
                marginBottom: 24,
              }}
            >
              Enter a new phone number and tap save to update the changes.
            </Text>
            <TextInput
              style={styles.input}
              value={tempPhone}
              onChangeText={setTempPhone}
              placeholder="Phone Number"
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: tempPhone.trim() ? "#58BA83" : "#cccccc" },
              ]}
              onPress={handleSavePhone}
              disabled={!tempPhone.trim()}
            >
              <Text style={styles.modalButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DOB Modal */}
      <Modal animationType="slide" transparent={true} visible={dobModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={{ position: "absolute", top: 12, right: 24 }}
              onPress={handleCancelDob}
            >
              <Image
                source={require("../assets/crose_icon.png")}
                style={{ width: 20, height: 20 }}
              />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Date of Birth</Text>
            <Text
              style={{
                textAlign: "center",
                fontWeight: "400",
                color: "#6E6E6E",
                fontFamily: "OutfitRegular",
                marginBottom: 24,
              }}
            >
              Enter a new date of birth (DD-MM-YYYY) and tap save to update the
              changes.
            </Text>
            {/* <TextInput
              style={styles.input}
              value={tempDob}
              onChangeText={setTempDob}
              placeholder="DD-MM-YYYY"
            /> */}
            <TouchableOpacity
              onPress={showDatePicker}
              style={styles.dateInputWrapper}
            >
              <TextInput
                style={styles.input}
                value={tempDob}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#666"
                editable={false}
                pointerEvents="none"
              />
            </TouchableOpacity>

            {isDatePickerVisible && (
              <DateTimePicker
                value={
                  tempDob
                    ? parseDateString(tempDob) || eighteenYearsAgo
                    : eighteenYearsAgo
                }
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
                maximumDate={eighteenYearsAgo}
              />
            )}
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: tempDob.trim() ? "#58BA83" : "#cccccc" },
              ]}
              onPress={handleSaveDob}
              disabled={!tempDob.trim()}
            >
              <Text style={styles.modalButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Email Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={emailmodalVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={{ position: "absolute", top: 12, right: 24 }}
              onPress={handleCancelEmailModal}
            >
              <Image
                source={require("../assets/crose_icon.png")}
                style={{ width: 20, height: 20 }}
              />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Email</Text>
            <Text
              style={{
                textAlign: "center",
                fontWeight: "400",
                color: "#6E6E6E",
                fontFamily: "OutfitRegular",
                marginBottom: 24,
              }}
            >
              Enter a new email and tap save to update the changes.
            </Text>
            <TextInput
              style={styles.input}
              value={tempEmail}
              onChangeText={setTempEmail}
              placeholder="Enter Email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: tempEmail.trim() ? "#58BA83" : "#cccccc" },
              ]}
              onPress={handleSaveEmail}
              disabled={!tempEmail.trim()}
            >
              <Text style={styles.modalButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Brokerage Password Update */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={PasswordModalVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={{ position: "absolute", top: 12, right: 24 }}
              onPress={handleCancelBrokeragePassword}
            >
              <Image
                source={require("../assets/crose_icon.png")}
                style={{ width: 20, height: 20 }}
              />
            </TouchableOpacity>
            <Text
              style={[
                styles.modalTitle,
                {
                  textAlign: "center",
                },
              ]}
            >
              Update Brokerage Password
            </Text>
            <Text
              style={{
                textAlign: "center",
                fontWeight: "400",
                color: "#6E6E6E",
                fontFamily: "OutfitRegular",
                marginBottom: 24,
              }}
            >
              Do you want to update your brokerage account password?
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: "#FFFFFF",
                  width: "48%",
                  paddingVertical: 8,
                  borderRadius: 14,
                  flexDirection: "row",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "#E8E8E8",
                }}
                onPress={handleCancelBrokeragePassword}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    {
                      color: "#8A8A8A",
                    },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: "#58BA83",
                  width: "48%",
                  paddingVertical: 8,
                  borderRadius: 14,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={handleYesBrokeragePassword}
              >
                <Text style={styles.modalButtonText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast config={toastConfig} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#fff",
    paddingTop: 50, // Adjust for status bar
  },
  scrollView: {
    flex: 1,
    // backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    fontFamily: "SfRegular",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  modalContainer: {
    width: screenWidth * 0.8,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "600",
    fontFamily: "OutfitSemiBold",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    fontFamily: "OutfitLight",
    marginBottom: 24,
    minWidth: "100%",
    color: "#929292",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 100,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#ccc",
  },
  saveButton: {
    backgroundColor: "#58BA83",
    width: "100%",
    paddingVertical: 8,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "OutfitMedium",
  },
});

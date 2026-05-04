// components/Chatbot.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Dimensions,
} from "react-native";
import { supabase } from "../supabaseConfig";
import { useTheme } from "../hooks/ThemeContext";

const { height } = Dimensions.get("window");

const API_URL =
  "https://mocmfsgsez6gummeozhk2sjy.agents.do-ai.run/api/v1/chat/completions";
const AUTH_TOKEN = "Bearer l7uAND0tMCRlmKot_0kUlMiUY2lbWHD0";

const ChatBotScreen = ({ symbol, userId, colorScheme }) => {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef();

  const saveToSupabase = async (question, answer) => {
    if (!userId || !symbol) return;

    const { error } = await supabase.from("chat_history").insert({
      user_id: userId,
      symbol: symbol,
      question: question,
      answer: answer,
    });

    if (error) {
      console.error("Supabase insert error:", error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage = { role: "user", content: inputText.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: AUTH_TOKEN,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: userMessage.content }],
          stream: false,
          include_functions_info: true,
          include_retrieval_info: false,
          include_guardrails_info: false,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const botMessage = data.choices?.[0]?.message?.content || "No response";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: botMessage },
      ]);
      await saveToSupabase(userMessage.content, botMessage);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "" : "#fff" }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, padding: 16 }}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <Text
              style={{
                textAlign: "center",
                color: "#888",
                marginTop: 20,
                fontFamily: "SfRegular",
              }}
            >
              Ask me anything about {symbol}'s financials.
            </Text>
          )}

          {messages.map((msg, i) => (
            <View
              key={i}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                backgroundColor: msg.role === "user" ? "#007AFF" : "#F2F2F7",
                padding: 12,
                borderRadius: 16,
                marginVertical: 6,
                maxWidth: "80%",
              }}
            >
              <Text
                style={{
                  color: msg.role === "user" ? "#fff" : "#000",
                  fontSize: 15,
                  fontFamily: "SfRegular",
                }}
              >
                {msg.content}
              </Text>
            </View>
          ))}

          {loading && (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: "#F2F2F7",
                padding: 12,
                borderRadius: 16,
                marginVertical: 6,
              }}
            >
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View
          style={{
            flexDirection: "row",
            padding: 12,
            borderTopWidth: 1,
            borderColor: "#eee",
            backgroundColor: isDark ? "black" : "#fff",
          }}
        >
          <TextInput
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              marginRight: 8,
              fontSize: 16,
              fontFamily: "SfRegular",
              color: isDark ? "#E0E0E0" : "",
            }}
            placeholder="Ask about financials..."
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            editable={!loading}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={loading || !inputText.trim()}
            style={{
              backgroundColor:
                loading || !inputText.trim() ? "#ccc" : "#007AFF",
              borderRadius: 20,
              paddingHorizontal: 10,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Image
              source={require("../assets/icons/send.png")}
              style={{ width: 20, height: 20, tintColor: "#fff" }}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatBotScreen;

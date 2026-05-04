import React, { useState } from "react";
import { View, TouchableOpacity, Text, Image, StyleSheet } from "react-native";

const OrderTypeDropdown = ({ selectedOrderType, setselectedOrderType }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const orderTypes = [
    {
      key: "Market",
      title: "Market Order",
      description: "Execute immediately at current price",
    },
    {
      key: "Limit",
      title: "Limit Order",
      description: "Set your desired execution price",
    },
    {
      key: "Stop",
      title: "Stop Loss Order",
      description: "Trigger sell at specified price",
    },
  ];

  const selectedItem = orderTypes.find(
    (item) => item.key === selectedOrderType
  );

  const handleSelect = (type) => {
    setselectedOrderType(type);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <View
      style={{
        borderWidth: 0.58,
        borderColor: "#E0E0E0",
        backgroundColor: "#FFFFFF",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderRadius: 12,
        marginTop: 12,
      }}
    >
      {/* Dropdown Trigger */}
      <TouchableOpacity
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 12,
          borderBottomWidth: isDropdownOpen ? 0.58 : 0,
          borderBottomColor: "#E0E0E0",
        }}
        onPress={toggleDropdown}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "SfRegular",
              fontWeight: "400",
              fontSize: 18,
              color: "#0B1B0C",
            }}
          >
            {selectedItem?.title || "Select Order Type"}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "400",
              fontFamily: "SfRegular",
              color: "#6A7282",
            }}
          >
            {selectedItem?.description || ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {selectedItem && (
            <Image
              source={require("../assets/icons/new_tick.png")}
              style={{ width: 20, height: 20, marginRight: 8 }}
            />
          )}
          {/* <Image
            source={
              isDropdownOpen
                ? require("../assets/icons/chevron_up.png")
                : require("../assets/icons/chevron_down.png")
            } 
            style={{ width: 20, height: 20 }}
          /> */}
        </View>
      </TouchableOpacity>

      {/* Dropdown List - Only show when open */}
      {isDropdownOpen && (
        <>
          {orderTypes.slice(1).map(
            (
              item,
              index // Skip the selected one if it's first, but show all for selection
            ) => (
              <TouchableOpacity
                key={item.key}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 12,
                  borderBottomWidth: index < orderTypes.length - 2 ? 0.58 : 0, // Adjust border for last item
                  borderBottomColor: "#E0E0E0",
                  backgroundColor:
                    selectedOrderType === item.key ? "#F0F9FF" : "#FFFFFF", // Subtle highlight for selected
                }}
                onPress={() => handleSelect(item.key)}
              >
                <View>
                  <Text
                    style={{
                      fontFamily: "SfRegular",
                      fontWeight: "400",
                      fontSize: 18,
                      color: "#0B1B0C",
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "400",
                      fontFamily: "SfRegular",
                      color: "#6A7282",
                    }}
                  >
                    {item.description}
                  </Text>
                </View>
                {selectedOrderType === item.key && (
                  <Image
                    source={require("../assets/icons/new_tick.png")}
                    style={{ width: 20, height: 20 }}
                  />
                )}
              </TouchableOpacity>
            )
          )}
          {/* Add the selected one at the top of list if not already trigger */}
          {orderTypes[0].key !== selectedOrderType && selectedItem && (
            <TouchableOpacity
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 12,
                borderBottomWidth: 0.58,
                borderBottomColor: "#E0E0E0",
                backgroundColor: "#F0F9FF",
              }}
              onPress={() => handleSelect(selectedItem.key)}
            >
              <View>
                <Text
                  style={{
                    fontFamily: "SfRegular",
                    fontWeight: "400",
                    fontSize: 18,
                    color: "#0B1B0C",
                  }}
                >
                  {selectedItem.title}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "400",
                    fontFamily: "SfRegular",
                    color: "#6A7282",
                  }}
                >
                  {selectedItem.description}
                </Text>
              </View>
              <Image
                source={require("../assets/icons/new_tick.png")}
                style={{ width: 20, height: 20 }}
              />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

export default OrderTypeDropdown();

// Usage in parent component:
// <OrderTypeDropdown selectedOrderType={selectedOrderType} setselectedOrderType={setselectedOrderType} />

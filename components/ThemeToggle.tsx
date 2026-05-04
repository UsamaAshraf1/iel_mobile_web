import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // or your icon lib (sun/moon)
import { useTheme } from '@/hooks/ThemeContext';
export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={toggleTheme}
      style={styles.container}
    >
      <View style={styles.left}>
        <Ionicons
          name="sunny-outline"
          size={20}
          color={isDark ? '#888' : '#FFA500'} // orange-ish for light mode sun
        />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#333' }]}>
            Theme Mode
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>
            {isDark ? 'Dark Mode Active' : 'Light Mode Active'}
          </Text>
        </View>
      </View>

      <Switch
        value={isDark}
        onValueChange={toggleTheme}
        trackColor={{ false: '#767577', true: '#5E5E5E' }}
        thumbColor={isDark ? '#222222' : '#f4f3f4'}
        ios_backgroundColor="#3e3e3e"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // backgroundColor: '#0000001A', // semi-transparent black → looks like dark overlay in light mode too
    borderRadius: 999, // pill shape
    paddingVertical: 8,
    // paddingHorizontal: 16,
    marginVertical: 8,
    width: '100%', // or fixed width if preferred
  
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'SfRegular', // your font
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
});
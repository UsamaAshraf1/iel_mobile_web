// components/StockLogo.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { getLogoUrl, loadAllLogos } from '@/Services/LogoStore';

interface StockLogoProps {
  symbol: string;
  size?: number;
}

export const StockLogo: React.FC<StockLogoProps> = ({ symbol, size = 32 }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // const normalizedSymbol = symbol.trim().toUpperCase();
   const normalizedSymbol = symbol
    .trim()
    .toUpperCase()
    .split('-')[0];

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      // Ensure logos are loaded once at app start
      await loadAllLogos();

      if (!isMounted) return;

      const url = getLogoUrl(normalizedSymbol);
      setImageUrl(url);
      setIsLoading(false);
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [normalizedSymbol]);

  // Fallback color generator
  const getColorFromSymbol = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981',
      '#6366F1', '#EF4444', '#14B8A6', '#F97316', '#06B6D4',
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const bg = getColorFromSymbol(normalizedSymbol);
  const fontSize = normalizedSymbol.length <= 3 
    ? size * 0.35 
    : normalizedSymbol.length === 4 
      ? size * 0.28 
      : size * 0.22;

  if (isLoading) {
    return (
      <View style={[styles.container, { width: size, height: size, backgroundColor: '#E5E7EB' }]} />
    );
  }

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size, backgroundColor: bg }]}>
      <Text style={[styles.text, { fontSize }]}>{normalizedSymbol}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -0.5,
  },
});
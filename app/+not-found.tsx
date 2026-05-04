import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { supabase } from '@/supabaseConfig';

export default function NotFoundScreen() {
  const router = useRouter();
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      // Wait 2 seconds to show loader
      await new Promise((res) => setTimeout(res, 1000));

      if (!mounted) return;

      // Get Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setInitializing(false);

      // Redirect automatically
      router.replace(session?.user ? '/Market' : '/login');
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // While initializing, show loader
  if (initializing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#58BA83" />
        <ThemedText type="default" style={{ marginTop: 10 }}>
          Loading...
        </ThemedText>
      </View>
    );
  }

  const homeHref = user ? '/Market' : '/login';

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">This screen does not exist.</ThemedText>
        <ThemedText type="default">Redirecting to home screen...</ThemedText>
        <Link href={homeHref} style={styles.link}>
          <ThemedText type="link">Go to home screen!</ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
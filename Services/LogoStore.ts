import { supabase } from "@/supabaseConfig";
type LogoMap = Map<string, string | null>;

let logoMap: LogoMap = new Map();
let isLoaded = false;
let loadingPromise: Promise<void> | null = null;

export const loadAllLogos = async (): Promise<void> => {
  if (isLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('stocklogos')
        .select('symbol, img_url');

      if (error) {
        console.error('Failed to load stock logos:', error);
        return;
      }

      logoMap.clear();
      if (data) {
        data.forEach((item) => {
          const symbol = item.symbol?.toUpperCase().trim();
          if (symbol) {
            logoMap.set(symbol, item.img_url || null);
          }
        });
      }
      isLoaded = true;
      console.log(`✅ Loaded ${logoMap.size} stock logos into cache`);
    } catch (err) {
      console.error('Error loading logos:', err);
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
};

export const getLogoUrl = (symbol: string): string | null => {
  const normalized = symbol.trim().toUpperCase();
  return logoMap.get(normalized) || null;
};

// Optional: Refresh logos (useful after uploading new ones)
export const refreshLogos = async () => {
  isLoaded = false;
  logoMap.clear();
  await loadAllLogos();
};
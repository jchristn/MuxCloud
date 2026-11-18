import { useWindowDimensions } from 'react-native';

/** Tablets and large phones in landscape get split views (list beside detail). */
export function useIsWide(): boolean {
  const { width } = useWindowDimensions();
  return width >= 768;
}

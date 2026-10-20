import { SymbolView, type SFSymbol } from 'expo-symbols';

interface IconProps {
  /** SF Symbol name. */
  name: SFSymbol;
  size?: number;
  color: string;
}

/** Native icons: SF Symbols on iOS. Android Material Symbols mapping comes with Android support. */
export function Icon({ name, size = 28, color }: IconProps) {
  return <SymbolView name={name} size={size} tintColor={color} type="monochrome" />;
}

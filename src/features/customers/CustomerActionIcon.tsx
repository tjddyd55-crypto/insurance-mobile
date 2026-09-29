import { useMemo } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from "react-native";
import { SymbolView } from "expo-symbols";

import { AppText, useAppTheme, type AppTheme } from "../../design-system";

export type CustomerActionIconKind = "tel" | "sms" | "star";

export type CustomerActionIconProps = {
  kind: CustomerActionIconKind;
  active?: boolean;
  disabled?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityLabel: string;
};

const SYMBOL_NAMES = {
  tel: { ios: "phone.fill" as const, android: "call" as const },
  sms: { ios: "message.fill" as const, android: "chat" as const },
  star: { ios: "star.fill" as const, android: "star" as const },
  starOutline: { ios: "star" as const, android: "star_border" as const },
};

function resolveIconColor(
  theme: AppTheme,
  kind: CustomerActionIconKind,
  disabled: boolean,
  active: boolean,
): string {
  if (disabled) return theme.colors.textDisabled;
  if (kind === "star") {
    return active ? theme.colors.warning : theme.colors.textSecondary;
  }
  return theme.colors.primary;
}

function resolveSymbolName(kind: CustomerActionIconKind, active: boolean) {
  if (kind === "star") {
    return active ? SYMBOL_NAMES.star : SYMBOL_NAMES.starOutline;
  }
  return SYMBOL_NAMES[kind];
}

function fallbackGlyph(kind: CustomerActionIconKind, active: boolean): string {
  if (kind === "tel") return "☎";
  if (kind === "sms") return "💬";
  return active ? "★" : "☆";
}

export function CustomerActionIcon({
  kind,
  active = false,
  disabled = false,
  onPress,
  accessibilityLabel,
}: CustomerActionIconProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const iconColor = resolveIconColor(theme, kind, disabled, active);
  const symbolName = resolveSymbolName(kind, active);

  if (disabled || !onPress) {
    return (
      <View
        style={[styles.hitArea, disabled && styles.disabled]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <SymbolView
          name={symbolName}
          size={22}
          tintColor={iconColor}
          fallback={
            <AppText variant="body" style={{ color: iconColor, fontSize: 18 }}>
              {fallbackGlyph(kind, active)}
            </AppText>
          }
        />
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={theme.interaction.compactHitSlop}
      onPress={onPress}
      style={({ pressed }) => [styles.hitArea, pressed && styles.pressed]}
    >
      <SymbolView
        name={symbolName}
        size={22}
        tintColor={iconColor}
        fallback={
          <AppText variant="body" style={{ color: iconColor, fontSize: 18 }}>
            {fallbackGlyph(kind, active)}
          </AppText>
        }
      />
    </Pressable>
  );
}

export function openPhoneUrl(url: string | null) {
  if (url) {
    void Linking.openURL(url);
  }
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    hitArea: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: {
      opacity: theme.opacity.pressed,
    },
    disabled: {
      opacity: theme.opacity.disabled,
    },
  });
}

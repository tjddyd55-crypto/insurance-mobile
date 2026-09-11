import { useMemo } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { AppText, useAppTheme, type AppTheme } from "../../design-system";

type ContactKind = "tel" | "sms";

export type CustomerContactIconButtonProps = {
  kind: ContactKind;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
};

const SYMBOL_NAMES = {
  tel: { ios: "phone.fill" as const, android: "call" as const },
  sms: { ios: "message.fill" as const, android: "chat" as const },
};

export function CustomerContactIconButton({
  kind,
  disabled = false,
  onPress,
  accessibilityLabel,
}: CustomerContactIconButtonProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const iconColor = disabled ? theme.colors.textDisabled : theme.colors.primary;

  if (disabled) {
    return (
      <View style={[styles.plate, styles.plateDisabled]} accessibilityElementsHidden>
        <SymbolView
          name={SYMBOL_NAMES[kind]}
          size={20}
          tintColor={iconColor}
          fallback={<AppText variant="body" color="textDisabled">{kind === "tel" ? "☎" : "💬"}</AppText>}
        />
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        if (onPress) {
          onPress();
        }
      }}
      style={({ pressed }) => [styles.plate, pressed && styles.platePressed]}
    >
      <SymbolView
        name={SYMBOL_NAMES[kind]}
        size={20}
        tintColor={iconColor}
        fallback={<AppText variant="body" color="brandStrong">{kind === "tel" ? "☎" : "💬"}</AppText>}
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
    plate: {
      width: 40,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    platePressed: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.primaryBorder,
    },
    plateDisabled: {
      opacity: 0.38,
    },
  });
}

import type { GestureResponderEvent } from "react-native";

import { CustomerActionIcon, openPhoneUrl } from "./CustomerActionIcon";

type ContactKind = "tel" | "sms";

export type CustomerContactIconButtonProps = {
  kind: ContactKind;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
};

export function CustomerContactIconButton({
  kind,
  disabled = false,
  onPress,
  accessibilityLabel,
}: CustomerContactIconButtonProps) {
  const handlePress = onPress
    ? (_event: GestureResponderEvent) => {
        onPress();
      }
    : undefined;

  return (
    <CustomerActionIcon
      kind={kind}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
    />
  );
}

export { openPhoneUrl };

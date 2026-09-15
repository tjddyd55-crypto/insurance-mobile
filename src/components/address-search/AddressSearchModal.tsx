import { useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { AppText, Button, useAppTheme, type AppTheme } from "../../design-system";
import type { AddressSearchValue } from "../../features/customers/customerAddressSearch";
import {
  ADDRESS_SEARCH_PANEL_GAP,
  ADDRESS_SEARCH_PANEL_PADDING,
  resolveAddressSearchEmbedHeight,
  resolveAddressSearchPanelWidth,
} from "./addressSearchUi";
import {
  ADDRESS_SEARCH_POSTCODE_HTML,
  parseAddressSearchWebViewMessage,
} from "./addressSearchPostcode";

export type AddressSearchModalProps = {
  open: boolean;
  onClose: () => void;
  onComplete: (next: Pick<AddressSearchValue, "zonecode" | "baseAddress">) => void;
  panelStyle?: StyleProp<ViewStyle>;
};

/**
 * 고객 등록 링크(public registration) 주소 검색 dialog 와 동일한 Native SSOT.
 * Platform `address-search-field__dialog` 구조: 패널 padding → 헤더+닫기 → embed(WebView).
 */
export function AddressSearchModal({
  open,
  onClose,
  onComplete,
  panelStyle,
}: AddressSearchModalProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const panelWidth = useMemo(() => resolveAddressSearchPanelWidth(), []);
  const embedHeight = useMemo(() => resolveAddressSearchEmbedHeight(), []);

  const handleMessage = (event: WebViewMessageEvent) => {
    const result = parseAddressSearchWebViewMessage(event.nativeEvent.data);
    if (result.action === "complete" && result.value) {
      onComplete(result.value);
      onClose();
      return;
    }
    if (result.action === "close") {
      onClose();
    }
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="모달 배경"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View
          style={[styles.panel, { width: panelWidth }, panelStyle]}
          accessibilityViewIsModal
          accessibilityLabel="주소 검색"
        >
          <View style={styles.head}>
            <AppText variant="bodyStrong" style={styles.title}>주소 검색</AppText>
            <Button
              label="닫기"
              size="sm"
              variant="secondary"
              accessibilityLabel="닫기"
              onPress={onClose}
            />
          </View>
          <View style={[styles.embed, { height: embedHeight }]} collapsable={false}>
            <WebView
              originWhitelist={["https://*"]}
              source={{ html: ADDRESS_SEARCH_POSTCODE_HTML, baseUrl: "https://onefc.native" }}
              onMessage={handleMessage}
              javaScriptEnabled
              domStorageEnabled
              nestedScrollEnabled
              style={styles.webview}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: ADDRESS_SEARCH_PANEL_PADDING,
      backgroundColor: theme.colors.overlay,
    },
    panel: {
      maxWidth: "100%",
      padding: ADDRESS_SEARCH_PANEL_PADDING,
      gap: ADDRESS_SEARCH_PANEL_GAP,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceElevated,
      zIndex: 1,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    title: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.text,
    },
    embed: {
      width: "100%",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      overflow: "hidden",
      backgroundColor: theme.colors.surface,
    },
    webview: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
  });
}

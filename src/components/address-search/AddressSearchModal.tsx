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
import {
  ADDRESS_SEARCH_HEADER_PADDING_BOTTOM,
  ADDRESS_SEARCH_PANEL_BORDER_RADIUS,
  ADDRESS_SEARCH_PANEL_PADDING,
  resolveAddressSearchEmbedHeight,
  resolveAddressSearchPanelWidth,
} from "./addressSearchUi";
import {
  ADDRESS_SEARCH_POSTCODE_HTML,
  parseAddressSearchWebViewMessage,
  type AddressSearchSelection,
} from "./addressSearchPostcode";

export type AddressSearchModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (address: AddressSearchSelection) => void;
  panelStyle?: StyleProp<ViewStyle>;
};

/**
 * Native 주소검색 dialog SSOT.
 * - card: outer margin + rounded panel
 * - header: padded
 * - WebView: card 내부 full-bleed width
 */
export function AddressSearchModal({
  open,
  onClose,
  onSelect,
  panelStyle,
}: AddressSearchModalProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const panelWidth = useMemo(() => resolveAddressSearchPanelWidth(), []);
  const embedHeight = useMemo(() => resolveAddressSearchEmbedHeight(), []);

  const handleMessage = (event: WebViewMessageEvent) => {
    const result = parseAddressSearchWebViewMessage(event.nativeEvent.data);
    if (result.action === "complete" && result.value) {
      onSelect(result.value);
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
      <View style={styles.overlay} pointerEvents="box-none">
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
          <View style={styles.divider} />
          <View style={[styles.embed, { height: embedHeight }]} collapsable={false}>
            <WebView
              originWhitelist={["https://*"]}
              source={{ html: ADDRESS_SEARCH_POSTCODE_HTML, baseUrl: "https://onefc.native" }}
              onMessage={handleMessage}
              javaScriptEnabled
              domStorageEnabled
              nestedScrollEnabled
              scrollEnabled
              setBuiltInZoomControls={false}
              showsHorizontalScrollIndicator={false}
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
      overflow: "hidden",
      borderRadius: ADDRESS_SEARCH_PANEL_BORDER_RADIUS,
      backgroundColor: theme.colors.surfaceElevated,
      zIndex: 1,
      alignSelf: "center",
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
      paddingHorizontal: ADDRESS_SEARCH_PANEL_PADDING,
      paddingTop: ADDRESS_SEARCH_PANEL_PADDING,
      paddingBottom: ADDRESS_SEARCH_HEADER_PADDING_BOTTOM,
    },
    title: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.text,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
    embed: {
      alignSelf: "stretch",
      width: "100%",
      overflow: "hidden",
      backgroundColor: theme.colors.surface,
    },
    webview: {
      flex: 1,
      width: "100%",
      backgroundColor: theme.colors.surface,
    },
  });
}

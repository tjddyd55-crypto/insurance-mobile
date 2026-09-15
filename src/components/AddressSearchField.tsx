import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import {
  AppText,
  Button,
  Inline,
  ModalShell,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from "../design-system";
import type { AddressSearchValue } from "../features/customers/customerAddressSearch";
import {
  parseAddressSearchWebViewMessage,
  resolveAddressSearchModalHeight,
} from "./addressSearchModal";

const POSTCODE_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
    <style>
      html, body, #wrap { margin: 0; padding: 0; width: 100%; height: 100%; }
      #wrap { min-height: 100vh; }
    </style>
  </head>
  <body>
    <div id="wrap"></div>
    <script>
      function post(payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }
      function buildBaseAddress(data) {
        var primary = data.addressType === 'R'
          ? (data.roadAddress || data.jibunAddress)
          : (data.jibunAddress || data.roadAddress);
        var building = (data.buildingName || '').trim();
        if (data.addressType === 'R' && building) {
          return primary + ' (' + building + ')';
        }
        return primary;
      }
      new daum.Postcode({
        oncomplete: function(data) {
          post({
            type: 'complete',
            zonecode: data.zonecode || '',
            baseAddress: buildBaseAddress(data)
          });
        },
        onclose: function(state) {
          if (state === 'FORCE_CLOSE') {
            post({ type: 'close' });
          }
        },
        width: '100%',
        height: '100%'
      }).embed(document.getElementById('wrap'));
    </script>
  </body>
</html>`;

type AddressSearchFieldProps = {
  value: AddressSearchValue;
  onChange: (next: AddressSearchValue) => void;
  disabled?: boolean;
};

export function AddressSearchField({
  value,
  onChange,
  disabled = false,
}: AddressSearchFieldProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const modalHeight = useMemo(() => resolveAddressSearchModalHeight(), []);

  const handleMessage = (event: WebViewMessageEvent) => {
    const result = parseAddressSearchWebViewMessage(event.nativeEvent.data, value.detailAddress);
    if (result.action === "complete" && result.value) {
      onChange(result.value);
      setOpen(false);
      return;
    }
    if (result.action === "close") {
      setOpen(false);
    }
  };

  return (
    <Stack gap="sm">
      <Inline>
        <Button
          label="주소 검색"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onPress={() => setOpen(true)}
        />
        {value.zonecode ? (
          <AppText variant="caption">우편번호 {value.zonecode}</AppText>
        ) : null}
      </Inline>
      <TextField
        label="기본주소"
        value={value.baseAddress}
        editable={false}
        placeholder="주소 검색 버튼을 눌러 주세요"
      />
      <TextField
        label="상세주소"
        value={value.detailAddress}
        editable={!disabled}
        placeholder="동/호수 등"
        onChangeText={(detailAddress) => onChange({ ...value, detailAddress })}
      />
      <ModalShell
        open={open}
        title="주소 검색"
        presentation="dialog"
        scroll={false}
        keyboardAvoiding={false}
        closeOnBackdrop={false}
        dismissOnAndroidBack
        onRequestClose={() => setOpen(false)}
        headerAction={
          <Button
            label="닫기"
            size="sm"
            variant="ghost"
            accessibilityLabel="주소 검색 닫기"
            onPress={() => setOpen(false)}
          />
        }
      >
        <View style={[styles.webviewWrap, { height: modalHeight }]}>
          <WebView
            originWhitelist={["https://*"]}
            source={{ html: POSTCODE_HTML, baseUrl: "https://onefc.native" }}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            style={styles.webview}
          />
        </View>
      </ModalShell>
    </Stack>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    webviewWrap: {
      width: "100%",
      borderRadius: theme.radius.md,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    webview: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
  });
}

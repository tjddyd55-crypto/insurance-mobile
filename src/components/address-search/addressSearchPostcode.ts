import type { AddressSearchValue } from "../../features/customers/customerAddressSearch";

export const ADDRESS_SEARCH_POSTCODE_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
    <style>
      html, body, #wrap { margin: 0; padding: 0; width: 100%; height: 100%; }
      #wrap { height: 100%; }
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

export function parseAddressSearchWebViewMessage(raw: string): {
  action: "complete" | "close" | "ignore";
  value?: Pick<AddressSearchValue, "zonecode" | "baseAddress">;
} {
  try {
    const payload = JSON.parse(raw) as {
      type?: string;
      zonecode?: string;
      baseAddress?: string;
    };
    if (payload.type === "complete") {
      return {
        action: "complete",
        value: {
          zonecode: String(payload.zonecode ?? ""),
          baseAddress: String(payload.baseAddress ?? ""),
        },
      };
    }
    if (payload.type === "close") {
      return { action: "close" };
    }
    return { action: "ignore" };
  } catch {
    return { action: "close" };
  }
}

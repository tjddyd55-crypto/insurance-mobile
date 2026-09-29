import type { AddressSearchValue } from "../../features/customers/customerAddressSearch";

export const ADDRESS_SEARCH_POSTCODE_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
      #wrap { margin: 0; padding: 0; width: 100%; height: 100%; }
      #wrap iframe { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; border: 0 !important; }
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

export type AddressSearchSelection = Pick<AddressSearchValue, "zonecode" | "baseAddress">;

export function parseAddressSearchWebViewMessage(raw: string): {
  action: "complete" | "close" | "ignore";
  value?: AddressSearchSelection;
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

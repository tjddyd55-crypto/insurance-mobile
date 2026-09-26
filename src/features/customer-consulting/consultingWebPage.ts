/**
 * 상담 WebView에 넣는 페이지 스크립트.
 * 세션 토큰, localStorage 키, 요청 주소는 포함하지 않는다.
 *
 * 뷰포트의 maximum-scale=1을 풀어 핀치를 허용한다.
 * blob PDF는 조각으로 앱에 넘긴다. 저장소 열기 주소와 바인더 export 이동은
 * 페이지 이동 대신 앱이 공유하도록 알린다.
 * Location.assign이 막혀 있으면 네이티브 탐색 가로채기가 같은 다운로드를 처리한다.
 */
export function buildConsultingPageScript(): string {
  return `${PAGE_SCRIPT}\ntrue;`;
}

const PAGE_SCRIPT = `
(function () {
  if (window.__onefcConsultingPage) {
    window.__onefcConsultingPage();
    return;
  }
  var VIEWPORT = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, user-scalable=yes';
  var CHUNK = 48000;
  var blobs = new Map();

  function applyViewport() {
    var head = document.head || document.documentElement;
    if (!head) return;
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      head.appendChild(meta);
    }
    meta.setAttribute('content', VIEWPORT);
  }

  function post(payload) {
    var target = window.ReactNativeWebView;
    if (!target || typeof target.postMessage !== 'function') return;
    target.postMessage(JSON.stringify(payload));
  }

  function bytesToBase64(bytes) {
    var parts = [];
    var block = 32768;
    for (var i = 0; i < bytes.length; i += block) {
      var slice = bytes.subarray(i, i + block);
      var binary = '';
      for (var j = 0; j < slice.length; j += 1) {
        binary += String.fromCharCode(slice[j]);
      }
      parts.push(binary);
    }
    return btoa(parts.join(''));
  }

  function isRemoteDownload(href) {
    try {
      var url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return false;
      var path = url.pathname;
      if (/\\/(?:api|backend)\\/storage\\/files\\/open\\/[^/]+\\/[^/]+$/.test(path)) return true;
      return /\\/(?:api|backend)\\/personal-binders\\/[^/]+\\/export\\/?$/.test(path);
    } catch (error) {
      return false;
    }
  }

  function sendBlob(blob, fileName) {
    blob.arrayBuffer().then(function (buffer) {
      var base64 = bytesToBase64(new Uint8Array(buffer));
      var id = String(Date.now()) + '-' + String(Math.floor(Math.random() * 100000));
      var chunkCount = Math.max(1, Math.ceil(base64.length / CHUNK));
      post({ type: 'consulting-pdf-begin', id: id, fileName: fileName, chunkCount: chunkCount });
      for (var index = 0; index < chunkCount; index += 1) {
        post({
          type: 'consulting-pdf-chunk',
          id: id,
          index: index,
          data: base64.slice(index * CHUNK, (index + 1) * CHUNK)
        });
      }
      post({ type: 'consulting-pdf-end', id: id });
    }).catch(function () {
      post({ type: 'consulting-pdf-error' });
    });
  }

  var originalCreate = URL.createObjectURL.bind(URL);
  URL.createObjectURL = function (blob) {
    var url = originalCreate(blob);
    if (blob && typeof blob.arrayBuffer === 'function') blobs.set(url, blob);
    return url;
  };

  var originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    var href = String(this.href || '');
    var name = this.getAttribute('download');
    var blob = href.indexOf('blob:') === 0 ? blobs.get(href) : undefined;
    if (name && blob) {
      blobs.delete(href);
      sendBlob(blob, name);
      return;
    }
    return originalClick.call(this);
  };

  document.addEventListener('click', function (event) {
    var node = event.target;
    var anchor = node && node.closest ? node.closest('a') : null;
    if (!anchor) return;
    var href = String(anchor.href || '');
    var name = anchor.getAttribute('download');
    var blob = href.indexOf('blob:') === 0 ? blobs.get(href) : undefined;
    if (name && blob) {
      event.preventDefault();
      event.stopPropagation();
      blobs.delete(href);
      sendBlob(blob, name);
      return;
    }
    if (!isRemoteDownload(href)) return;
    event.preventDefault();
    event.stopPropagation();
    post({ type: 'consulting-remote', url: href });
  }, true);

  function hookAssign(methodName) {
    var original = Location.prototype[methodName];
    if (typeof original !== 'function') return;
    Location.prototype[methodName] = function (next) {
      var href = String(next || '');
      if (!isRemoteDownload(href)) return original.call(this, next);
      post({ type: 'consulting-remote', url: new URL(href, window.location.origin).toString() });
    };
  }
  try { hookAssign('assign'); } catch (error) {}
  try { hookAssign('replace'); } catch (error) {}

  window.__onefcConsultingPage = applyViewport;
  applyViewport();
  document.addEventListener('DOMContentLoaded', applyViewport);
  setTimeout(applyViewport, 300);
})();
`.trim();

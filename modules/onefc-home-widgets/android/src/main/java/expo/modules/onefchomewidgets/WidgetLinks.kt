package expo.modules.onefchomewidgets

import android.net.Uri

/** JS widgetLinks.ts 와 같은 deep link 형식. scheme 은 스냅샷(빌드 환경)에서만 온다. */
object WidgetLinks {
  fun schedule(scheme: String, date: String, create: Boolean = false): String {
    val builder = StringBuilder("$scheme://schedule?date=").append(Uri.encode(date)).append("&src=widget")
    if (create) builder.append("&create=1")
    return builder.toString()
  }

  fun todoNew(scheme: String, dueDate: String): String = "$scheme://todos/new?dueDate=${Uri.encode(dueDate)}&src=widget"

  /** 같은 링크를 다시 눌러도 앱이 다시 적용하도록 렌더 시각을 붙인다(_w). */
  fun withNonce(link: String, nonce: Long): String = if (link.contains("?")) "$link&_w=$nonce" else "$link?_w=$nonce"
}

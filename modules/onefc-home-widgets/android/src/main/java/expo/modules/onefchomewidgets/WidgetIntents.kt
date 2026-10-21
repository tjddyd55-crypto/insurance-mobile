package expo.modules.onefchomewidgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.net.Uri

object WidgetIntents {
  const val ACTION_PREV = "expo.modules.onefchomewidgets.PREV"
  const val ACTION_NEXT = "expo.modules.onefchomewidgets.NEXT"
  const val ACTION_TODAY = "expo.modules.onefchomewidgets.TODAY"
  const val ACTION_SELECT = "expo.modules.onefchomewidgets.SELECT"
  const val ACTION_REFRESH = "expo.modules.onefchomewidgets.REFRESH"
  const val EXTRA_DATE = "date"

  private const val FLAGS = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

  /** 위젯 안 상호작용(달·날짜 이동, 날짜 선택, 새로고침): 자기 provider 로만 가는 명시적 broadcast. */
  fun broadcast(context: Context, provider: Class<*>, action: String, widgetId: Int, date: String? = null): PendingIntent {
    val intent = Intent(context, provider)
      .setAction(action)
      .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
      // data 로 PendingIntent 를 구분한다(위젯·동작·날짜마다 하나).
      .setData(Uri.parse("onefc-widget://${provider.simpleName}/$widgetId/$action/${date ?: ""}"))
    if (date != null) intent.putExtra(EXTRA_DATE, date)
    return PendingIntent.getBroadcast(context, widgetId, intent, FLAGS)
  }

  /** 앱 화면 열기: 같은 패키지의 deep link 만. 링크가 비면 앱 첫 화면. */
  fun openApp(context: Context, link: String?, nonce: Long): PendingIntent {
    val intent = if (!link.isNullOrBlank()) {
      Intent(Intent.ACTION_VIEW, Uri.parse(WidgetLinks.withNonce(link, nonce))).setPackage(context.packageName)
    } else {
      context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent().setPackage(context.packageName)
    }
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return PendingIntent.getActivity(context, 0, intent, FLAGS)
  }
}

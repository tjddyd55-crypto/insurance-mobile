package expo.modules.onefchomewidgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

/** 위젯 공통 동작·PendingIntent·상태 화면. 개별 렌더러는 이것만 조합한다. */
object WidgetIntents {
  const val ACTION_PREFIX = "expo.modules.onefchomewidgets."
  const val ACTION_PREV = ACTION_PREFIX + "PREV"
  const val ACTION_NEXT = ACTION_PREFIX + "NEXT"
  const val ACTION_TODAY = ACTION_PREFIX + "TODAY"
  const val ACTION_SELECT = ACTION_PREFIX + "SELECT"
  const val ACTION_REFRESH = ACTION_PREFIX + "REFRESH"
  const val EXTRA_DATE = "date"

  private const val FLAGS = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

  /** 위젯 안 상호작용: 해당 종류 provider 로만 가는 명시적 broadcast. */
  fun broadcast(context: Context, type: OneFcWidgetType, action: String, widgetId: Int, date: String? = null): PendingIntent {
    val provider = requireNotNull(type.providerClass)
    val intent = Intent(context, provider)
      .setAction(action)
      .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
      .setData(Uri.parse("onefc-widget://${type.id}/$widgetId/$action/${date ?: ""}"))
    if (date != null) intent.putExtra(EXTRA_DATE, date)
    return PendingIntent.getBroadcast(context, widgetId, intent, FLAGS)
  }

  /** 앱 화면 열기: 같은 패키지의 deep link 만. 링크가 없으면 앱 첫 화면. */
  fun openApp(context: Context, link: String?, nonce: Long): PendingIntent {
    val intent = if (!link.isNullOrBlank()) {
      Intent(Intent.ACTION_VIEW, Uri.parse(WidgetDeepLink.withNonce(link, nonce))).setPackage(context.packageName)
    } else {
      context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent().setPackage(context.packageName)
    }
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return PendingIntent.getActivity(context, 0, intent, FLAGS)
  }
}

object WidgetCommonViews {
  /** 로그인 필요·만료·불러오는 중·오류 공통 화면. 개인 데이터 없음. 탭 → 앱. */
  fun message(context: Context, type: OneFcWidgetType, state: WidgetDisplayState, refreshing: Boolean): RemoteViews {
    val (text, sub) = when (state) {
      WidgetDisplayState.LOGGED_OUT, WidgetDisplayState.AUTH_EXPIRED -> WidgetCopy.LOGIN_REQUIRED to WidgetCopy.LOGIN_HINT
      WidgetDisplayState.ERROR -> WidgetCopy.LOAD_FAILED to WidgetCopy.LOAD_FAILED_HINT
      else -> WidgetCopy.LOADING to if (refreshing) "" else WidgetCopy.PREPARE_HINT
    }
    val views = RemoteViews(context.packageName, R.layout.onefc_widget_message)
    views.setTextViewText(R.id.w_title, displayName(context, type))
    views.setTextViewText(R.id.w_msg_text, text)
    views.setTextViewText(R.id.w_msg_sub, sub)
    views.setOnClickPendingIntent(R.id.w_root, WidgetIntents.openApp(context, null, 0))
    return views
  }

  fun displayName(context: Context, type: OneFcWidgetType): String = when (type) {
    OneFcWidgetType.SCHEDULE -> context.getString(R.string.onefc_widget_schedule_name)
    OneFcWidgetType.TODO -> context.getString(R.string.onefc_widget_todo_name)
    else -> "ONE FC"
  }

  /** 하단 상태 줄: 새로고침 중 / 마지막 업데이트 HH:mm (+ 안내). */
  fun statusLine(envelope: WidgetEnvelope, refreshing: Boolean, notice: String?): String {
    if (refreshing) return WidgetCopy.REFRESHING
    val parts = ArrayList<String>()
    val at = if (envelope.lastSuccessfulSyncAtMs > 0) envelope.lastSuccessfulSyncAtMs else envelope.generatedAtMs
    if (at > 0) parts.add(WidgetCopy.lastUpdated(WidgetDates.hm(at, envelope.timeZone)))
    if (!notice.isNullOrBlank()) parts.add(notice)
    return parts.joinToString(" · ")
  }

  /** 헤더 공통: 새로고침 버튼. */
  fun bindRefresh(context: Context, views: RemoteViews, type: OneFcWidgetType, widgetId: Int) {
    views.setOnClickPendingIntent(R.id.w_refresh, WidgetIntents.broadcast(context, type, WidgetIntents.ACTION_REFRESH, widgetId))
  }
}

/** 종류별 렌더러. API·인증·업무 로직 없이 봉투만 그린다. */
interface OneFcWidgetRenderer {
  val type: OneFcWidgetType

  /** READY / OFFLINE_STALE 일 때. payload 를 못 읽으면 null(엔진이 오류 화면). */
  fun render(context: Context, envelope: WidgetEnvelope, widgetId: Int, heightDp: Int, refreshing: Boolean): RemoteViews?

  /** 날짜·달 이동 등 인스턴스 상태 변경. 처리했으면 true. */
  fun handleAction(context: Context, envelope: WidgetEnvelope?, widgetId: Int, action: String, date: String?): Boolean

  /** payload 를 읽을 수 있는지(상태 판정용). */
  fun hasPayload(envelope: WidgetEnvelope): Boolean
}

package expo.modules.onefchomewidgets

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import android.widget.RemoteViewsService

/** 일정 위젯 선택 날짜 목록(스크롤). 캐시 봉투만 읽는다(API·인증 없음 → 배터리 영향 없음). */
class ScheduleWidgetListService : RemoteViewsService() {
  override fun onGetViewFactory(intent: Intent): RemoteViewsFactory =
    Factory(applicationContext, intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID))

  companion object {
    fun intent(context: Context, widgetId: Int): Intent {
      val intent = Intent(context, ScheduleWidgetListService::class.java).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
      // 위젯마다 다른 factory 를 쓰도록 data 를 구분한다.
      intent.data = Uri.parse("onefc-widget://schedule-list/$widgetId")
      return intent
    }
  }

  private class Factory(private val context: Context, private val widgetId: Int) : RemoteViewsFactory {
    private var rows: List<ScheduleListRows.Row> = emptyList()
    private var nonce = 0L

    override fun onCreate() {}

    override fun onDataSetChanged() {
      rows = try {
        val type = OneFcWidgetType.SCHEDULE
        val envelope = WidgetCacheManager.read(context, type)
        val payload = envelope?.let { SchedulePayload.parse(it) }
        if (envelope == null || payload == null) {
          emptyList()
        } else {
          val today = WidgetDates.today(envelope.timeZone)
          val selected = ScheduleWidgetRenderer.state(context, widgetId, today).selected
          val dayLink = WidgetDeepLink.build(envelope.scheme, type, WidgetDeepLink.Action.OPEN, mapOf("date" to selected)) ?: ""
          ScheduleListRows.rows(payload.events[selected].orEmpty(), dayLink)
        }
      } catch (error: Throwable) {
        emptyList()
      }
      nonce = System.currentTimeMillis() / 1000
    }

    override fun onDestroy() {
      rows = emptyList()
    }

    override fun getCount(): Int = rows.size

    override fun getViewAt(position: Int): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.onefc_widget_schedule_item)
      val row = rows.getOrNull(position) ?: return views
      views.setTextViewText(R.id.w_item_time, row.time)
      views.setTextViewText(R.id.w_item_title, row.title)
      views.setTextColor(R.id.w_item_title, context.getColor(if (row.done) R.color.onefc_widget_text_muted else R.color.onefc_widget_text))
      views.setContentDescription(R.id.w_item, row.description)
      if (row.link.isNotBlank()) {
        views.setOnClickFillInIntent(R.id.w_item, Intent().setData(Uri.parse(WidgetDeepLink.withNonce(row.link, nonce))))
      }
      return views
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = position.toLong()

    override fun hasStableIds(): Boolean = false
  }
}

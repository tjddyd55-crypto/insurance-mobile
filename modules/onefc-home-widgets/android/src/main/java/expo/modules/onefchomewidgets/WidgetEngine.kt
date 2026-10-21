package expo.modules.onefchomewidgets

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews

/** Provider → Engine → (Registry: OneFcWidgetType) → Cache → Renderer. provider 에 업무 로직을 두지 않는다. */
object WidgetEngine {
  private val renderers: Map<OneFcWidgetType, OneFcWidgetRenderer> = listOf(ScheduleWidgetRenderer, TodoWidgetRenderer).associateBy { it.type }

  fun renderer(type: OneFcWidgetType): OneFcWidgetRenderer? = if (type.enabled) renderers[type] else null

  fun widgetIds(context: Context, type: OneFcWidgetType): IntArray {
    val provider = type.providerClass ?: return IntArray(0)
    return try {
      AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, provider)) ?: IntArray(0)
    } catch (error: Exception) {
      IntArray(0)
    }
  }

  fun installedTypes(context: Context): List<OneFcWidgetType> = OneFcWidgetType.enabledTypes().filter { widgetIds(context, it).isNotEmpty() }

  fun renderAll(context: Context) {
    OneFcWidgetType.enabledTypes().forEach { render(context, it) }
  }

  fun render(context: Context, type: OneFcWidgetType, ids: IntArray? = null) {
    val manager = AppWidgetManager.getInstance(context)
    for (id in ids ?: widgetIds(context, type)) renderOne(context, manager, type, id)
  }

  fun renderOne(context: Context, manager: AppWidgetManager, type: OneFcWidgetType, widgetId: Int) {
    val views = try {
      build(context, manager, type, widgetId)
    } catch (error: Throwable) {
      // 그리기 실패: 서버·예외 원문 없이 공통 오류 화면.
      safeMessage(context, type, WidgetDisplayState.ERROR)
    }
    try {
      if (views != null) manager.updateAppWidget(widgetId, views)
      // 선택 날짜 목록(collection)도 같은 캐시로 다시 읽게 한다.
      if (type == OneFcWidgetType.SCHEDULE) manager.notifyAppWidgetViewDataChanged(widgetId, R.id.w_list)
    } catch (error: Throwable) {
    }
  }

  private fun safeMessage(context: Context, type: OneFcWidgetType, state: WidgetDisplayState): RemoteViews? =
    try { WidgetCommonViews.message(context, type, state, false) } catch (error: Throwable) { null }

  private fun build(context: Context, manager: AppWidgetManager, type: OneFcWidgetType, widgetId: Int): RemoteViews {
    val renderer = renderer(type) ?: return WidgetCommonViews.message(context, type, WidgetDisplayState.ERROR, false)
    val envelope = WidgetCacheManager.read(context, type)
    val refreshing = WidgetCacheManager.isRefreshing(context, type)
    val hasPayload = envelope != null && renderer.hasPayload(envelope)
    val state = WidgetDisplayState.resolve(envelope, WidgetCacheManager.clearReason(context), refreshing, hasPayload)
    if (envelope == null || !hasPayload || state !in setOf(WidgetDisplayState.READY, WidgetDisplayState.OFFLINE_STALE)) {
      return WidgetCommonViews.message(context, type, state, refreshing)
    }
    val height = heightDp(manager, widgetId, type.defaultHeightDp)
    return renderer.render(context, envelope, widgetId, height, refreshing)
      ?: WidgetCommonViews.message(context, type, WidgetDisplayState.ERROR, false)
  }

  private fun heightDp(manager: AppWidgetManager, widgetId: Int, fallback: Int): Int = try {
    val options = manager.getAppWidgetOptions(widgetId)
    options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT).takeIf { it > 0 } ?: fallback
  } catch (error: Exception) {
    fallback
  }

  /** 위젯 안 버튼. 새로고침은 종류별 30초 간격 제한 후 그 종류만 갱신. */
  fun handleAction(context: Context, type: OneFcWidgetType, widgetId: Int, action: String, date: String?) {
    if (action == WidgetIntents.ACTION_REFRESH) {
      if (WidgetCacheManager.tryBeginManualRefresh(context, type)) {
        render(context, type)
        WidgetScheduler.refreshNow(context, listOf(type), "manual", force = true)
      }
      return
    }
    val renderer = renderer(type) ?: return
    if (renderer.handleAction(context, WidgetCacheManager.read(context, type), widgetId, action, date)) {
      renderOne(context, AppWidgetManager.getInstance(context), type, widgetId)
    }
  }

  fun onAdded(context: Context, type: OneFcWidgetType) {
    WidgetScheduler.ensurePeriodic(context)
    // 처음 추가: 앱을 열지 않아도 로그인 상태면 바로 채운다(manual 아님 → 서버 refresh=1 없음).
    WidgetScheduler.refreshNow(context, listOf(type), "periodic", force = true)
  }

  fun onRemovedAll(context: Context) {
    if (installedTypes(context).isEmpty()) WidgetScheduler.cancelAll(context)
  }
}

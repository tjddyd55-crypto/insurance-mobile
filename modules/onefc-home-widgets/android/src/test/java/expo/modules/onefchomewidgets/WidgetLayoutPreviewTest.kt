package expo.modules.onefchomewidgets

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.RemoteViews
import android.widget.TextView
import androidx.test.core.app.ApplicationProvider
import expo.modules.onefchomewidgets.test.R as PreviewR
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

/**
 * 위젯 XML 을 샘플 스냅샷으로 측정해 PNG 로 남긴다.
 * Robolectric 캔버스는 글자 픽셀을 남기지 않으므로, 측정 결과만 JSON 으로 넘기고
 * src/test/python/render_widget_previews.py 가 같은 위치·sp 로 그린다.
 * 출력: ONEFC_WIDGET_PREVIEW_DIR (없으면 모듈 build/widget-previews)
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "ko-rKR-w360dp-h800dp-xhdpi")
class WidgetLayoutPreviewTest {
  private val outDir = File(System.getenv("ONEFC_WIDGET_PREVIEW_DIR")?.takeIf { it.isNotBlank() } ?: "build/widget-previews")
  private val scenes = JSONArray()

  @Test fun renderWidgetPreviews() {
    outDir.mkdirs()
    val context = ApplicationProvider.getApplicationContext<Context>()
    val scheduleRaw = scheduleRaw()
    val schedule = WidgetEnvelope.parse(scheduleRaw, OneFcWidgetType.SCHEDULE)!!

    val wide = apply(context, ScheduleWidgetRenderer.render(context, schedule, 1, 400, false)!!)
    val wideText = texts(wide)
    assertTrue(wideText.contains("2026년 10월"))
    assertFalse(wideText.contains("ONE FC 일정"))
    assertTrue(wideText.contains("미팅"))
    assertTrue(wideText.contains("+2"))
    capture("schedule-4x4", wide, 360, 400)

    val small = apply(context, ScheduleWidgetRenderer.render(context, schedule, 1, 210, false)!!)
    val smallText = texts(small)
    assertTrue(smallText.contains("2026년 10월"))
    assertFalse(smallText.contains("미팅"))
    assertTrue(smallText.contains("3"))
    assertTrue(smallText.contains("9+"))
    capture("schedule-small", small, 250, 210)

    assertTrue(WidgetCacheManager.write(context, OneFcWidgetType.SCHEDULE, scheduleRaw))
    val threeItems = dayDialog("2026-10-21")
    val dialogText = texts(threeItems)
    assertTrue(dialogText.contains("21"))
    assertTrue(dialogText.contains("수요일"))
    assertTrue(dialogText.contains("10:00"))
    assertTrue(dialogText.contains("미팅"))
    assertTrue(dialogText.contains("하루 종일"))
    assertTrue(dialogText.contains("✓"))
    assertTrue(dialogText.contains("10월 21일에 추가"))
    captureDialog("schedule-day-dialog", threeItems, 340)

    val empty = dayDialog("2026-10-22")
    assertTrue(texts(empty).contains("이 날 일정이 없습니다"))
    assertTrue(texts(empty).contains("10월 22일에 추가"))
    captureDialog("schedule-day-dialog-empty", empty, 340)

    // 많은 항목: 목록만 화면 높이 절반으로 잘리고 추가 버튼은 남는다.
    val many = dayDialog("2026-10-08")
    assertTrue(texts(many).contains("일정10"))
    val scroll = many.findViewById<View>(R.id.day_scroll)
    val half = (many.resources.displayMetrics.heightPixels * 0.5f).toInt()
    captureDialog("schedule-day-dialog-many", many, 340, maxHeightPx = half)
    assertTrue("scroll ${scroll.height} <= $half", scroll.height <= half)
    assertTrue(many.findViewById<View>(R.id.day_add).height > 0)

    val after = apply(context, TodoWidgetRenderer.render(context, WidgetEnvelope.parse(todoRaw(), OneFcWidgetType.TODO)!!, 2, 280, false)!!)
    val before = apply(context, beforeTodo(context))
    assertTrue(texts(after).contains("고객 상담 준비"))
    assertTrue(texts(before).contains("고객 상담 준비"))
    val afterTitle = after.findViewById<TextView>(R.id.w_title).textSize
    val beforeTitle = before.findViewById<TextView>(R.id.w_title).textSize
    assertTrue("after $afterTitle before $beforeTitle", afterTitle > beforeTitle + 1f)
    capture("todo-before-font", before, 320, 280)
    capture("todo-after-font", after, 320, 280)

    val model = File(outDir, "scenes.json")
    model.writeText(JSONObject().put("scenes", scenes).toString())
    val script = locateScript()
    val process = ProcessBuilder("python3", script.absolutePath, model.absolutePath, outDir.absolutePath)
      .redirectErrorStream(true)
      .start()
    val log = process.inputStream.bufferedReader().readText()
    val code = process.waitFor()
    assertTrue(log, code == 0)
    val beforePng = File(outDir, "todo-before-font.png").readBytes()
    val afterPng = File(outDir, "todo-after-font.png").readBytes()
    assertNotEquals(beforePng.size, 0)
    assertFalse(beforePng.contentEquals(afterPng))
    for (name in listOf("schedule-4x4", "schedule-small", "schedule-day-dialog", "schedule-day-dialog-empty", "schedule-day-dialog-many", "todo-before-font", "todo-after-font")) {
      assertTrue(name, File(outDir, "$name.png").length() > 2_000)
    }
  }

  private fun dayDialog(date: String): View {
    val activity = Robolectric.buildActivity(
      ScheduleDayActivity::class.java,
      Intent().putExtra(ScheduleDayActivity.EXTRA_DATE, date),
    ).setup().get()
    return activity.findViewById(R.id.day_card)
  }

  /** 다이얼로그는 실제 drawable 색·모서리로 그린다. maxHeightPx 가 있으면 목록 높이를 기기 규칙대로 자른다. */
  private fun captureDialog(name: String, view: View, widthDp: Int, maxHeightPx: Int? = null) {
    val width = dp(view, widthDp)
    fun measure() {
      view.measure(View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(dp(view, 2000), View.MeasureSpec.AT_MOST))
      view.layout(0, 0, view.measuredWidth, view.measuredHeight)
    }
    measure()
    val scroll = view.findViewById<View>(R.id.day_scroll)
    if (maxHeightPx != null && scroll.height > maxHeightPx) {
      scroll.layoutParams.height = maxHeightPx
      measure()
    }
    val nodes = JSONArray()
    collectReal(view, 0, 0, nodes)
    scenes.put(JSONObject().put("name", name).put("width", view.width).put("height", view.height).put("background", "#8A8F8C").put("nodes", nodes))
  }

  private fun collectReal(view: View, originX: Int, originY: Int, nodes: JSONArray) {
    if (view.visibility != View.VISIBLE || view.width <= 0 || view.height <= 0) return
    val x = originX + view.left
    val y = originY + view.top
    val bg = view.background as? android.graphics.drawable.GradientDrawable
    if (bg != null) {
      val node = JSONObject().put("kind", "box").put("x", x).put("y", y).put("w", view.width).put("h", view.height)
        .put("fill", String.format("#%06X", 0xFFFFFF and (bg.color?.defaultColor ?: Color.WHITE)))
        .put("radius", bg.cornerRadius.toDouble())
      if (view.id == R.id.day_card) node.put("stroke", "#E2E6E3").put("strokeWidth", view.resources.displayMetrics.density.toDouble())
      nodes.put(node)
    }
    if (view is TextView && !view.text.isNullOrEmpty()) nodes.put(label(view, x, y))
    if (view is ViewGroup) {
      val clip = view.id == R.id.day_scroll
      for (index in 0 until view.childCount) {
        if (clip) {
          val sub = JSONArray()
          collectReal(view.getChildAt(index), x, y, sub)
          // 스크롤 아래로 넘친 카드는 글자까지 통째로 뺀다(잘린 카드 위치부터 아래 전부).
          val bottom = y + view.height
          var cutoff = Int.MAX_VALUE
          for (i in 0 until sub.length()) {
            val n = sub.getJSONObject(i)
            if (n.getInt("y") + n.getInt("h") > bottom) cutoff = minOf(cutoff, n.getInt("y"))
          }
          for (i in 0 until sub.length()) {
            val n = sub.getJSONObject(i)
            if (n.getInt("y") < cutoff) nodes.put(n)
          }
        } else collectReal(view.getChildAt(index), x, y, nodes)
      }
    }
  }

  private fun locateScript(): File {
    val candidates = listOf(
      File("src/test/python/render_widget_previews.py"),
      File("modules/onefc-home-widgets/android/src/test/python/render_widget_previews.py"),
    )
    return candidates.firstOrNull { it.exists() } ?: error("preview renderer missing: ${candidates.map { it.absolutePath }}")
  }

  private fun beforeTodo(context: Context): RemoteViews {
    val views = RemoteViews(context.packageName, PreviewR.layout.onefc_widget_todo_before)
    views.setTextViewText(R.id.w_day_label, "오늘 · 10월 21일")
    views.setViewVisibility(R.id.w_to_today, View.GONE)
    views.setViewVisibility(R.id.w_empty_box, View.GONE)
    views.setViewVisibility(R.id.w_more, View.GONE)
    val items = listOf("○" to "고객 상담 준비", "✓" to "보험료 납입 확인", "○" to "청구 서류 보내기", "○" to "명함 정리")
    items.forEachIndexed { index, (mark, title) ->
      views.setViewVisibility(WidgetIds.TODOS[index], View.VISIBLE)
      views.setTextViewText(WidgetIds.TODO_CHECKS[index], mark)
      views.setTextViewText(WidgetIds.TODO_TITLES[index], title)
    }
    for (index in items.size until WidgetIds.TODOS.size) views.setViewVisibility(WidgetIds.TODOS[index], View.GONE)
    views.setTextViewText(R.id.w_status, "마지막 업데이트 10:00")
    return views
  }

  private fun apply(context: Context, views: RemoteViews): View {
    val host = FrameLayout(context)
    val applied = views.apply(context, host)
    applied.layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    host.addView(applied)
    return host
  }

  private fun capture(name: String, view: View, widthDp: Int, heightDp: Int) {
    val width = dp(view, widthDp)
    val height = dp(view, heightDp)
    view.measure(View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY))
    view.layout(0, 0, view.measuredWidth, view.measuredHeight)
    scenes.put(scene(name, view))
  }

  private fun captureWrap(name: String, view: View, widthDp: Int) {
    val width = dp(view, widthDp)
    view.measure(View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(dp(view, 800), View.MeasureSpec.AT_MOST))
    view.layout(0, 0, view.measuredWidth, view.measuredHeight)
    scenes.put(scene(name, view))
  }

  private fun scene(name: String, view: View): JSONObject {
    val nodes = JSONArray()
    collect(view, 0, 0, nodes, forceCard = view.background != null && view.id != R.id.w_root)
    return JSONObject().put("name", name).put("width", view.width).put("height", view.height).put("nodes", nodes)
  }

  private fun collect(view: View, originX: Int, originY: Int, nodes: JSONArray, forceCard: Boolean) {
    if (view.visibility != View.VISIBLE || view.width <= 0 || view.height <= 0) return
    val x = originX + view.left
    val y = originY + view.top
    val card = forceCard || view.id == R.id.w_root
    if (view.background != null) nodes.put(box(view, x, y, card))
    if (view is TextView && !view.text.isNullOrEmpty()) nodes.put(label(view, x, y))
    if (view is ImageView && (view.id == R.id.w_add || view.id == R.id.w_refresh)) nodes.put(icon(view, x, y))
    if (view is ViewGroup) for (index in 0 until view.childCount) collect(view.getChildAt(index), x, y, nodes, false)
  }

  private fun box(view: View, x: Int, y: Int, card: Boolean): JSONObject {
    val density = view.resources.displayMetrics.density
    val text = view as? TextView
    val whiteText = text != null && Color.red(text.currentTextColor) > 240 && Color.green(text.currentTextColor) > 240
    val fill = when {
      card -> "#FFFFFF"
      whiteText -> "#065123"
      else -> "#E6F1EA"
    }
    val radius = when {
      card -> 16f * density
      whiteText -> 8f * density
      text != null -> 3f * density
      else -> 12f * density
    }
    val node = JSONObject().put("kind", "box").put("x", x).put("y", y).put("w", view.width).put("h", view.height).put("fill", fill).put("radius", radius.toDouble())
    if (card || text == null) node.put("stroke", if (card) "#E2E6E3" else "#065123").put("strokeWidth", density.toDouble().coerceAtLeast(1.0))
    return node
  }

  private fun label(view: TextView, x: Int, y: Int): JSONObject {
    val vertical = view.gravity and Gravity.VERTICAL_GRAVITY_MASK
    val horizontal = view.gravity and Gravity.HORIZONTAL_GRAVITY_MASK
    val gravity = buildString {
      append(if (horizontal == Gravity.CENTER_HORIZONTAL || horizontal == Gravity.CENTER) "center_h" else if (horizontal == Gravity.RIGHT || horizontal == Gravity.END) "end" else "start")
      append(" ")
      append(if (vertical == Gravity.CENTER_VERTICAL || vertical == Gravity.CENTER) "center_v" else if (vertical == Gravity.BOTTOM) "bottom" else "top")
    }
    return JSONObject()
      .put("kind", "text")
      .put("x", x).put("y", y).put("w", view.width).put("h", view.height)
      .put("text", view.text.toString())
      .put("size", view.textSize.toDouble())
      .put("color", String.format("#%06X", 0xFFFFFF and view.currentTextColor))
      .put("bold", view.typeface?.isBold == true)
      .put("gravity", gravity)
      .put("padX", view.paddingLeft)
      .put("padY", view.paddingTop)
      // ellipsize 가 없는 wrap_content 글자는 측정 폭이 글꼴마다 달라도 자르지 않는다.
      .put("ellipsize", view.ellipsize != null)
  }

  private fun icon(view: ImageView, x: Int, y: Int) = JSONObject()
    .put("kind", "icon")
    .put("name", if (view.id == R.id.w_add) "add" else "refresh")
    .put("x", x + view.paddingLeft).put("y", y + view.paddingTop)
    .put("w", view.width - view.paddingLeft - view.paddingRight)
    .put("h", view.height - view.paddingTop - view.paddingBottom)

  private fun dp(view: View, value: Int) = (value * view.resources.displayMetrics.density).toInt()

  private fun texts(view: View): String {
    val builder = StringBuilder()
    fun walk(node: View) {
      if (node is TextView && node.visibility == View.VISIBLE) builder.append(node.text).append('\n')
      if (node is ViewGroup) for (index in 0 until node.childCount) walk(node.getChildAt(index))
    }
    walk(view)
    return builder.toString()
  }

  private fun scheduleRaw(): String {
    fun item(id: String, title: String, time: String, kind: String, done: Boolean) =
      """{"id":"$id","title":"$title","time":"$time","kind":"$kind","done":$done,"link":"onefc://schedule?date=2026-10-21&src=widget&wt=schedule"}"""
    val day21 = listOf(
      item("e1", "미팅", "10:00", "event", false),
      item("e2", "고객 상담", "14:00", "event", false),
      item("e3", "청약 검토", "", "event", false),
      item("t1", "서류 제출", "", "onefc_todo", true),
    ).joinToString(",")
    val busy = (1..10).joinToString(",") { item("b$it", "일정$it", "09:00", "event", false) }
    return """{"schemaVersion":1,"widgetType":"schedule","accountKey":"u:1|ga:2","scheme":"onefc","timeZone":"UTC",
      "generatedAt":"2026-10-21T01:00:00.000Z","lastSuccessfulSyncAt":"2026-10-21T01:00:00.000Z","authState":"signed_in",
      "syncState":"ready","errorCode":null,"payload":{"visibleRange":{"from":"2026-09-01","to":"2026-12-31"},"events":[
        {"date":"2026-10-21","items":[$day21]},
        {"date":"2026-10-08","items":[$busy]}
      ]}}"""
  }

  /** 할 일 위젯은 실제 오늘 날짜를 연다. 고정 날짜를 쓰면 날짜가 바뀌는 순간 목록이 비어 테스트가 깨진다. */
  private fun todoRaw(today: String = WidgetDates.today("UTC")) = """{"schemaVersion":1,"widgetType":"todo","accountKey":"u:1|ga:2","scheme":"onefc","timeZone":"UTC",
    "generatedAt":"2026-10-21T01:00:00.000Z","lastSuccessfulSyncAt":"2026-10-21T01:00:00.000Z","authState":"signed_in",
    "syncState":"ready","errorCode":null,"payload":{"visibleRange":{"from":"2026-09-01","to":"2026-12-31"},"todos":[
      {"date":"$today","items":[
        {"id":"1","title":"고객 상담 준비","completed":false,"link":"onefc://todos/1/edit?src=widget&wt=todo"},
        {"id":"2","title":"보험료 납입 확인","completed":true,"link":"onefc://todos/2/edit?src=widget&wt=todo"},
        {"id":"3","title":"청구 서류 보내기","completed":false,"link":"onefc://todos/3/edit?src=widget&wt=todo"},
        {"id":"4","title":"명함 정리","completed":false,"link":"onefc://todos/4/edit?src=widget&wt=todo"}
      ]}]}}"""
}

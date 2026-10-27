package expo.modules.onefchomewidgets

import android.app.Activity
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

/**
 * 위젯 날짜 칸에서 여는 모달. 목록은 스냅샷이고, 항목·로그인은 기존 src=widget deep link 로 앱에 넘긴다.
 * 빠른 추가는 앱 JS headless(OneFcWidgetQuickAdd)가 기존 세션·서버 API 로 저장한다. 여기서는 토큰도 서버 호출도 없다.
 * 앱 안의 저장·취소·뒤로가기는 moveTaskToBack 규칙을 그대로 쓴다.
 *
 * mode: day(날짜 칸) · createEvent(일정 위젯 +) · createTodo(할 일 위젯 +). + 모드는 목록을 숨기고
 * 날짜(DatePicker)·종일/시간지정(일정만)을 고른 뒤 저장 성공 시 위젯을 즉시 다시 그리고 finish() 로 홈에 돌아간다.
 *
 * 키보드: manifest 의 adjustResize 를 유지(시스템이 창을 키보드 위로 올림)하고, 리스너는 카드 높이 상한만 정한다.
 * 상한 = 화면 높이 − (IME 또는 내비 바 중 큰 하단) − 상태 바 − 여백. 줄어든 창 높이가 아니라 화면 높이에서 빼므로
 * adjustResize 와 이중 보정되지 않는다. 목록(ScrollView 0dp/weight=1)만 줄고 입력 영역은 항상 보인다.
 */
class ScheduleDayActivity : Activity() {
  private lateinit var date: String
  private var mode = MODE_DAY
  private var allDay = true
  private var startTime = DEFAULT_START
  private var endTime = DEFAULT_END
  private val quick = ScheduleQuickAdd.Session()
  private val main = Handler(Looper.getMainLooper())
  private var created: List<ScheduleQuickAdd.Result> = emptyList()
  private var timeout: Runnable? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val requested = intent.getStringExtra(EXTRA_DATE)
    if (!WidgetDates.isYmd(requested)) {
      finish()
      return
    }
    date = requested!!
    mode = normalizeMode(intent.getStringExtra(EXTRA_MODE))
    setContentView(R.layout.onefc_day_dialog)
    bindInput()
    bindCreateOptions()
    reload()
    watchInsets()
    if (creating) {
      val input = findViewById<EditText>(R.id.day_input)
      input.requestFocus()
      window.setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE or android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
    }
  }

  private val creating get() = mode != MODE_DAY
  private val todoMode get() = mode == MODE_CREATE_TODO

  override fun onDestroy() {
    quick.busyId?.let { QuickAddBus.cancel(it) }
    timeout?.let { main.removeCallbacks(it) }
    super.onDestroy()
  }

  /** 캐시를 다시 읽고, 방금 만든 일정이 아직 없으면 끝에 붙인다. */
  private fun reload() {
    var content = ScheduleDayModel.content(WidgetCacheManager.read(this, OneFcWidgetType.SCHEDULE), WidgetCacheManager.clearReason(this), date)
    val scheme = WidgetCacheManager.read(this, OneFcWidgetType.SCHEDULE)?.scheme
    for (result in created) content = ScheduleQuickAdd.withCreated(content, result, scheme)
    bind(content)
  }

  /** IME·시스템 바 인셋이 바뀔 때마다 카드 높이 상한을 다시 계산(예전 일회성 50% 상한 대체). */
  private fun watchInsets() {
    val card = findViewById<View>(R.id.day_card)
    val margin = resources.getDimensionPixelSize(R.dimen.onefc_day_dialog_margin)
    window.decorView.setOnApplyWindowInsetsListener { view, insets ->
      val (top, bottom) = if (android.os.Build.VERSION.SDK_INT >= 30) {
        val bars = insets.getInsets(WindowInsets.Type.systemBars())
        val ime = insets.getInsets(WindowInsets.Type.ime())
        bars.top to maxOf(bars.bottom, ime.bottom)
      } else {
        @Suppress("DEPRECATION")
        insets.systemWindowInsetTop to insets.systemWindowInsetBottom
      }
      val screen = resources.displayMetrics.heightPixels
      val cap = (screen - top - bottom - margin * 2).coerceAtLeast(0)
      card.post { applyCap(card, cap) }
      view.onApplyWindowInsets(insets)
    }
    window.decorView.requestApplyInsets()
  }

  /** 자연 높이가 상한보다 크면 카드를 상한으로 고정(목록만 줄어듦), 아니면 wrap_content. */
  private fun applyCap(card: View, cap: Int) {
    val params = card.layoutParams ?: return
    val width = View.MeasureSpec.makeMeasureSpec(card.width.coerceAtLeast(0), if (card.width > 0) View.MeasureSpec.EXACTLY else View.MeasureSpec.UNSPECIFIED)
    card.measure(width, View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
    val next = if (cap > 0 && card.measuredHeight > cap) cap else ViewGroup.LayoutParams.WRAP_CONTENT
    if (params.height != next) {
      params.height = next
      card.layoutParams = params
    }
  }

  private fun bind(content: ScheduleDayModel.Content) {
    val number = findViewById<TextView>(R.id.day_number)
    number.visibility = if (content.dayNumber.isBlank()) View.GONE else View.VISIBLE
    number.text = content.dayNumber
    // 숫자가 있으면 옆에 요일만, 없으면(로그인 등) 기존 제목 그대로.
    findViewById<TextView>(R.id.day_title).text = if (content.dayNumber.isBlank()) content.title else content.weekday
    findViewById<View>(R.id.day_card).contentDescription = content.title
    findViewById<View>(R.id.day_close).setOnClickListener { finish() }
    val message = findViewById<TextView>(R.id.day_message)
    val rows = findViewById<LinearLayout>(R.id.day_rows)
    if (creating && content.mode != ScheduleDayModel.Mode.LOGIN) {
      // + 모드: 목록 없이 입력만. 머리글은 고른 날짜 + "일정/할 일 추가".
      findViewById<TextView>(R.id.day_title).text = getString(if (todoMode) R.string.onefc_widget_day_add_todo else R.string.onefc_widget_day_add_event)
      findViewById<View>(R.id.day_scroll).visibility = View.GONE
      rows.removeAllViews()
      bindBottom(content)
      return
    }
    findViewById<View>(R.id.day_scroll).visibility = View.VISIBLE
    message.visibility = if (content.mode == ScheduleDayModel.Mode.LIST) View.GONE else View.VISIBLE
    message.text = messageFor(content.mode)
    message.setOnClickListener { if (content.mode != ScheduleDayModel.Mode.LIST) open(content.openLink) }
    fillRows(rows, content)
    bindBottom(content)
  }

  private fun messageFor(mode: ScheduleDayModel.Mode): String = when (mode) {
    ScheduleDayModel.Mode.LOGIN -> "${WidgetCopy.LOGIN_REQUIRED}\n${WidgetCopy.LOGIN_HINT}"
    ScheduleDayModel.Mode.PREPARE -> WidgetCopy.PREPARE_HINT
    ScheduleDayModel.Mode.OUT_OF_RANGE -> "이 날짜는 앱에서 볼 수 있어요"
    ScheduleDayModel.Mode.EMPTY -> getString(R.string.onefc_widget_empty_schedule)
    ScheduleDayModel.Mode.LIST -> ""
  }

  private fun fillRows(rows: LinearLayout, content: ScheduleDayModel.Content) {
    rows.removeAllViews()
    if (content.mode != ScheduleDayModel.Mode.LIST) return
    for (row in content.rows) {
      val line = layoutInflater.inflate(R.layout.onefc_day_row, rows, false)
      line.findViewById<TextView>(R.id.day_row_mark).text = if (row.todo) (if (row.done) "✓" else "○") else "●"
      line.findViewById<TextView>(R.id.day_row_time).text = row.time
      line.findViewById<TextView>(R.id.day_row_title).text = if (row.todo && row.done) row.title.removePrefix("✓ ") else row.title
      line.contentDescription = row.description
      // 일정은 상세·수정 화면(date+event), 할 일은 수정 화면으로. 저장·취소 후 위젯 복귀.
      line.setOnClickListener { open(row.link) }
      rows.addView(line)
    }
  }

  private fun bindBottom(content: ScheduleDayModel.Content) {
    val inputRow = findViewById<View>(R.id.day_input_row)
    val login = findViewById<TextView>(R.id.day_login)
    val opts = findViewById<View>(R.id.day_create_opts)
    if (content.mode == ScheduleDayModel.Mode.LOGIN) {
      opts.visibility = View.GONE
      inputRow.visibility = View.GONE
      findViewById<View>(R.id.day_error).visibility = View.GONE
      login.visibility = View.VISIBLE
      // 로그인 후 같은 Native 화면(mode·date)으로 돌아오도록 quick 링크. scheme 을 모르면 기존 링크.
      val scheme = WidgetCacheManager.read(this, OneFcWidgetType.SCHEDULE)?.scheme ?: WidgetCacheManager.read(this, OneFcWidgetType.TODO)?.scheme ?: WidgetCacheManager.scheme(this)
      login.setOnClickListener { open(scheme?.let { WidgetDeepLink.quickEntry(it, mode, date) } ?: content.openLink) }
      return
    }
    login.visibility = View.GONE
    // 준비 전(캐시 없음)에는 서버 상태를 모르므로 입력 대신 앱을 열게 한다.
    // + 모드는 위젯 캐시 종류와 무관하게 입력을 연다(로그인 여부는 headless 가 code=login 으로 알려 준다).
    val canAdd = creating || !content.addLink.isNullOrBlank()
    inputRow.visibility = if (canAdd) View.VISIBLE else View.GONE
    opts.visibility = if (creating) View.VISIBLE else View.GONE
    findViewById<EditText>(R.id.day_input).hint = when {
      todoMode -> getString(R.string.onefc_widget_day_todo_hint)
      creating -> getString(R.string.onefc_widget_day_event_hint)
      else -> getString(R.string.onefc_widget_day_add, content.monthDay.ifBlank { content.title })
    }
    // 접근성: 전송 버튼은 모드별로 '할 일 저장' / '일정 저장'(시각 UI 불변).
    findViewById<View>(R.id.day_send).contentDescription = getString(sendDescription(mode))
    if (creating) refreshCreateOptions()
  }

  private fun bindCreateOptions() {
    findViewById<View>(R.id.day_date_chip).setOnClickListener {
      if (quick.busy) return@setOnClickListener
      val (y, m, d) = date.split("-").map { it.toInt() }
      DatePickerDialog(this, { _, year, month, day ->
        date = "%04d-%02d-%02d".format(year, month + 1, day)
        showError(null)
        reload()
      }, y, m - 1, d).show()
    }
    findViewById<View>(R.id.day_allday).setOnClickListener { if (!quick.busy) { allDay = true; refreshCreateOptions() } }
    findViewById<View>(R.id.day_timed).setOnClickListener { if (!quick.busy) { allDay = false; refreshCreateOptions() } }
    findViewById<View>(R.id.day_start).setOnClickListener { pickTime(startTime) { picked ->
      startTime = picked
      // 기존 일정 정책(setScheduleTimeSpecified): 종료가 시작보다 뒤가 아니면 시작+1시간.
      if (endTime <= startTime) endTime = ScheduleQuickAdd.sensibleEnd(startTime)
    } }
    findViewById<View>(R.id.day_end).setOnClickListener { pickTime(endTime) { picked ->
      endTime = if (picked > startTime) picked else ScheduleQuickAdd.sensibleEnd(startTime)
    } }
  }

  private fun pickTime(current: String, apply: (String) -> Unit) {
    if (quick.busy) return
    val (h, m) = current.split(":").map { it.toInt() }
    TimePickerDialog(this, { _, hour, minute ->
      apply("%02d:%02d".format(hour, minute))
      refreshCreateOptions()
    }, h, m, true).show()
  }

  private fun refreshCreateOptions() {
    findViewById<TextView>(R.id.day_date_chip).text = "${WidgetDates.dayTitle(date)} ▾"
    findViewById<View>(R.id.day_allday_row).visibility = if (todoMode) View.GONE else View.VISIBLE
    findViewById<View>(R.id.day_time_row).visibility = if (!todoMode && !allDay) View.VISIBLE else View.GONE
    findViewById<View>(R.id.day_allday).alpha = if (allDay) 1f else 0.45f
    findViewById<View>(R.id.day_timed).alpha = if (allDay) 0.45f else 1f
    findViewById<TextView>(R.id.day_start).text = startTime
    findViewById<TextView>(R.id.day_end).text = endTime
  }

  private fun bindInput() {
    val input = findViewById<EditText>(R.id.day_input)
    val send = findViewById<View>(R.id.day_send)
    input.addTextChangedListener(object : TextWatcher {
      override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
      override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
      override fun afterTextChanged(s: Editable?) {
        if (!quick.busy) findViewById<View>(R.id.day_error).visibility = View.GONE
        refreshSend()
      }
    })
    input.setOnEditorActionListener { _, action, event ->
      val enter = event?.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN
      if (action == EditorInfo.IME_ACTION_DONE || action == EditorInfo.IME_ACTION_SEND || enter) {
        submit()
        true
      } else false
    }
    send.setOnClickListener { submit() }
    refreshSend()
  }

  private fun refreshSend() {
    val input = findViewById<EditText>(R.id.day_input)
    val send = findViewById<View>(R.id.day_send)
    val enabled = ScheduleQuickAdd.canSubmit(input.text, quick.busy)
    send.isEnabled = enabled
    send.alpha = if (enabled) 1f else 0.35f
    input.isEnabled = !quick.busy
  }

  private fun submit() {
    val input = findViewById<EditText>(R.id.day_input)
    if (!ScheduleQuickAdd.canSubmit(input.text, quick.busy)) return
    val title = ScheduleQuickAdd.normalize(input.text)
    // 같은 입력(날짜·종류·시간·제목)일 때만 requestId 를 재사용한다.
    val requestId = quick.begin(requestKey(), title) ?: return
    val kind = if (todoMode) "todo" else "event"
    val timed = creating && !todoMode && !allDay
    val saveDate = date
    val start = startTime
    val end = endTime
    showError(null)
    findViewById<TextView>(R.id.day_send).text = "…"
    refreshSend()
    QuickAddBus.listen(requestId) { json -> onResult(requestId, json) }
    val expire = Runnable {
      QuickAddBus.cancel(requestId)
      onResult(requestId, null)
    }
    timeout = expire
    main.postDelayed(expire, ScheduleQuickAdd.TASK_TIMEOUT_MS + 10_000L)
    val app = applicationContext
    Thread {
      val finished = WidgetHeadless.run(app, ScheduleQuickAdd.TASK_NAME, ScheduleQuickAdd.TASK_TIMEOUT_MS) { data ->
        data.putString("requestId", requestId)
        data.putString("date", saveDate)
        data.putString("title", title)
        data.putString("kind", kind)
        data.putString("allDay", if (timed) "false" else "true")
        if (timed) {
          data.putString("startTime", start)
          data.putString("endTime", end)
        }
      }
      // headless 를 못 띄웠으면(앱 JS 없음) 바로 실패로.
      if (!finished) QuickAddBus.report(requestId, "")
    }.start()
  }

  private fun onResult(requestId: String, json: String?) {
    val result = ScheduleQuickAdd.parse(json)?.takeIf { it.requestId == requestId }
    val ok = result?.ok == true
    if (!quick.finish(requestId, ok)) return
    timeout?.let { main.removeCallbacks(it) }
    timeout = null
    findViewById<TextView>(R.id.day_send).text = "+"
    val input = findViewById<EditText>(R.id.day_input)
    if (ok && creating) {
      // + 모드: 위젯 스냅샷을 바로 다시 그리고(JS refreshWidgets 가 쓴 캐시) 홈으로.
      WidgetEngine.render(this, OneFcWidgetType.SCHEDULE)
      if (todoMode) WidgetEngine.render(this, OneFcWidgetType.TODO)
      finish()
      return
    } else if (ok) {
      created = created + result!!
      input.setText("")
      reload()
      WidgetEngine.render(this, OneFcWidgetType.SCHEDULE)
    } else if (result?.code == "login") {
      reload()
      showError(result.message)
    } else {
      // 입력은 그대로 두고 같은 requestId 로 다시 보낼 수 있다(중복 생성 없음).
      showError(result?.message?.takeIf { it.isNotBlank() } ?: ScheduleQuickAdd.TIMEOUT_MESSAGE)
    }
    refreshSend()
    if (!ok) {
      input.requestFocus()
      (getSystemService(INPUT_METHOD_SERVICE) as? InputMethodManager)?.showSoftInput(input, 0)
    }
  }

  private fun showError(message: String?) {
    val error = findViewById<TextView>(R.id.day_error)
    error.text = message.orEmpty()
    error.visibility = if (message.isNullOrBlank()) View.GONE else View.VISIBLE
  }

  /** 앱 태스크로 넘기고 다이얼로그 태스크는 끝낸다. 이후 복귀는 앱의 moveTaskToBack. */
  private fun open(link: String?) {
    if (quick.busy) return
    val intent = if (link.isNullOrBlank()) {
      packageManager.getLaunchIntentForPackage(packageName)
    } else {
      Intent(Intent.ACTION_VIEW, Uri.parse(WidgetDeepLink.withNonce(link, System.currentTimeMillis() / 1000))).setPackage(packageName)
    } ?: return
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    startActivity(intent)
    finish()
  }

  /** 미리보기·테스트용: 결과 JSON 을 받은 것처럼 처리. */
  internal fun deliverForTest(requestId: String, json: String?) = onResult(requestId, json)

  internal fun beginForTest(title: String): String? {
    findViewById<EditText>(R.id.day_input).setText(title)
    val id = quick.begin(requestKey(), ScheduleQuickAdd.normalize(title)) ?: return null
    findViewById<TextView>(R.id.day_send).text = "…"
    refreshSend()
    return id
  }

  private fun requestKey(): String = if (!creating) date else "$date|$mode|${if (todoMode || allDay) "all" else "$startTime-$endTime"}"

  companion object {
    const val EXTRA_DATE = "date"
    const val EXTRA_MODE = "mode"
    const val MODE_DAY = "day"
    const val MODE_CREATE_EVENT = "createEvent"
    const val MODE_CREATE_TODO = "createTodo"
    // scheduleModel DEFAULT_SCHEDULE_START_TIME / sensibleEndTime 과 같은 값.
    const val DEFAULT_START = "09:00"
    const val DEFAULT_END = "10:00"

    fun normalizeMode(raw: String?): String = when (raw) {
      MODE_CREATE_EVENT, MODE_CREATE_TODO -> raw
      else -> MODE_DAY
    }

    /** 전송(+) 버튼 접근성 라벨 리소스. */
    fun sendDescription(mode: String?): Int = if (normalizeMode(mode) == MODE_CREATE_TODO) R.string.onefc_widget_day_send_todo else R.string.onefc_widget_day_send

    /** PendingIntent requestCode: 날짜+mode. */
    fun requestCode(date: String, mode: String): Int = "$date|${normalizeMode(mode)}".hashCode()
  }
}

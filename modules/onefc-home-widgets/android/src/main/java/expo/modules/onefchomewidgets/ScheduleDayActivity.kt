package expo.modules.onefchomewidgets

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/**
 * 위젯 날짜 칸에서 여는 모달. 목록은 스냅샷이고, 항목·로그인은 기존 src=widget deep link 로 앱에 넘긴다.
 * 빠른 추가는 앱 JS headless(OneFcWidgetQuickAdd)가 기존 세션·서버 API 로 저장한다. 여기서는 토큰도 서버 호출도 없다.
 * 앱 안의 저장·취소·뒤로가기는 moveTaskToBack 규칙을 그대로 쓴다.
 */
class ScheduleDayActivity : Activity() {
  private lateinit var date: String
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
    setContentView(R.layout.onefc_day_dialog)
    bindInput()
    reload()
    capList()
  }

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

  /** 항목이 많으면 목록만 스크롤하고 입력칸은 아래에 남긴다. */
  private fun capList() {
    val scroll = findViewById<ScrollView>(R.id.day_scroll)
    val max = (resources.displayMetrics.heightPixels * 0.5f).toInt()
    scroll.viewTreeObserver.addOnGlobalLayoutListener(object : android.view.ViewTreeObserver.OnGlobalLayoutListener {
      override fun onGlobalLayout() {
        if (scroll.height > max) {
          scroll.layoutParams.height = max
          scroll.requestLayout()
        }
        scroll.viewTreeObserver.removeOnGlobalLayoutListener(this)
      }
    })
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
    if (content.mode == ScheduleDayModel.Mode.LOGIN) {
      inputRow.visibility = View.GONE
      findViewById<View>(R.id.day_error).visibility = View.GONE
      login.visibility = View.VISIBLE
      login.setOnClickListener { open(content.openLink) }
      return
    }
    login.visibility = View.GONE
    // 준비 전(캐시 없음)에는 서버 상태를 모르므로 입력 대신 앱을 열게 한다.
    val canAdd = !content.addLink.isNullOrBlank()
    inputRow.visibility = if (canAdd) View.VISIBLE else View.GONE
    findViewById<EditText>(R.id.day_input).hint = getString(R.string.onefc_widget_day_add, content.monthDay.ifBlank { content.title })
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
    val requestId = quick.begin(date, title) ?: return
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
        data.putString("date", date)
        data.putString("title", title)
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
    if (ok) {
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
    val id = quick.begin(date, ScheduleQuickAdd.normalize(title)) ?: return null
    findViewById<TextView>(R.id.day_send).text = "…"
    refreshSend()
    return id
  }

  companion object {
    const val EXTRA_DATE = "date"
  }
}

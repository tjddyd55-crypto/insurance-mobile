package expo.modules.onefchomewidgets

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/**
 * 위젯 날짜 칸에서 여는 가벼운 다이얼로그. 목록은 스냅샷뿐이고,
 * 항목·추가·로그인은 기존 src=widget deep link 로 앱에 넘긴 뒤 자신을 닫는다.
 * 앱 안의 저장·취소·뒤로가기는 moveTaskToBack 규칙을 그대로 쓴다.
 */
class ScheduleDayActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val date = intent.getStringExtra(EXTRA_DATE)
    if (!WidgetDates.isYmd(date)) {
      finish()
      return
    }
    setContentView(R.layout.onefc_day_dialog)
    bind(ScheduleDayModel.content(WidgetCacheManager.read(this, OneFcWidgetType.SCHEDULE), WidgetCacheManager.clearReason(this), date!!))
    capList()
  }

  /** 항목이 많으면 목록만 스크롤하고 추가 버튼은 아래에 남긴다. */
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
    bindAdd(content)
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
      line.setOnClickListener { open(row.link) }
      rows.addView(line)
    }
  }

  private fun bindAdd(content: ScheduleDayModel.Content) {
    val add = findViewById<View>(R.id.day_add)
    val label = findViewById<TextView>(R.id.day_add_label)
    val login = content.mode == ScheduleDayModel.Mode.LOGIN
    val link = if (login) content.openLink else content.addLink
    if (!login && link.isNullOrBlank()) {
      add.visibility = View.GONE
      return
    }
    add.visibility = View.VISIBLE
    findViewById<View>(R.id.day_add_plus).visibility = if (login) View.GONE else View.VISIBLE
    label.text = if (login) getString(R.string.onefc_widget_day_login) else getString(R.string.onefc_widget_day_add, content.monthDay.ifBlank { content.title })
    add.contentDescription = label.text
    // 입력은 기존 일정 추가 화면(date 미리 채움, src=widget)에서 한다. 저장·취소 후 moveTaskToBack 복귀.
    add.setOnClickListener { open(link) }
  }

  /** 앱 태스크로 넘기고 다이얼로그 태스크는 끝낸다. 이후 복귀는 앱의 moveTaskToBack. */
  private fun open(link: String?) {
    val intent = if (link.isNullOrBlank()) {
      packageManager.getLaunchIntentForPackage(packageName)
    } else {
      Intent(Intent.ACTION_VIEW, Uri.parse(WidgetDeepLink.withNonce(link, System.currentTimeMillis() / 1000))).setPackage(packageName)
    } ?: return
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    startActivity(intent)
    finish()
  }

  companion object {
    const val EXTRA_DATE = "date"
  }
}

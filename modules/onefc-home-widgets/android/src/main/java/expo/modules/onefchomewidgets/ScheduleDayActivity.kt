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
    findViewById<TextView>(R.id.day_title).text = content.title
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
      line.findViewById<TextView>(R.id.day_row_time).text = row.time
      line.findViewById<TextView>(R.id.day_row_title).text = row.title
      line.contentDescription = row.description
      line.setOnClickListener { open(row.link) }
      rows.addView(line)
    }
  }

  private fun bindAdd(content: ScheduleDayModel.Content) {
    val add = findViewById<TextView>(R.id.day_add)
    val login = content.mode == ScheduleDayModel.Mode.LOGIN
    val link = if (login) content.openLink else content.addLink
    if (!login && link.isNullOrBlank()) {
      add.visibility = View.GONE
      return
    }
    add.visibility = View.VISIBLE
    add.text = getString(if (login) R.string.onefc_widget_day_login else R.string.onefc_widget_day_add)
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

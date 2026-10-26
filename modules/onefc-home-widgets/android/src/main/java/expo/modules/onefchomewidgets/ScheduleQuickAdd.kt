package expo.modules.onefchomewidgets

import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import java.security.SecureRandom

/**
 * 날짜 모달 빠른 추가의 순수 규칙. 저장은 앱 JS(headless OneFcWidgetQuickAdd)가 기존 서버 API 로 한다.
 * 제목은 로그로 남기지 않는다.
 */
internal object ScheduleQuickAdd {
  const val TASK_NAME = "OneFcWidgetQuickAdd"
  const val TASK_TIMEOUT_MS = 30_000L
  const val TITLE_MAX = 200
  const val TIMEOUT_MESSAGE = "저장 결과를 확인하지 못했어요. 다시 시도해 주세요"

  /** scheduleModel.sensibleEndTime 과 같은 규칙: 시작+1시간, 23시 이후는 23:59. */
  fun sensibleEnd(start: String): String {
    val match = Regex("^([01]\\d|2[0-3]):([0-5]\\d)$").find(start) ?: return "10:00"
    val hour = match.groupValues[1].toInt()
    if (hour >= 23) return "23:59"
    return "%02d:%s".format(hour + 1, match.groupValues[2])
  }

  fun normalize(text: CharSequence?): String = text?.toString()?.trim().orEmpty()

  fun canSubmit(text: CharSequence?, busy: Boolean): Boolean {
    val title = normalize(text)
    return !busy && title.isNotEmpty() && title.length <= TITLE_MAX
  }

  data class Result(val ok: Boolean, val requestId: String, val eventId: String, val date: String, val title: String, val message: String, val code: String)

  fun parse(json: String?): Result? = try {
    val row = JSONObject(json ?: "")
    val ok = row.optBoolean("ok")
    val requestId = row.optString("requestId")
    if (requestId.isBlank()) null
    else if (ok && row.optString("eventId").isBlank()) null
    else Result(ok, requestId, row.optString("eventId"), row.optString("date"), row.optString("title"), row.optString("message"), row.optString("code"))
  } catch (error: Throwable) {
    null
  }

  /**
   * 같은 날짜·제목으로 다시 보내면 같은 requestId(서버가 한 건으로 묶음 → 중복 생성 없음).
   * 글자를 바꾸거나 성공하면 새 id.
   */
  class Session(private val random: () -> String = ::newRequestId) {
    private var key: String? = null
    private var id: String? = null
    var busyId: String? = null
      private set

    val busy: Boolean get() = busyId != null

    fun begin(date: String, title: String): String? {
      if (busy) return null
      val next = "$date\n$title"
      if (next != key || id == null) {
        key = next
        id = random()
      }
      busyId = id
      return id
    }

    /** 이 요청의 결과만 받는다. 성공이면 다음 입력은 새 id. */
    fun finish(requestId: String, ok: Boolean): Boolean {
      if (requestId != busyId) return false
      busyId = null
      if (ok) {
        key = null
        id = null
      }
      return true
    }
  }

  private val secure = SecureRandom()

  fun newRequestId(): String {
    val bytes = ByteArray(16)
    secure.nextBytes(bytes)
    return bytes.joinToString("") { "%02x".format(it) }
  }

  /** 새로 만든 일정이 아직 캐시에 없으면(갱신 실패·지연) 목록 끝에 붙여 바로 누를 수 있게 한다. */
  fun withCreated(content: ScheduleDayModel.Content, result: Result, scheme: String?): ScheduleDayModel.Content {
    if (!result.ok || content.mode == ScheduleDayModel.Mode.LOGIN) return content
    if (content.rows.any { it.id == result.eventId }) return content
    val link = scheme?.let { WidgetDeepLink.build(it, OneFcWidgetType.SCHEDULE, WidgetDeepLink.Action.OPEN, mapOf("date" to result.date, "event" to result.eventId)) }
      ?: content.openLink ?: ""
    val row = ScheduleListRows.Row(ScheduleListRows.ALL_DAY, result.title, false, link, "${ScheduleListRows.ALL_DAY}, ${result.title}", todo = false, id = result.eventId)
    return content.copy(mode = ScheduleDayModel.Mode.LIST, rows = content.rows + row)
  }
}

/** JS 가 보낸 빠른 추가 결과를 열려 있는 모달에 넘긴다(메인 스레드). 모달이 없으면 버린다. */
internal object QuickAddBus {
  private val listeners = HashMap<String, (String) -> Unit>()
  private val main = Handler(Looper.getMainLooper())

  @Synchronized fun listen(requestId: String, listener: (String) -> Unit) { listeners[requestId] = listener }

  @Synchronized fun cancel(requestId: String) { listeners.remove(requestId) }

  fun report(requestId: String, json: String): Boolean {
    val listener = synchronized(this) { listeners.remove(requestId) } ?: return false
    main.post { listener(json) }
    return true
  }
}

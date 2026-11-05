package expo.modules.onefchomewidgets

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import org.json.JSONObject
import java.security.SecureRandom

/**
 * 위젯 ○ → 할 일 완료. 저장은 앱 JS headless(OneFcWidgetTodoComplete)가 기존 세션·completeTodo API 로 한다.
 * native 는 토큰을 보지 않고 서버를 직접 부르지 않는다. 실패 시 UI 를 완료로 바꾸지 않는다.
 */
internal object TodoComplete {
  const val TASK_NAME = "OneFcWidgetTodoComplete"
  const val TASK_TIMEOUT_MS = 30_000L
  const val FAIL_TOAST = "완료하지 못했어요. 다시 시도해 주세요"
  const val TOUCH_MIN_DP = 44

  data class Result(val ok: Boolean, val requestId: String, val todoId: String, val message: String, val code: String)

  fun parse(json: String?): Result? = try {
    val row = JSONObject(json ?: "")
    val requestId = row.optString("requestId")
    if (requestId.isBlank()) null
    else Result(row.optBoolean("ok"), requestId, row.optString("todoId"), row.optString("message"), row.optString("code"))
  } catch (_: Throwable) {
    null
  }

  /** busy/requestId 중복 가드. 같은 todoId 재시도는 같은 requestId 유지. */
  class Session(private val random: () -> String = ::newRequestId) {
    private var key: String? = null
    private var id: String? = null
    var busyId: String? = null
      private set
    val busy: Boolean get() = busyId != null

    fun begin(todoId: String): String? {
      if (busy) return null
      val next = todoId.trim()
      if (next.isEmpty()) return null
      if (next != key || id == null) {
        key = next
        id = random()
      }
      busyId = id
      return id
    }

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
  private val main = Handler(Looper.getMainLooper())
  private val session = Session()
  private var timeout: Runnable? = null

  fun newRequestId(): String {
    val bytes = ByteArray(16)
    secure.nextBytes(bytes)
    return bytes.joinToString("") { "%02x".format(it) }
  }

  /** Provider 스레드에서 호출. headless 는 백그라운드 Thread. */
  fun start(context: Context, todoId: String) {
    val id = todoId.trim()
    if (id.isEmpty()) return
    val requestId = synchronized(session) { session.begin(id) } ?: return
    val app = context.applicationContext
    QuickAddBus.listen(requestId) { json -> onResult(app, requestId, json) }
    val expire = Runnable {
      QuickAddBus.cancel(requestId)
      onResult(app, requestId, null)
    }
    timeout = expire
    main.postDelayed(expire, TASK_TIMEOUT_MS + 10_000L)
    Thread {
      val finished = WidgetHeadless.run(app, TASK_NAME, TASK_TIMEOUT_MS) { data ->
        data.putString("requestId", requestId)
        data.putString("todoId", id)
      }
      if (!finished) QuickAddBus.report(requestId, "")
    }.start()
  }

  private fun onResult(context: Context, requestId: String, json: String?) {
    val result = parse(json)?.takeIf { it.requestId == requestId }
    val ok = result?.ok == true
    val accepted = synchronized(session) { session.finish(requestId, ok) }
    if (!accepted) return
    timeout?.let { main.removeCallbacks(it) }
    timeout = null
    if (ok) {
      // JS 가 refreshWidgets 로 봉투를 쓴 뒤이므로 다시 그린다(실패해도 다음 주기).
      try {
        WidgetEngine.render(context, OneFcWidgetType.TODO)
        WidgetEngine.render(context, OneFcWidgetType.SCHEDULE)
      } catch (_: Throwable) {
      }
      return
    }
    val message = result?.message?.takeIf { it.isNotBlank() } ?: FAIL_TOAST
    main.post { Toast.makeText(context, message, Toast.LENGTH_SHORT).show() }
  }
}

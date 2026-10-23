package expo.modules.onefchomewidgets

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext
import com.facebook.react.jstasks.HeadlessJsTaskEventListener
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * 앱 프로세스의 headless JS 작업을 하나 돌리고 끝날 때까지 기다린다(백그라운드 스레드에서 호출).
 * native 는 데이터(JSON 값)만 넘긴다. 토큰·서버 호출은 앱 JS 가 기존 세션으로 한다.
 */
internal object WidgetHeadless {
  fun run(context: Context, taskName: String, timeoutMs: Long, fill: (WritableMap) -> Unit): Boolean {
    val host = (context.applicationContext as? ReactApplication)?.reactHost ?: return false
    val done = CountDownLatch(1)
    Handler(Looper.getMainLooper()).post {
      try {
        val current = host.currentReactContext
        if (current != null) {
          start(current, taskName, timeoutMs, fill, done)
        } else {
          host.addReactInstanceEventListener(object : ReactInstanceEventListener {
            override fun onReactContextInitialized(context: ReactContext) {
              host.removeReactInstanceEventListener(this)
              start(context, taskName, timeoutMs, fill, done)
            }
          })
          host.start()
        }
      } catch (error: Throwable) {
        done.countDown()
      }
    }
    return done.await(timeoutMs + 15_000L, TimeUnit.MILLISECONDS)
  }

  private fun start(reactContext: ReactContext, taskName: String, timeoutMs: Long, fill: (WritableMap) -> Unit, done: CountDownLatch) {
    try {
      val tasks = HeadlessJsTaskContext.getInstance(reactContext)
      var taskId = -1
      tasks.addTaskEventListener(object : HeadlessJsTaskEventListener {
        override fun onHeadlessJsTaskStart(id: Int) {}
        override fun onHeadlessJsTaskFinish(id: Int) {
          if (id == taskId) {
            tasks.removeTaskEventListener(this)
            done.countDown()
          }
        }
      })
      val data = Arguments.createMap()
      fill(data)
      taskId = tasks.startTask(HeadlessJsTaskConfig(taskName, data, timeoutMs, true))
    } catch (error: Throwable) {
      done.countDown()
    }
  }
}

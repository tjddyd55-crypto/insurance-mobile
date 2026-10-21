package expo.modules.onefchomewidgets

import android.content.Context
import android.os.Handler
import android.os.Looper
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext
import com.facebook.react.jstasks.HeadlessJsTaskEventListener
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * 백그라운드 갱신. native 는 토큰을 읽거나 서버를 직접 부르지 않는다.
 * 앱 JS(headless task: src/features/home-widgets/widgetHeadlessTask.ts)가 기존 secure-store 세션·API·선택자로
 * 스냅샷을 만들어 writeSnapshot 한다. 서비스(HeadlessJsTaskService)를 띄우지 않아 백그라운드 서비스 시작 제한이 없다.
 */
class WidgetRefreshWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result {
    val context = applicationContext
    try {
      if (WidgetRenderer.installedCount(context) == 0) return Result.success()
      WidgetStore.markRefreshing(context)
      WidgetRenderer.renderAll(context)
      runHeadless(context, inputData.getString(KEY_REASON) ?: "periodic")
    } catch (error: Throwable) {
      // 실패해도 재시도 폭주 없이 다음 주기에 다시 한다.
    } finally {
      try {
        WidgetStore.clearRefreshing(context)
        WidgetRenderer.renderAll(context)
      } catch (error: Throwable) {
      }
    }
    return Result.success()
  }

  private fun runHeadless(context: Context, reason: String): Boolean {
    val host = (context as? ReactApplication)?.reactHost ?: return false
    val done = CountDownLatch(1)
    val main = Handler(Looper.getMainLooper())
    main.post {
      try {
        val current = host.currentReactContext
        if (current != null) {
          start(current, reason, done)
        } else {
          host.addReactInstanceEventListener(object : ReactInstanceEventListener {
            override fun onReactContextInitialized(context: ReactContext) {
              host.removeReactInstanceEventListener(this)
              start(context, reason, done)
            }
          })
          host.start()
        }
      } catch (error: Throwable) {
        done.countDown()
      }
    }
    return done.await(TASK_TIMEOUT_MS + 15_000L, TimeUnit.MILLISECONDS)
  }

  private fun start(reactContext: ReactContext, reason: String, done: CountDownLatch) {
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
      data.putString("reason", reason)
      taskId = tasks.startTask(HeadlessJsTaskConfig(TASK_NAME, data, TASK_TIMEOUT_MS, true))
    } catch (error: Throwable) {
      done.countDown()
    }
  }

  companion object {
    const val KEY_REASON = "reason"
    const val TASK_NAME = "OnefcHomeWidgetsRefresh"
    const val TASK_TIMEOUT_MS = 45_000L
  }
}

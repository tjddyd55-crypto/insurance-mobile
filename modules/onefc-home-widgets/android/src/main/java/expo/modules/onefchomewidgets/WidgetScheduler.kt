package expo.modules.onefchomewidgets

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/** 갱신 예약. 주기 30분(WorkManager 최소 15분 이상), 무한 서비스·1분 polling 없음. */
object WidgetScheduler {
  private const val PERIODIC = "onefc-home-widgets-periodic"
  private const val ONE_TIME = "onefc-home-widgets-refresh"
  const val PERIOD_MINUTES = 30L
  const val ACTION_MIDNIGHT = "expo.modules.onefchomewidgets.MIDNIGHT"

  private fun network(): Constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

  fun ensurePeriodic(context: Context) {
    if (WidgetRenderer.installedCount(context) == 0) return
    val request = PeriodicWorkRequestBuilder<WidgetRefreshWorker>(PERIOD_MINUTES, TimeUnit.MINUTES)
      .setConstraints(network())
      .setInputData(Data.Builder().putString(WidgetRefreshWorker.KEY_REASON, "periodic").build())
      .build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, request)
  }

  /** 즉시 1회(같은 이름이 대기 중이면 합친다). 네트워크가 없으면 연결될 때 실행된다. */
  fun refreshNow(context: Context, reason: String) {
    if (WidgetRenderer.installedCount(context) == 0) return
    val request = OneTimeWorkRequestBuilder<WidgetRefreshWorker>()
      .setConstraints(network())
      .setInputData(Data.Builder().putString(WidgetRefreshWorker.KEY_REASON, reason).build())
      .build()
    WorkManager.getInstance(context).enqueueUniqueWork(ONE_TIME, ExistingWorkPolicy.KEEP, request)
  }

  fun cancelAll(context: Context) {
    WorkManager.getInstance(context).cancelUniqueWork(PERIODIC)
    WorkManager.getInstance(context).cancelUniqueWork(ONE_TIME)
    alarmManager(context)?.cancel(midnightIntent(context))
  }

  /** 자정 다시 그리기(오늘 표시·할 일 "오늘" 이동). 비정확 알람이라 권한 불필요, 몇 분 늦을 수 있다. */
  fun scheduleMidnight(context: Context, zoneId: String?) {
    if (WidgetRenderer.installedCount(context) == 0) return
    try {
      alarmManager(context)?.set(AlarmManager.RTC, WidgetDates.nextMidnight(zoneId), midnightIntent(context))
    } catch (error: Exception) {
      // 알람 실패 시 주기 갱신이 대신 다시 그린다.
    }
  }

  private fun alarmManager(context: Context): AlarmManager? = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager

  private fun midnightIntent(context: Context): PendingIntent =
    PendingIntent.getBroadcast(
      context,
      7301,
      Intent(context, WidgetSystemReceiver::class.java).setAction(ACTION_MIDNIGHT),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
}

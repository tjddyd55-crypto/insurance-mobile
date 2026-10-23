package expo.modules.onefchomewidgets

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/** 갱신 예약(Registry 기반). 주기 = 설치된 종류의 최소 periodicMinutes(≥15). 무한 서비스·polling 없음. */
object WidgetScheduler {
  private const val PERIODIC = "onefc-widget-engine-periodic"
  private const val ONE_TIME_PREFIX = "onefc-widget-engine-refresh-"
  private val LEGACY_WORK = listOf("onefc-home-widgets-periodic", "onefc-home-widgets-refresh")
  const val ACTION_MIDNIGHT = WidgetIntents.ACTION_PREFIX + "MIDNIGHT"

  private fun network(): Constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

  fun ensurePeriodic(context: Context) {
    val types = WidgetEngine.installedTypes(context).filter { it.periodicMinutes != null }
    if (types.isEmpty()) return
    val minutes = types.minOf { it.periodicMinutes!! }.coerceAtLeast(15L)
    val request = PeriodicWorkRequestBuilder<OneFcWidgetRefreshWorker>(minutes, TimeUnit.MINUTES)
      .setConstraints(network())
      .setInputData(OneFcWidgetRefreshWorker.input(emptyList(), "periodic", false, null))
      .build()
    val work = WorkManager.getInstance(context)
    LEGACY_WORK.forEach(work::cancelUniqueWork)
    work.enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, request)
  }

  /** 종류별 1회(대기 중이면 합친다). 네트워크가 없으면 연결될 때 실행. types 비어 있으면 설치된 전체. */
  fun refreshNow(context: Context, types: List<OneFcWidgetType>, reason: String, force: Boolean, ids: IntArray? = null) {
    val installed = WidgetEngine.installedTypes(context)
    val targets = if (types.isEmpty()) installed else types.filter { it in installed }
    if (targets.isEmpty()) return
    val request = OneTimeWorkRequestBuilder<OneFcWidgetRefreshWorker>()
      .setConstraints(network())
      .setInputData(OneFcWidgetRefreshWorker.input(targets, reason, force, ids))
      .build()
    val name = ONE_TIME_PREFIX + (if (types.isEmpty()) "all" else targets.joinToString("-") { it.id })
    WorkManager.getInstance(context).enqueueUniqueWork(name, ExistingWorkPolicy.KEEP, request)
  }

  fun cancelAll(context: Context) {
    val work = WorkManager.getInstance(context)
    work.cancelUniqueWork(PERIODIC)
    work.cancelUniqueWork(ONE_TIME_PREFIX + "all")
    OneFcWidgetType.values().forEach { work.cancelUniqueWork(ONE_TIME_PREFIX + it.id) }
    LEGACY_WORK.forEach(work::cancelUniqueWork)
    alarmManager(context)?.cancel(midnightIntent(context))
  }

  /** 자정 다시 그리기. 비정확 알람이라 권한 불필요. */
  fun scheduleMidnight(context: Context, zoneId: String?) {
    if (WidgetEngine.installedTypes(context).isEmpty()) return
    try {
      alarmManager(context)?.set(AlarmManager.RTC, WidgetDates.nextMidnight(zoneId), midnightIntent(context))
    } catch (error: Exception) {
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

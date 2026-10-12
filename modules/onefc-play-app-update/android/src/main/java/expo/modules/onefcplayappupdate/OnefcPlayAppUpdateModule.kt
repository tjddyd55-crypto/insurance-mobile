package expo.modules.onefcplayappupdate

import android.app.Activity
import android.content.Context
import android.os.Build
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.ActivityResult
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicBoolean

private const val PLAY_INSTALLER = "com.android.vending"
private const val INSTALL_EVENT = "onInstallStatus"

/**
 * Play가 설치한 앱에서만 동작한다. 사이드로드·내부 APK는 not_from_play.
 * FLEXIBLE과 IMMEDIATE는 updateType 인자로 갈라져 있고, 기본 선택은 JS 정책이 한다.
 */
class OnefcPlayAppUpdateModule : Module() {
  private var cachedManager: AppUpdateManager? = null
  private var installListener: InstallStateUpdatedListener? = null

  override fun definition() = ModuleDefinition {
    Name("OnefcPlayAppUpdate")

    Events(INSTALL_EVENT)

    OnStartObserving {
      registerInstallListener()
    }

    OnStopObserving {
      unregisterInstallListener()
    }

    AsyncFunction("getUpdateStatus") { updateType: String, promise: Promise ->
      getUpdateStatus(updateType, promise)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("startUpdate") { updateType: String, promise: Promise ->
      startUpdate(updateType, promise)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("completeUpdate") { promise: Promise ->
      completeUpdate(promise)
    }.runOnQueue(Queues.MAIN)
  }

  private fun getUpdateStatus(updateType: String, promise: Promise) {
    val context = reactContextOrNull()
    if (context == null) {
      promise.resolve(statusMap("failed"))
      return
    }
    if (!isInstalledFromPlay(context)) {
      promise.resolve(statusMap("not_from_play"))
      return
    }
    val manager = managerOrNull(context)
    if (manager == null) {
      promise.resolve(statusMap("failed"))
      return
    }
    val gate = AtomicBoolean(false)
    manager.appUpdateInfo
      .addOnSuccessListener { info ->
        resolveOnce(promise, gate, describe(info, updateType))
      }
      .addOnFailureListener {
        resolveOnce(promise, gate, statusMap("failed"))
      }
  }

  private fun startUpdate(updateType: String, promise: Promise) {
    val context = reactContextOrNull()
    val activity = appContext.currentActivity
    if (context == null || activity == null || !isInstalledFromPlay(context)) {
      promise.resolve(if (context != null && !isInstalledFromPlay(context)) "not_from_play" else "failed")
      return
    }
    val manager = managerOrNull(context)
    if (manager == null) {
      promise.resolve("failed")
      return
    }
    val gate = AtomicBoolean(false)
    manager.appUpdateInfo
      .addOnSuccessListener { info ->
        launchUpdate(manager, info, activity, updateType, promise, gate)
      }
      .addOnFailureListener {
        resolveOnce(promise, gate, "failed")
      }
  }

  private fun completeUpdate(promise: Promise) {
    val context = reactContextOrNull()
    val manager = context?.let { managerOrNull(it) }
    if (manager == null) {
      promise.resolve(false)
      return
    }
    val gate = AtomicBoolean(false)
    manager.completeUpdate()
      .addOnSuccessListener { resolveOnce(promise, gate, true) }
      .addOnFailureListener { resolveOnce(promise, gate, false) }
  }

  private fun launchUpdate(
    manager: AppUpdateManager,
    info: AppUpdateInfo,
    activity: Activity,
    updateType: String,
    promise: Promise,
    gate: AtomicBoolean,
  ) {
    val type = toUpdateType(updateType)
    val availability = info.updateAvailability()
    val canStart = availability == UpdateAvailability.UPDATE_AVAILABLE
      || availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS
    if (!canStart || !info.isUpdateTypeAllowed(type)) {
      resolveOnce(promise, gate, "unavailable")
      return
    }
    try {
      val options = AppUpdateOptions.newBuilder(type).build()
      manager.startUpdateFlow(info, activity, options)
        .addOnSuccessListener { code -> resolveOnce(promise, gate, resultName(code)) }
        .addOnFailureListener { resolveOnce(promise, gate, "failed") }
    } catch (_: Exception) {
      resolveOnce(promise, gate, "failed")
    }
  }

  private fun registerInstallListener() {
    if (installListener != null) {
      return
    }
    val context = reactContextOrNull() ?: return
    val manager = managerOrNull(context) ?: return
    val listener = InstallStateUpdatedListener { state ->
      sendEvent(INSTALL_EVENT, mapOf("status" to installStatusName(state.installStatus())))
    }
    installListener = listener
    manager.registerListener(listener)
  }

  private fun unregisterInstallListener() {
    val listener = installListener ?: return
    val context = reactContextOrNull()
    if (context != null) {
      managerOrNull(context)?.unregisterListener(listener)
    }
    installListener = null
  }

  private fun describe(info: AppUpdateInfo, updateType: String): Map<String, Any?> {
    return mapOf(
      "status" to availabilityStatus(info, toUpdateType(updateType)),
      "installedFromPlay" to true,
      "availableVersionCode" to info.availableVersionCode(),
      "flexibleAllowed" to info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE),
      "immediateAllowed" to info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE),
    )
  }

  private fun availabilityStatus(info: AppUpdateInfo, type: Int): String {
    if (info.installStatus() == InstallStatus.DOWNLOADED) {
      return "downloaded"
    }
    val availability = info.updateAvailability()
    if (availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
      return "in_progress"
    }
    if (availability == UpdateAvailability.UPDATE_AVAILABLE && info.isUpdateTypeAllowed(type)) {
      return "available"
    }
    if (availability == UpdateAvailability.UPDATE_AVAILABLE) {
      return "type_not_allowed"
    }
    return "no_update"
  }

  private fun reactContextOrNull(): Context? = appContext.reactContext

  private fun managerOrNull(context: Context): AppUpdateManager? {
    cachedManager?.let { return it }
    return try {
      AppUpdateManagerFactory.create(context).also { cachedManager = it }
    } catch (_: Exception) {
      null
    }
  }
}

private fun isInstalledFromPlay(context: Context): Boolean {
  return try {
    installerPackage(context) == PLAY_INSTALLER
  } catch (_: Exception) {
    false
  }
}

private fun installerPackage(context: Context): String? {
  val packageName = context.packageName
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
    return context.packageManager.getInstallSourceInfo(packageName).installingPackageName
  }
  @Suppress("DEPRECATION")
  return context.packageManager.getInstallerPackageName(packageName)
}

private fun toUpdateType(updateType: String): Int {
  if (updateType == "immediate") {
    return AppUpdateType.IMMEDIATE
  }
  return AppUpdateType.FLEXIBLE
}

private fun resultName(code: Int?): String {
  return when (code) {
    Activity.RESULT_OK -> "accepted"
    Activity.RESULT_CANCELED -> "canceled"
    ActivityResult.RESULT_IN_APP_UPDATE_FAILED -> "failed"
    else -> "failed"
  }
}

private fun installStatusName(status: Int): String {
  return when (status) {
    InstallStatus.PENDING -> "pending"
    InstallStatus.DOWNLOADING -> "downloading"
    InstallStatus.DOWNLOADED -> "downloaded"
    InstallStatus.INSTALLING -> "installing"
    InstallStatus.INSTALLED -> "installed"
    InstallStatus.FAILED -> "failed"
    InstallStatus.CANCELED -> "canceled"
    else -> "unknown"
  }
}

private fun statusMap(status: String): Map<String, Any?> {
  return mapOf(
    "status" to status,
    "installedFromPlay" to (status != "not_from_play" && status != "failed"),
    "availableVersionCode" to 0,
    "flexibleAllowed" to false,
    "immediateAllowed" to false,
  )
}

private fun resolveOnce(promise: Promise, gate: AtomicBoolean, value: Any?) {
  if (gate.compareAndSet(false, true)) {
    promise.resolve(value)
  }
}

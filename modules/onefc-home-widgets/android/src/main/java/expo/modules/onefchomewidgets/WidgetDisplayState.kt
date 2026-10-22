package expo.modules.onefchomewidgets

/** 모든 위젯 공통 화면 상태. */
enum class WidgetDisplayState { READY, LOADING, LOGGED_OUT, OFFLINE_STALE, AUTH_EXPIRED, ERROR;

  companion object {
    /** 캐시·삭제 사유·새로고침 여부 → 상태. 순수 함수(단위 테스트 대상). */
    fun resolve(envelope: WidgetEnvelope?, clearReason: String?, refreshing: Boolean, hasPayload: Boolean): WidgetDisplayState {
      if (envelope == null) {
        return when (clearReason) {
          "logged_out", "account_changed" -> LOGGED_OUT
          "session_expired" -> AUTH_EXPIRED
          else -> LOADING
        }
      }
      if (envelope.authState == "expired") return AUTH_EXPIRED
      if (envelope.authState == "signed_out") return LOGGED_OUT
      if (!hasPayload) return if (envelope.syncState == "error" && !refreshing) ERROR else LOADING
      return if (envelope.syncState == "stale") OFFLINE_STALE else READY
    }
  }
}

/** 공통 문구. 서버 오류 원문은 보여 주지 않는다. */
object WidgetCopy {
  const val LOGIN_REQUIRED = "로그인이 필요합니다"
  const val LOGIN_HINT = "ONE FC에 로그인해 주세요"
  const val LOAD_FAILED = "정보를 불러올 수 없습니다"
  const val LOAD_FAILED_HINT = "잠시 후 새로고침해 주세요"
  const val LOADING = "불러오는 중…"
  const val PREPARE_HINT = "앱을 한 번 열면 바로 표시됩니다"
  const val REFRESHING = "새로고침 중…"

  fun lastUpdated(hm: String): String = "마지막 업데이트 $hm"
}

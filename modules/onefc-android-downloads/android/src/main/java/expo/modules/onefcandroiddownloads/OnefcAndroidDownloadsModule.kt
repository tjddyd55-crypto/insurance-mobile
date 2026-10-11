package expo.modules.onefcandroiddownloads

import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileInputStream
import java.io.IOException

class OnefcAndroidDownloadsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("OnefcAndroidDownloads")

    AsyncFunction("saveToDownloads") { localFileUri: String, displayName: String, mimeType: String ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        throw CodedException(
          "ERR_DOWNLOADS_UNSUPPORTED",
          "Android 10 이상에서만 다운로드 폴더에 저장할 수 있습니다.",
          null,
        )
      }
      val context = appContext.reactContext
        ?: throw CodedException("ERR_NO_CONTEXT", "앱 컨텍스트를 사용할 수 없습니다.", null)

      val source = uriToFile(localFileUri)
      if (!source.exists() || !source.isFile) {
        throw CodedException("ERR_SOURCE_MISSING", "다운로드할 파일을 찾을 수 없습니다.", null)
      }

      val resolver = context.contentResolver
      val uniqueName = resolveUniqueDisplayName(resolver, sanitizeDisplayName(displayName))

      val values = ContentValues().apply {
        put(MediaStore.Downloads.DISPLAY_NAME, uniqueName)
        put(MediaStore.Downloads.MIME_TYPE, mimeType)
        put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
        put(MediaStore.Downloads.IS_PENDING, 1)
      }

      val collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI
      val targetUri = resolver.insert(collection, values)
        ?: throw CodedException("ERR_INSERT", "다운로드 항목을 만들지 못했습니다.", null)

      try {
        resolver.openOutputStream(targetUri)?.use { output ->
          FileInputStream(source).use { input ->
            input.copyTo(output)
          }
        } ?: throw IOException("Output stream unavailable")
      } catch (error: Exception) {
        resolver.delete(targetUri, null, null)
        throw CodedException(
          "ERR_WRITE",
          "다운로드 폴더에 저장하지 못했습니다.",
          error,
        )
      }

      val complete = ContentValues().apply {
        put(MediaStore.Downloads.IS_PENDING, 0)
      }
      resolver.update(targetUri, complete, null, null)
      targetUri.toString()
    }
  }

  private fun uriToFile(uri: String): File {
    val path = uri.removePrefix("file://")
    return File(path)
  }

  private fun sanitizeDisplayName(displayName: String): String {
    val trimmed = displayName.trim().ifEmpty { "onefc-download.pdf" }
    val safe = trimmed.replace(Regex("[\\\\/:*?\"<>|]"), "_")
    return if (safe.lowercase().endsWith(".pdf")) safe else "$safe.pdf"
  }

  private fun resolveUniqueDisplayName(
    resolver: android.content.ContentResolver,
    displayName: String,
  ): String {
    if (!displayNameExists(resolver, displayName)) {
      return displayName
    }
    val dot = displayName.lastIndexOf('.')
    val base = if (dot > 0) displayName.substring(0, dot) else displayName
    val ext = if (dot > 0) displayName.substring(dot) else ""
    for (n in 1..99) {
      val candidate = "$base ($n)$ext"
      if (!displayNameExists(resolver, candidate)) {
        return candidate
      }
    }
    return "$base (${System.currentTimeMillis()})$ext"
  }

  private fun displayNameExists(
    resolver: android.content.ContentResolver,
    name: String,
  ): Boolean {
    val projection = arrayOf(MediaStore.Downloads._ID)
    val selection = "${MediaStore.Downloads.DISPLAY_NAME} = ?"
    resolver.query(
      MediaStore.Downloads.EXTERNAL_CONTENT_URI,
      projection,
      selection,
      arrayOf(name),
      null,
    )?.use { cursor ->
      return cursor.count > 0
    }
    return false
  }
}

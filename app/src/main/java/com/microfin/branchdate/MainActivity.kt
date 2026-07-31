package com.microfin.branchdate

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Log
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import java.io.File
import java.io.FileOutputStream

class MainActivity : Activity() {

    private lateinit var webView: WebView
    private val targetUrl = "https://mfnext3.microfin360.com/dsk/"

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        // 💡 Enable Pinch-to-Zoom without annoying onscreen buttons
        settings.setSupportZoom(true)
        settings.builtInZoomControls = true
        settings.displayZoomControls = false

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.addJavascriptInterface(WebAppInterface(this), "AndroidDownloader")

        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                injectExtensionScript()
            }
        }

        webView.loadUrl(targetUrl)
    }

    private fun injectExtensionScript() {
        try {
            val script = assets.open("content.js").bufferedReader().use { it.readText() }
            webView.evaluateJavascript(script, null)
            Log.d("MicrofinApp", "Extension script injected successfully!")
        } catch (e: Exception) {
            Log.e("MicrofinApp", "Error injecting script: ${e.message}")
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}

class WebAppInterface(private val context: Context) {
    @JavascriptInterface
    fun saveExcel(content: String, filename: String) {
        try {
            var savedSuccessfully = false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val mimeType = if (filename.endsWith(".csv", true)) "text/csv" else "application/vnd.ms-excel"
                val resolver = context.contentResolver
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                if (uri != null) {
                    resolver.openOutputStream(uri)?.use { out ->
                        out.write(content.toByteArray(Charsets.UTF_8))
                    }
                    savedSuccessfully = true
                }
            } else {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloadsDir.exists()) downloadsDir.mkdirs()
                val file = File(downloadsDir, filename)
                FileOutputStream(file).use { out ->
                    out.write(content.toByteArray(Charsets.UTF_8))
                }
                MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), null, null)
                savedSuccessfully = true
            }

            Handler(Looper.getMainLooper()).post {
                if (savedSuccessfully) {
                    Toast.makeText(context, "✅ Excel ফাইলটি ফোনের Downloads ফোল্ডারে সেভ হয়েছে!", Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(context, "❌ ফাইল সেভ করা সম্ভব হয়নি!", Toast.LENGTH_LONG).show()
                }
            }
        } catch (e: Exception) {
            Log.e("MicrofinApp", "Excel save error: ${e.message}")
            Handler(Looper.getMainLooper()).post {
                Toast.makeText(context, "❌ ফাইল সেভে সমস্যা: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    @JavascriptInterface
    fun saveBase64File(base64Data: String, filename: String, mimeType: String) {
        try {
            val bytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT)
            var savedSuccessfully = false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val resolver = context.contentResolver
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                if (uri != null) {
                    resolver.openOutputStream(uri)?.use { out ->
                        out.write(bytes)
                    }
                    savedSuccessfully = true
                }
            } else {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloadsDir.exists()) downloadsDir.mkdirs()
                val file = File(downloadsDir, filename)
                FileOutputStream(file).use { out ->
                    out.write(bytes)
                }
                MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), null, null)
                savedSuccessfully = true
            }

            Handler(Looper.getMainLooper()).post {
                if (savedSuccessfully) {
                    Toast.makeText(context, "✅ Excel (.xlsx) ফাইলটি ফোনের Downloads ফোল্ডারে সেভ হয়েছে!", Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(context, "❌ ফাইল সেভ করা সম্ভব হয়নি!", Toast.LENGTH_LONG).show()
                }
            }
        } catch (e: Exception) {
            Log.e("MicrofinApp", "Excel save error: ${e.message}")
            Handler(Looper.getMainLooper()).post {
                Toast.makeText(context, "❌ ফাইল সেভে সমস্যা: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    @JavascriptInterface
    fun openUrl(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e("MicrofinApp", "Error opening URL: ${e.message}")
            Handler(Looper.getMainLooper()).post {
                Toast.makeText(context, "লিংক ওপেন করা যাচ্ছে না: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}

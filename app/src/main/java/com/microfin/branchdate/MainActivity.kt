package com.microfin.branchdate

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
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
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs()
            }
            val file = File(downloadsDir, filename)
            FileOutputStream(file).use { out ->
                out.write(content.toByteArray(Charsets.UTF_8))
            }
            Handler(Looper.getMainLooper()).post {
                Toast.makeText(context, "✅ Excel ফাইলটি আপনার ফোনের Downloads ফোল্ডারে সেভ হয়েছে!", Toast.LENGTH_LONG).show()
            }
        } catch (e: Exception) {
            Log.e("MicrofinApp", "Excel save error: ${e.message}")
            Handler(Looper.getMainLooper()).post {
                Toast.makeText(context, "❌ ফাইল সেভ করতে সমস্যা হয়েছে: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }
}

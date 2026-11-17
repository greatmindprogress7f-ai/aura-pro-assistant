package com.aura.assistant

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Point
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.NotificationCompat
import androidx.webkit.WebViewAssetLoader
import kotlin.math.hypot

class OverlayService : Service() {

    private lateinit var windowManager: WindowManager
    private lateinit var overlayWebView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private lateinit var layoutParams: WindowManager.LayoutParams

    private var currentMode = "orb" // "orb" or "compact"
    private var isExpanded = false

    companion object {
        const val CHANNEL_ID = "aura_overlay_channel"
        const val NOTIFICATION_ID = 2026
        const val ACTION_SET_MODE = "action_set_mode"
        const val EXTRA_MODE = "extra_mode"
        private const val ORB_SIZE_DP = 96
    }

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
        initOverlayWindow()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Aura Assistant Floating Orb",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the Aura liquid-glass floating assistant active over apps"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val launchIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Aura Pro 2.0 is Active")
            .setContentText("Tap floating orb or here to open assistant")
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    @SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
    private fun initOverlayWindow() {
        val density = resources.displayMetrics.density
        val orbPx = (ORB_SIZE_DP * density).toInt()

        val windowType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        layoutParams = WindowManager.LayoutParams(
            orbPx,
            orbPx,
            windowType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = (resources.displayMetrics.widthPixels - orbPx - (16 * density).toInt())
            y = (resources.displayMetrics.heightPixels * 0.75).toInt()
        }

        assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        overlayWebView = WebView(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
        }

        overlayWebView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
            allowFileAccess = false
            allowContentAccess = false
        }

        val auraHost = AuraHost(this, overlayWebView)
        overlayWebView.addJavascriptInterface(auraHost, "AuraHost")

        overlayWebView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }
        }

        // Native touch & spring drag for orb state (§11.2)
        setupOrbTouchListener()

        overlayWebView.loadUrl("https://appassets.androidplatform.net/assets/index.html?host=overlay")
        windowManager.addView(overlayWebView, layoutParams)
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun setupOrbTouchListener() {
        var initialX = 0
        var initialY = 0
        var touchStartX = 0f
        var touchStartY = 0f
        var isDragging = false

        overlayWebView.setOnTouchListener { _, event ->
            if (isExpanded) {
                // When expanded in full screen, web layer handles all UI taps and gestures
                return@setOnTouchListener false
            }

            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = layoutParams.x
                    initialY = layoutParams.y
                    touchStartX = event.rawX
                    touchStartY = event.rawY
                    isDragging = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - touchStartX).toInt()
                    val dy = (event.rawY - touchStartY).toInt()
                    if (hypot(dx.toDouble(), dy.toDouble()) > 10) {
                        isDragging = true
                    }
                    if (isDragging) {
                        layoutParams.x = initialX + dx
                        layoutParams.y = initialY + dy
                        windowManager.updateViewLayout(overlayWebView, layoutParams)
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (isDragging) {
                        // Snap to nearest screen edge
                        snapToEdge()
                    } else {
                        // Tap detected -> expand overlay into compact card mode
                        expandToCompact()
                    }
                    true
                }
                else -> false
            }
        }
    }

    private fun snapToEdge() {
        val screenWidth = resources.displayMetrics.widthPixels
        val density = resources.displayMetrics.density
        val orbPx = (ORB_SIZE_DP * density).toInt()
        val targetX = if (layoutParams.x + orbPx / 2 < screenWidth / 2) {
            (8 * density).toInt()
        } else {
            screenWidth - orbPx - (8 * density).toInt()
        }

        layoutParams.x = targetX
        windowManager.updateViewLayout(overlayWebView, layoutParams)
    }

    private fun expandToCompact() {
        isExpanded = true
        currentMode = "compact"

        // Full screen transparent overlay allowing keyboard and touches
        layoutParams.width = WindowManager.LayoutParams.MATCH_PARENT
        layoutParams.height = WindowManager.LayoutParams.MATCH_PARENT
        layoutParams.x = 0
        layoutParams.y = 0
        // Clear FLAG_NOT_FOCUSABLE so soft keyboard works inside overlay (#chat-input)
        layoutParams.flags = WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED

        windowManager.updateViewLayout(overlayWebView, layoutParams)

        // Signal web UI to fly orb to DOCK and open sheet
        overlayWebView.evaluateJavascript("window.toDock && window.toDock();", null)
    }

    private fun collapseToOrb() {
        isExpanded = false
        currentMode = "orb"

        val density = resources.displayMetrics.density
        val orbPx = (ORB_SIZE_DP * density).toInt()

        layoutParams.width = orbPx
        layoutParams.height = orbPx
        layoutParams.flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED

        snapToEdge()
        windowManager.updateViewLayout(overlayWebView, layoutParams)

        overlayWebView.evaluateJavascript("window.minimise && window.minimise();", null)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent != null && intent.action == ACTION_SET_MODE) {
            val mode = intent.getStringExtra(EXTRA_MODE)
            if ((mode == "orb" || mode == "float") && isExpanded) {
                collapseToOrb()
            } else if (mode == "compact" && !isExpanded) {
                expandToCompact()
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::overlayWebView.isInitialized) {
            windowManager.removeView(overlayWebView)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
}

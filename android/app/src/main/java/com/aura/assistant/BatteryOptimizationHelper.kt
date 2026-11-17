package com.aura.assistant

import android.os.Build
import java.util.Locale

object BatteryOptimizationHelper {

    fun getDeviceBatteryTip(): String {
        val manufacturer = Build.MANUFACTURER.lowercase(Locale.ROOT)
        return when {
            manufacturer.contains("samsung") -> {
                "Samsung: Go to Settings > Apps > Aura Pro > Battery > Select 'Unrestricted' so background overlay is not put to sleep."
            }
            manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") -> {
                "Xiaomi/MIUI: Enable 'Autostart' in App Info, set Battery Saver to 'No restrictions', and lock Aura Pro in Recent Apps."
            }
            manufacturer.contains("tecno") || manufacturer.contains("infinix") || manufacturer.contains("itel") -> {
                "Transsion (HiOS/XOS): Go to Phone Master > Auto-start management, allow Aura Pro, and exempt from freeze/cleaner."
            }
            manufacturer.contains("huawei") || manufacturer.contains("honor") -> {
                "Huawei: Go to Settings > Battery > App Launch, set Aura Pro to 'Manage manually' and enable all 3 toggles."
            }
            manufacturer.contains("oppo") || manufacturer.contains("realme") || manufacturer.contains("oneplus") -> {
                "ColorOS/OxygenOS: Enable 'Allow background activity' and 'Allow auto-launch' under App Battery Management."
            }
            else -> {
                "General: Ensure battery saver is disabled for Aura Pro so the floating overlay can remain active over other apps."
            }
        }
    }
}

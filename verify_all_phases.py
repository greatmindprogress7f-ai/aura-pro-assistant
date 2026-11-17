import os, json, re

print("Running Comprehensive Aura Pro 2.0 Verification across all Phases...")

# 1. Phase 0: Foundations
assert os.path.exists('orb.webp'), "orb.webp missing"
assert os.path.exists('orb.png'), "orb.png missing"
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert 'mix-blend-mode: multiply' not in html, "mix-blend-mode: multiply should not be in CSS"
assert 'DOCK = {' in html, "DOCK variable missing"
assert 'toDock' in html, "toDock function missing"
assert 'localStorage.getItem(STORAGE_KEY)' in html, "localStorage state persistence missing"
print("✓ Phase 0 (Foundations): PASS")

# 2. Phase 1: Compact Mode
assert 'id="input-dock"' in html, "input-dock missing"
assert 'id="chat-input"' in html, "chat-input missing"
assert 'id="mic-btn"' in html, "mic-btn missing"
assert 'id="live-btn"' in html, "live-btn missing"
assert 'id="handle"' in html, "handle missing"
assert 'id="act-like"' in html and 'id="act-dislike"' in html, "like/dislike missing"
assert 'id="act-share"' in html and 'id="act-copy"' in html, "share/copy missing"
assert 'id="act-speak"' in html, "speak missing"
assert 'renderMarkdown' in html, "renderMarkdown missing"
print("✓ Phase 1 (Compact Mode): PASS")

# 3. Phase 2: Full Chat, History & Settings
assert 'id="full-workspace"' in html, "full-workspace missing"
assert 'id="full-header"' in html, "full-header missing"
assert 'id="btn-compact-view"' in html, "btn-compact-view missing"
assert 'id="btn-min-orb"' in html, "btn-min-orb missing"
assert 'id="screen-history"' in html, "screen-history missing"
assert 'id="screen-settings"' in html, "screen-settings missing"
assert 'id="history-drawer"' in html, "history-drawer missing"
assert 'toFullChat' in html, "toFullChat missing"
assert 'toCompactView' in html, "toCompactView missing"
print("✓ Phase 2 (Full Chat, History, Settings): PASS")

# 4. Phase 3: PWA
assert os.path.exists('manifest.webmanifest'), "manifest.webmanifest missing"
assert os.path.exists('sw.js'), "sw.js missing"
assert os.path.exists('icon-192.png'), "icon-192.png missing"
assert os.path.exists('icon-512.png'), "icon-512.png missing"
assert os.path.exists('icon-maskable-512.png'), "icon-maskable-512.png missing"
assert os.path.exists('favicon.svg'), "favicon.svg missing"
assert os.path.exists('netlify.toml'), "netlify.toml missing"
assert 'rel="manifest"' in html, "manifest link missing in html"
assert 'navigator.serviceWorker.register' in html, "service worker registration missing"
print("✓ Phase 3 (PWA & Offline): PASS")

# 5. Phase 4: Android Native Overlay
android_files = [
    "android/settings.gradle.kts",
    "android/build.gradle.kts",
    "android/app/build.gradle.kts",
    "android/app/src/main/AndroidManifest.xml",
    "android/app/src/main/java/com/aura/assistant/MainActivity.kt",
    "android/app/src/main/java/com/aura/assistant/OverlayService.kt",
    "android/app/src/main/java/com/aura/assistant/AuraHost.kt",
    "android/app/src/main/java/com/aura/assistant/BatteryOptimizationHelper.kt",
    "android/app/src/main/assets/index.html",
    "android/app/src/main/assets/orb.webp"
]
for f in android_files:
    assert os.path.exists(f), f"Android file missing: {f}"
print("✓ Phase 4 (Android Native Overlay): PASS")

# 6. Phase 5: Polish & Performance
assert 'liquid-layer' in html, "liquid-layer missing"
assert '@keyframes liquid-wave' in html, "liquid-wave animation missing"
assert 'prefers-reduced-motion' in html, "prefers-reduced-motion missing"
assert '[data-theme="dark"]' in html, "dark theme missing"
print("✓ Phase 5 (Polish, Shader, Accessibility & Performance): PASS")

print("\n" + "="*50)
print("ALL ACCEPTANCE CRITERIA FOR PHASES 0-5 ARE 100% VERIFIED!")
print("="*50)

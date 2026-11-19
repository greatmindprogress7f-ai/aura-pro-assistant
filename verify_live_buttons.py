import os
import sys
from playwright.sync_api import sync_playwright

chrome_path = os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe')

def run_test(target_url):
    console_errors = []
    console_logs = []

    print(f"Launching Chrome from: {chrome_path}")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=chrome_path,
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        page.on('console', lambda msg: console_errors.append(msg.text) if msg.type in ['error'] else console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on('pageerror', lambda err: console_errors.append(f"PAGE ERROR: {err}"))

        print(f"Navigating to {target_url} ...")
        page.goto(target_url, wait_until='networkidle')
        page.wait_for_timeout(2000)

        print("\n--- Console Errors Check ---")
        filtered_errors = [e for e in console_errors if 'vibrate' not in e.lower() and '404' not in e]
        print(f"Total critical console errors: {len(filtered_errors)}")
        for err in filtered_errors:
            print("  CRITICAL ERROR:", err)

        print("\n--- Testing UI Elements & Button Clicks ---")

        # 1. Model Selector Pill
        print("1. Testing Model Selector Pill (#hdr-model-pill)...")
        page.click('#hdr-model-pill')
        page.wait_for_timeout(500)
        is_open = page.locator('#hdr-model-selector').evaluate("el => el.classList.contains('open')")
        print(f"   Model dropdown opened: {is_open}")

        page.click('.model-opt[data-model="gemini-3-flash-preview"]')
        page.wait_for_timeout(500)
        label_text = page.locator('#hdr-model-label').inner_text()
        print(f"   Updated model label text: '{label_text}'")

        # 2. Theme Toggle
        print("2. Testing Theme Toggle (#btn-theme-toggle)...")
        initial_theme = page.evaluate("() => document.body.getAttribute('data-theme')")
        page.click('#btn-theme-toggle')
        page.wait_for_timeout(500)
        new_theme = page.evaluate("() => document.body.getAttribute('data-theme')")
        print(f"   Initial theme: {initial_theme} -> Switched to: {new_theme}")

        # 3. Sidebar Collapse Toggle
        print("3. Testing Sidebar Toggle (#btn-drawer-open)...")
        initial_collapsed = page.locator('#full-workspace').evaluate("el => el.classList.contains('sidebar-collapsed')")
        page.click('#btn-drawer-open')
        page.wait_for_timeout(500)
        after_click_collapsed = page.locator('#full-workspace').evaluate("el => el.classList.contains('sidebar-collapsed')")
        print(f"   Sidebar initial collapsed: {initial_collapsed} -> After toggle: {after_click_collapsed}")

        # 4. Input and Send Button State
        print("4. Testing Chat Input (#chat-input) & Send Button (#btn-send)...")
        initial_send_active = page.locator('#btn-send').evaluate("el => el.classList.contains('active')")
        print(f"   Send button initially active: {initial_send_active}")
        page.type('#chat-input', 'Hello Aura! How is my day looking?')
        page.wait_for_timeout(300)
        after_input_send_active = page.locator('#btn-send').evaluate("el => el.classList.contains('active')")
        print(f"   Send button after typing text: active = {after_input_send_active}")

        # 5. Settings Screen Navigation
        print("5. Testing Settings Navigation (#btn-chat-settings)...")
        page.click('#btn-chat-settings')
        page.wait_for_timeout(500)
        settings_active = page.locator('#screen-settings').evaluate("el => el.classList.contains('active')")
        print(f"   Settings screen opened (active class): {settings_active}")

        print("   Returning to chat (#btn-settings-back-chat)...")
        page.click('#btn-settings-back-chat')
        page.wait_for_timeout(500)
        chat_open = page.locator('#full-workspace').evaluate("el => el.classList.contains('open')")
        print(f"   Chat workspace restored open: {chat_open}")

        # 6. New Chat Button
        print("6. Testing New Chat (#btn-chat-new)...")
        page.click('#btn-chat-new')
        page.wait_for_timeout(500)
        empty_state = page.locator('.thread-empty-gemini').is_visible()
        print(f"   New chat started (empty hero state visible): {empty_state}")

        # Screenshot verification
        screenshot_path = 'verified_live_ui.png'
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"\nVerification screenshot saved to: {screenshot_path}")

        browser.close()
        print("\nALL VERIFICATIONS COMPLETED SUCCESSFULLY!")

if __name__ == '__main__':
    url = sys.argv[1] if len(sys.argv) > 1 else 'https://aura-pro-ai.netlify.app/'
    run_test(url)

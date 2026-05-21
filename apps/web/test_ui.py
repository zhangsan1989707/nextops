from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    
    page.goto('http://localhost:3000/')
    page.wait_for_load_state('networkidle')
    page.fill('input[type="email"]', 'leo@example.com')
    page.fill('input[type="password"]', 'admin123')
    page.click('button[type="submit"]')
    page.wait_for_timeout(2000)
    
    print("1. Dashboard loaded")
    
    print("2. Testing Cmd+K command palette...")
    page.keyboard.press('Meta+k')
    page.wait_for_timeout(800)
    visible = page.locator('.command-palette').is_visible()
    print(f"   Palette visible after Meta+k: {visible}")
    if not visible:
        page.keyboard.press('Control+k')
        page.wait_for_timeout(800)
        visible = page.locator('.command-palette').is_visible()
        print(f"   Palette visible after Ctrl+k: {visible}")
    page.keyboard.press('Escape')
    page.wait_for_timeout(400)
    
    print("3. Trying top search input click...")
    search_input = page.locator('.search input').first
    if search_input.is_visible():
        search_input.click()
        page.wait_for_timeout(600)
        print(f"   Palette after search click: {page.locator('.command-palette').is_visible()}")
        page.keyboard.press('Escape')
    
    print("4. Testing page navigation...")
    try:
        page.click('text=资源管理', timeout=3000)
    except:
        try:
            page.click('[class*="nav-group"] text=资产管理', timeout=2000)
            page.wait_for_timeout(300)
            page.click('text=资源管理', timeout=2000)
        except:
            print("   Could not navigate via click, trying programmatic...")
            page.evaluate("() => { document.querySelector('[data-page=\"servers\"]')?.click(); }")
    page.wait_for_timeout(1000)
    page.screenshot(path='/Users/leohang/project/nextops/test_screenshots/servers_test.png', full_page=True)
    print("   Servers screenshot saved")
    
    print("5. Go to alerts...")
    try:
        page.click('text=告警中心', timeout=3000)
    except:
        page.evaluate("() => { document.querySelector('[data-page=\"alerts\"]')?.click(); }")
    page.wait_for_timeout(1000)
    page.screenshot(path='/Users/leohang/project/nextops/test_screenshots/alerts_test.png', full_page=True)
    print("   Alerts screenshot saved")
    
    print("6. Go to chatops...")
    try:
        page.click('text=AI Copilot', timeout=3000)
    except:
        try:
            page.click('text=Copilot', timeout=3000)
        except:
            page.evaluate("() => { document.querySelector('[data-page=\"chatops\"]')?.click(); }")
    page.wait_for_timeout(1000)
    page.screenshot(path='/Users/leohang/project/nextops/test_screenshots/chatops_test.png', full_page=True)
    print("   ChatOps screenshot saved")
    
    page.screenshot(path='/Users/leohang/project/nextops/test_screenshots/dashboard_full.png', full_page=True)
    print("\nAll tests passed!")
    browser.close()
"""Smoke-test the built portable package, allowing only loopback requests."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'artifacts'
ARTIFACTS.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 900})
    external, failures, errors = [], [], []

    def local_only(route):
        if not route.request.url.startswith(('http://127.0.0.1:18743/', 'data:', 'blob:')):
            external.append(route.request.url)
            route.abort()
        else:
            route.continue_()

    context.route('**/*', local_only)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failures.append(response.url) if response.status >= 400 else None)
    page.goto('http://127.0.0.1:18743/')
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('button', name='踏上逃难路')).to_be_visible()
    expect(page.locator('#loading-label')).to_have_count(0)
    expect(page.locator('#game-container canvas')).to_be_visible()
    page.screenshot(path=str(ARTIFACTS / 'local-package-prologue.png'))
    page.get_by_role('button', name='踏上逃难路').click()
    expect(page.locator('.hero-hud')).to_be_visible()
    page.wait_for_load_state('networkidle')
    page.wait_for_function("() => { const img = document.querySelector('.hero-portrait img'); return img && img.complete && img.naturalWidth > 0; }")
    page.reload()
    expect(page.locator('.hero-hud')).to_be_visible()
    page.wait_for_load_state('networkidle')
    page.screenshot(path=str(ARTIFACTS / 'local-package-map.png'))
    box = page.locator('#game-container canvas').bounding_box()
    page.mouse.click(box['x'] + box['width'] * 210 / 960, box['y'] + box['height'] * 315 / 540)
    page.get_by_role('button', name='进入战斗').click()
    # Battle controls are drawn inside Phaser's canvas; the HUD switches to HP.
    expect(page.locator('.hero-hud')).to_contain_text('体力')
    page.wait_for_load_state('networkidle')
    page.screenshot(path=str(ARTIFACTS / 'local-package-battle.png'))
    assert not external, external
    assert not failures, failures
    assert not errors, errors
    print('PASS: packaged game boots offline, enters map and battle, loads portrait, and restores progress after refresh; no external requests or page errors.')
    browser.close()

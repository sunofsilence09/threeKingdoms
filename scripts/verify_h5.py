from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        desktop = browser.new_page(viewport={"width": 1280, "height": 820}, device_scale_factor=1)
        desktop.goto("http://127.0.0.1:5173", wait_until="domcontentloaded")
        desktop.wait_for_timeout(800)
        desktop.screenshot(path=str(ARTIFACTS / "h5-desktop-prologue.png"), full_page=True)
        assert "先把活着这件事" in desktop.locator("#overlay-root").inner_text()

        desktop.get_by_role("button", name="踏上逃难路").click()
        assert desktop.locator("#overlay-root").inner_text() == ""
        desktop.screenshot(path=str(ARTIFACTS / "h5-desktop-map.png"), full_page=True)

        route_page = browser.new_page(viewport={"width": 1280, "height": 820}, device_scale_factor=1)
        route_page.add_init_script(
            """localStorage.setItem('three-kingdoms-demo-state', JSON.stringify({
              phase: 'route-choice', route: null, supplies: 3, morale: 2, flags: { ambushWon: true, recovered: true }
            }))"""
        )
        route_page.goto("http://127.0.0.1:5173", wait_until="domcontentloaded")
        route_page.wait_for_timeout(800)
        assert "你准备把脚步交给谁？" in route_page.locator("#overlay-root").inner_text()
        assert route_page.locator(".route-card").count() == 3
        route_page.locator(".route-card").nth(0).click()
        route_page.locator(".panel-button").click()
        route_page.wait_for_timeout(500)
        route_page.screenshot(path=str(ARTIFACTS / "h5-desktop-battle.png"), full_page=True)

        mobile = browser.new_page(viewport={"width": 844, "height": 390}, device_scale_factor=1)
        mobile.add_init_script(
            """localStorage.setItem('three-kingdoms-demo-state', JSON.stringify({
              phase: 'route-choice', route: null, supplies: 3, morale: 2, flags: { ambushWon: true, recovered: true }
            }))"""
        )
        mobile.goto("http://127.0.0.1:5173", wait_until="domcontentloaded")
        mobile.wait_for_timeout(800)
        panel = mobile.locator(".route-panel")
        box = panel.bounding_box()
        assert box is not None
        assert box["width"] <= 844
        assert mobile.locator(".route-card").count() == 3
        mobile.screenshot(path=str(ARTIFACTS / "h5-mobile-route-choice.png"), full_page=True)

        browser.close()


if __name__ == "__main__":
    main()

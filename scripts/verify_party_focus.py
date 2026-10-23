"""Nested company inspection must restore keyboard focus to the same member."""
import re
from playwright.sync_api import sync_playwright, expect
from verify_h5 import URL

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width':1280,'height':900})
    page.goto(URL, wait_until='networkidle')
    page.get_by_role('button', name='踏上逃难路').click()
    page.get_by_role('button', name=re.compile('队伍 · 出战')).click()
    page.locator('[data-member="aman"]').get_by_role('button',name='成长',exact=True).click()
    expect(page.locator('.training-panel')).to_be_visible()
    page.get_by_role('button',name='取消',exact=True).click()
    assert page.evaluate("document.activeElement.closest('[data-member]')?.dataset.member") == 'aman', 'nested close lost focus on original member action'
    page.keyboard.press('Escape')
    expect(page.locator('.party-panel')).to_have_count(0)
    assert page.get_by_role('button',name=re.compile('队伍 · 出战')).evaluate('(b)=>b===document.activeElement')
    print('PASS: growth returns focus to the same party member, then map entry')
    browser.close()

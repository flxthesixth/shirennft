"""Visual guard for a restrained eligibility checker layout."""
import sys
from playwright.sync_api import sync_playwright


def run(base):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/snap/bin/chromium', args=['--no-sandbox'])
        for width in (390, 1280):
            page = browser.new_page(viewport={'width': width, 'height': 850})
            page.goto(base + '/eligibility')
            panel = page.locator('section[aria-labelledby="checker-title"]')
            panel.wait_for()
            assert page.locator('[data-eligibility-geometry]').count() == 0
            assert page.locator('[class*="geometry"]').count() == 0
            assert page.locator('[class*="page"]').first.evaluate("(el) => getComputedStyle(el).backgroundImage") == 'none'
            assert page.locator('[class*="page"]').first.evaluate("(el) => getComputedStyle(el, '::before').content") == 'none'
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
            assert page.evaluate("getComputedStyle(document.body).backgroundColor") != 'rgb(255, 255, 255)'
            assert panel.is_visible()
            box = panel.bounding_box()
            assert box is not None
            assert box['x'] >= 0 and box['x'] + box['width'] <= width
            assert page.get_by_label('WALLET ADDRESS').is_enabled()
            page.get_by_role('button', name='CHECK STATUS').click()
            assert page.locator('#wallet-error').is_visible()
            page.close()
        browser.close()


if __name__ == '__main__':
    run(sys.argv[1])

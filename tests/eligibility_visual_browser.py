"""Visual guard for eligibility geometry, legibility, and reduced motion."""
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
            geometry = page.locator('[data-eligibility-geometry]')
            assert geometry.count() == 1, 'Missing decorative geometry'
            assert geometry.get_attribute('aria-hidden') == 'true'
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
            assert page.evaluate("getComputedStyle(document.body).backgroundColor") != 'rgb(255, 255, 255)'
            assert panel.is_visible()
            box = panel.bounding_box()
            assert box is not None
            assert box['x'] >= 0 and box['x'] + box['width'] <= width
            assert panel.evaluate('(el) => getComputedStyle(el).zIndex') != 'auto'
            assert page.get_by_label('WALLET ADDRESS').is_enabled()
            assert page.get_by_role('button', name='CHECK STATUS').is_enabled()
            page.close()
        page = browser.new_page(reduced_motion='reduce')
        page.goto(base + '/eligibility')
        shape = page.locator('[data-eligibility-geometry] > span').first
        assert shape.evaluate('(el) => getComputedStyle(el).animationName') == 'none'
        browser.close()


if __name__ == '__main__':
    run(sys.argv[1])

"""Check shared navigation on every exported route at desktop and mobile widths."""
from playwright.sync_api import sync_playwright

ROUTES = ('/', '/eligibility', '/wallet-tracker', '/trading', '/ticket-pass')


def run(base):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/snap/bin/chromium', args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        for route in ROUTES:
            page.goto(base + route)
            nav = page.get_by_role('navigation', name='Main navigation')
            nav.wait_for()
            assert nav.get_by_role('link', name='Home').is_visible(), route
            assert nav.get_by_role('link', name='Wallet Tracker').is_visible(), route
            assert page.locator('nav').count() == 1, route
            assert nav.evaluate('(el) => el.getBoundingClientRect().width <= innerWidth'), route
        page.goto(base + '/wallet-tracker')
        page.get_by_role('navigation', name='Main navigation').get_by_role('link', name='Collection').click()
        page.locator('.shiren-collection').wait_for()
        assert page.url.endswith('/#collection')
        page.get_by_role('navigation', name='Main navigation').get_by_role('link', name='Team').click()
        page.wait_for_url('**/#team')
        page.locator('.shiren-team').wait_for()
        page.set_viewport_size({'width': 375, 'height': 812})
        for route in ROUTES:
            page.goto(base + route)
            nav = page.get_by_role('navigation', name='Main navigation')
            toggle = nav.get_by_role('button', name='Toggle menu')
            assert toggle.is_visible(), route
            assert toggle.get_attribute('aria-expanded') == 'false', route
            toggle.click()
            assert toggle.get_attribute('aria-expanded') == 'true', route
            assert nav.get_by_role('link', name='Trading Desk').is_visible(), route
            assert nav.evaluate('(el) => el.getBoundingClientRect().width <= innerWidth'), route
        browser.close()


if __name__ == '__main__':
    import sys
    run(sys.argv[1])

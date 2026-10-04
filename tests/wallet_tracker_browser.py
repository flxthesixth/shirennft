"""Browser smoke test for tracker totals, category overrides and storage."""
import sys
from playwright.sync_api import sync_playwright

ADDRESS = '0x1111111111111111111111111111111111111111'

def run(url):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 375, "height": 812})
        page.route('**/api/wallet-tracker?*', lambda route: route.fulfill(json={
            'chain': 'Ethereum', 'address': ADDRESS, 'assets': [
                {'id': 'native', 'symbol': 'ETH', 'name': 'Ether', 'amount': 1, 'usd': 2500, 'category': 'Core'},
                {'id': '0x2222222222222222222222222222222222222222', 'symbol': 'USDC', 'name': 'USD Coin', 'amount': 2, 'usd': 2, 'category': 'Stablecoin'},
                {'id': '0x3333333333333333333333333333333333333333', 'symbol': 'UNKNOWN', 'name': 'Unknown', 'amount': 1, 'usd': None, 'category': 'Token'}
            ], 'nftCount': 1, 'nftMore': False, 'tokenMore': False,
            'transactions': [], 'transactionMore': False, 'fetchedAt': '2026-10-04T00:00:00Z'
        }))
        page.goto(url + '/wallet-tracker.html')
        page.get_by_label('Ethereum address').fill(ADDRESS)
        page.get_by_role('button', name='Add wallet').click()
        page.get_by_text('$2,502.00').first.wait_for()
        assert page.get_by_text('Unpriced tokens: 1').count() == 1
        chart = page.get_by_role('img', name='Priced asset allocation')
        assert chart.count() == 1
        assert 'conic-gradient(' in chart.evaluate('(el) => getComputedStyle(el).backgroundImage')
        assert chart.evaluate('(el) => el.getBoundingClientRect().width <= 260')
        page.get_by_label('Category for USDC').select_option('Meme')
        page.get_by_text('Meme').first.wait_for()
        page.reload()
        page.get_by_text('$2,502.00').first.wait_for()
        assert page.get_by_label('Category for USDC').input_value() == 'Meme'
        assert page.locator('body').evaluate('(el) => el.scrollWidth <= window.innerWidth')
        page.set_viewport_size({"width": 1280, "height": 800})
        assert page.locator('body').evaluate('(el) => el.scrollWidth <= window.innerWidth')
        assert chart.evaluate('(el) => el.getBoundingClientRect().width <= 260')
        page.get_by_role('button', name='Remove ' + ADDRESS).click()
        page.get_by_text('$2,502.00').wait_for(state='detached')
        browser.close()

if __name__ == '__main__':
    run(sys.argv[1])

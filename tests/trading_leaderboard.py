"""Browser regression for read-only trader watchlist."""
from playwright.sync_api import sync_playwright


def test(base_url):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/snap/bin/chromium', args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 390, 'height': 850})
        page.route('**/api/trading/leaderboard?*', lambda route: route.fulfill(json={
            'fetchedAt': '2026-10-04T00:00:00Z',
            'entries': [
                {'rank': str(i), 'address': f'0x{i:040x}', 'notional_pnl': '1000000000000000000',
                 'roi_percent': '5', 'win_rate': '50', 'trades': '20', 'notional_volume': '1000'}
                for i in range(1, 101)
            ],
        }))
        page.goto(f'{base_url}/trading.html')
        page.get_by_role('button', name='Load top 100').click()
        assert page.get_by_text('100 traders').is_visible()
        assert page.get_by_text('0x0000…0001').is_visible()
        assert page.get_by_text('Positions and entry times are not available').is_visible()
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
        browser.close()


if __name__ == '__main__':
    import sys
    test(sys.argv[1])

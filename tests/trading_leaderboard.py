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
        page.get_by_text('100 traders').wait_for()
        assert page.get_by_text('0x0000…0001').is_visible()
        page.route('**/api/trading/portfolio?*', lambda route: route.fulfill(json={
            'summary': {'total_account_value': '500', 'free_collateral': '300', 'margin_usage': '0.1'},
            'positions': [{'market_name': 'BTC/USDC', 'size': '0.25', 'side': 0, 'leverage': '3', 'unrealized_pnl': '12.5'}],
        }))
        page.get_by_text('0x0000…0001').click()
        page.get_by_role('button', name='Load open positions').click()
        page.get_by_text('BTC/USDC').wait_for()
        assert page.get_by_text('Long', exact=False).is_visible()
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
        browser.close()


if __name__ == '__main__':
    import sys
    test(sys.argv[1])

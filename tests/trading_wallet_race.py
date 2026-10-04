"""Verify wallet change cannot restore stale account after pending data loads."""
import os
from playwright.sync_api import sync_playwright

base = os.environ.get('BASE_URL', 'http://127.0.0.1:3100')
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/snap/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page()
    page.add_init_script("""window.ethereum = {
      handlers: {},
      on(name, handler) { this.handlers[name] = handler },
      removeListener(name) { delete this.handlers[name] },
      request() { return Promise.resolve(['0x1111111111111111111111111111111111111111']) },
      emit(name) { this.handlers[name]?.([]) }
    }""")
    page.route('**/api/trading/portfolio?**', lambda route: route.fulfill(json={
        'summary': {'total_account_value': '100', 'free_collateral': '100', 'margin_usage': '0'},
        'positions': []
    }))
    page.route('**/api/trading/markets', lambda route: route.fulfill(json={'markets': []}))
    page.goto(base + '/trading')
    page.evaluate("""() => {
      window.originalFetch = window.fetch;
      window.fetch = (...args) => {
        if (!String(args[0]).includes('/api/trading/')) return window.originalFetch(...args);
        return new Promise(resolve => {
          (window.pendingFetches ||= []).push(() => window.originalFetch(...args).then(resolve));
        });
      };
    }""")
    page.get_by_role('button', name='CONNECT WALLET').click()
    page.wait_for_function('window.pendingFetches?.length >= 2', timeout=15000)
    page.evaluate("window.ethereum.emit('accountsChanged')")
    page.evaluate('window.pendingFetches.forEach(release => release())')
    page.get_by_role('button', name='CONNECT WALLET').wait_for()
    assert page.get_by_text('No wallet connected').count() == 1
    assert page.get_by_text('Wallet changed. Reconnect to refresh account data.').count() == 1
    assert page.get_by_text('YOUR PARAMETERS').count() == 0
    browser.close()
print('Wallet change invalidates pending connect: passed')

"""Mobile viewport smoke test; pass BASE_URL to target local or deployed site."""
import os
from playwright.sync_api import sync_playwright

base = os.environ.get('BASE_URL', 'http://127.0.0.1:3100')
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/snap/bin/chromium', args=['--no-sandbox'])
    for width in (320, 390, 768):
        page = browser.new_page(viewport={'width': width, 'height': 700}, is_mobile=True, has_touch=True)
        for path in ('/', '/eligibility', '/ticket-pass', '/trading'):
            page.goto(base + path, wait_until='domcontentloaded')
            page.wait_for_timeout(300)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (width, path, 'horizontal overflow')
            assert page.get_by_role('button', name='Music settings').count() == 1, (width, path, 'music control missing')
        page.close()
        for name in ('Collection', 'Team'):
            page = browser.new_page(viewport={'width': width, 'height': 700}, is_mobile=True, has_touch=True)
            page.goto(base, wait_until='load')
            page.get_by_role('button', name='Toggle menu' if width < 768 else name).first.wait_for(timeout=15000)
            if width < 768:
                page.get_by_role('button', name='Toggle menu').click()
                page.get_by_role('button', name=name, exact=True).last.wait_for(timeout=15000)
            print('Checking', width, name, flush=True)
            page.get_by_role('button', name=name, exact=True).last.click()
            page.wait_for_timeout(600)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (width, name, 'horizontal overflow')
            if name == 'Team':
                cards = page.locator('.shiren-team .flex-card')
                assert cards.count() == 5
                assert cards.first.evaluate('(e) => e.getBoundingClientRect().height') >= 200, (width, 'team card collapsed')
                assert cards.first.locator('h3').evaluate('(e) => getComputedStyle(e).opacity') != '0', (width, 'team title hidden')
                assert cards.first.locator('.icon-x img').evaluate('(e) => Math.abs(e.getBoundingClientRect().width - 30) < 1'), (width, 'X icon size')
                assert cards.first.locator('.card-meta').evaluate('''(group) => {
                    const card = group.closest('.flex-card').getBoundingClientRect();
                    const items = [...group.querySelectorAll('h3, .icon-x, p')].map((item) => item.getBoundingClientRect());
                    return items.every((item) => Math.abs((item.left + item.right - card.left - card.right) / 2) < 2)
                        && items[1].top - items[0].bottom <= 8
                        && items[2].top - items[1].bottom <= 8
                        && Math.abs((items[0].top + items[2].bottom - card.top - card.bottom) / 2) < 2;
                }'''), (width, 'team metadata not compact and centered')
            page.get_by_role('button', name='Back', exact=False).first.click()
            page.get_by_role('button', name='Toggle menu' if width < 768 else 'Collection').first.wait_for(timeout=15000)
            page.close()
    browser.close()
print('Mobile layout: 320/390/768px, all pages and Team/Collection passed')

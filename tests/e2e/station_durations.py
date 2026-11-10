import asyncio, re
from pathlib import Path
from playwright.async_api import async_playwright, expect
OUT=Path('/tmp/browser/shadow-validation')
OUT.mkdir(parents=True, exist_ok=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  for width, height in [(1280,1800),(390,844)]:
   for minutes in [3,5,15,30]:
    page=await browser.new_page(viewport={"width":width,"height":height})
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    await page.goto('http://localhost:8080/treinar',wait_until='domcontentloaded')
    # This state only appears after hydration; prevents pre-hydration no-op clicks.
    await expect(page.get_by_role('button',name='Pular tudo',exact=True)).to_be_visible(timeout=20000)
    await page.get_by_role('button',name='Pular tudo',exact=True).click()
    await expect(page.get_by_role('button',name='Tema',exact=True)).to_be_visible()
    await page.get_by_role('button',name='Emergência',exact=True).click()
    await expect(page.get_by_role('button',name='Intermediário',exact=True)).to_be_visible()
    await page.get_by_role('button',name='Intermediário',exact=True).click()
    await expect(page.get_by_role('button',name=f'{minutes} min',exact=True)).to_be_visible()
    await page.get_by_role('button',name=f'{minutes} min',exact=True).click()
    await expect(page.get_by_role('button',name='Entrar no Modo Sombra',exact=True)).to_be_visible()
    await page.clock.install()
    await page.get_by_role('button',name='Entrar no Modo Sombra',exact=True).click()
    await expect(page).to_have_url(re.compile('/modo-sombra'))
    await expect(page.get_by_label(f'Tempo restante: {minutes:02}:00')).to_be_visible()
    await page.screenshot(path=str(OUT/f'station-{width}-{minutes}.png'))
    await page.get_by_role('button',name='Pausar',exact=True).click()
    await expect(page.get_by_role('button',name='Retomar',exact=True)).to_be_visible()
    await page.clock.run_for(5000)
    await expect(page.get_by_label(f'Tempo restante: {minutes:02}:00')).to_be_visible()
    await page.get_by_role('button',name='Retomar',exact=True).click()
    await expect(page.get_by_role('button',name='Pausar',exact=True)).to_be_visible()
    await page.clock.fast_forward(minutes*60000)
    await expect(page).to_have_url(re.compile('/resultado'),timeout=20000)
    await expect(page.get_by_role('heading',name='Nenhuma estação concluída')).to_have_count(0)
    await page.screenshot(path=str(OUT/f'result-{width}-{minutes}.png'))
    print('PASS',width,minutes,'minutes','URL',page.url,'errors',errors)
    print((await page.locator('body').aria_snapshot())[:1800] if minutes==15 else '')
    await page.close()
  await browser.close()
asyncio.run(main())

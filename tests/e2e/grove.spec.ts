import {test,expect,type Page} from '@playwright/test';
import {unlockStorefront} from './_fixtures/auth';
import {applyConfiguredCountry} from './_fixtures/storefront';

test.beforeEach(async({page})=>{
  await unlockStorefront(page);
  await page.locator('grove-header').waitFor({state:'attached'});
  await page.evaluate(()=>customElements.whenDefined('grove-header'));
  // Consent behavior is an explicit test action; production code never auto-consents.
  const nativeBanner=page.locator('#shopify-pc__banner');
  await expect(nativeBanner).toBeVisible();
  const decline=page.locator('#shopify-pc__banner button').filter({hasText:/^\s*decline(?:\s+all)?\s*$/i});
  await expect(decline).toHaveCount(1);
  await decline.focus();
  await page.keyboard.press('Enter');
  await expect(nativeBanner).toBeHidden();
  await applyConfiguredCountry(page);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.evaluate(()=>customElements.whenDefined('grove-header'));
});

async function scrollJourney(page:Page,fraction:number) {
  await page.evaluate(f=>{
    const journey=document.querySelector('grove-journey') as HTMLElement;
    const rect=journey.getBoundingClientRect();
    const stageInset=parseFloat(getComputedStyle(journey).getPropertyValue('--stage-inset'))||0;
    const physicalHeaderHeight=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grove-header-height'))||0;
    const visibleHeaderHeight=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grove-header-visible-height'))||0;
    const stageHeight=(journey.querySelector('.grove-journey__stage') as HTMLElement).getBoundingClientRect().height;
    const cssViewportHeight=stageHeight+Math.max(visibleHeaderHeight,stageInset);
    // Solve for the target position: mid-journey inset is zero even when the
    // initial demo notice adds inset. The initial inset only recovers CSS height.
    const referenceStageHeight=Math.max(1,cssViewportHeight-physicalHeaderHeight);
    const range=journey.offsetHeight-referenceStageHeight;
    window.scrollTo({top:rect.top+window.scrollY-physicalHeaderHeight+range*f,behavior:'instant'});
  },fraction);
}

async function pressMotionToggle(page:Page) {
  await page.locator('.grove-motion-toggle').evaluate(el=>(el as HTMLButtonElement).focus({preventScroll:true}));
  await page.keyboard.press('Enter');
}

for(const width of [1440,390]) {
  test(`hero chapters stay synchronized with direction-aware header at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await expect(page.locator('grove-journey')).toHaveClass(/has-frame/);
    const initial=await page.locator('[data-copy-field="heading"]').textContent();
    const chapters=await page.locator('[data-journey-chapters]').evaluate(t=>[...(t as HTMLTemplateElement).content.children].map(n=>({...((n as HTMLElement).dataset)})));
    for(const [fraction,index,hidden] of [[.5,1,true],[.85,2,true],[.5,1,false],[0,0,false]]) {
      await scrollJourney(page,fraction);
      await expect(page.locator('grove-journey')).toHaveAttribute('data-active-chapter',String(index));
      await expect(page.locator('[data-copy-field="heading"]')).toHaveText(index===0?initial!:chapters[index].heading!);
      if(hidden) await expect(page.locator('#shopify-section-grove-header')).toHaveClass(/is-hidden/);
      else await expect(page.locator('#shopify-section-grove-header')).not.toHaveClass(/is-hidden/);
      if(hidden) await expect.poll(()=>page.locator('#shopify-section-grove-header').evaluate(el=>el.getBoundingClientRect().bottom)).toBeLessThan(2);
      else await expect.poll(()=>page.locator('#shopify-section-grove-header').evaluate(el=>el.getBoundingClientRect().top)).toBe(0);
      if(index>0){
        for(const field of ['eyebrow','italic','body'])await expect(page.locator(`[data-copy-field="${field}"]`)).toHaveText(chapters[index][field]!);
      }
      const geometry=await page.evaluate(()=>{
        const header=document.querySelector('#shopify-section-grove-header')!.getBoundingClientRect();
        const stage=document.querySelector('.grove-journey__stage')!.getBoundingClientRect();
        const copy=document.querySelector('.grove-journey__copy')!.getBoundingClientRect();
        const controls=document.querySelector('.grove-journey__bottom')!.getBoundingClientRect();
        return {headerTop:header.top,headerBottom:header.bottom,headerHeight:document.querySelector('#shopify-section-grove-header')!.getBoundingClientRect().height,measuredHeight:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grove-header-height')),visibleHeight:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grove-header-visible-height')),stageTop:stage.top,copyTop:copy.top,copyBottom:copy.bottom,controlsTop:controls.top,overflow:document.documentElement.scrollWidth>innerWidth};
      });
      expect(Math.abs(geometry.headerHeight-geometry.measuredHeight)).toBeLessThan(1);
      if(hidden) {
        expect(Math.abs(geometry.headerBottom)).toBeLessThan(2);
        expect(geometry.visibleHeight).toBeLessThan(1);
        expect(Math.abs(geometry.stageTop)).toBeLessThan(2);
      } else {
        expect(geometry.headerTop).toBe(0);
        expect(Math.abs(geometry.visibleHeight-geometry.measuredHeight)).toBeLessThan(1);
        expect(geometry.stageTop).toBeGreaterThanOrEqual(geometry.headerBottom-1);
      }
      expect(geometry.copyTop).toBeGreaterThanOrEqual(geometry.headerBottom);
      expect(geometry.copyBottom).toBeLessThan(geometry.controlsTop);
      expect(geometry.overflow).toBe(false);
    }
    await page.locator('.grove-journey__copy a[href="#pantry"]').click();
    await expect.poll(()=>page.locator('#pantry').evaluate(el=>el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(await page.locator('#shopify-section-grove-header').evaluate(el=>el.getBoundingClientRect().bottom));
  });
}

test('header hides after downward travel and reveals only after upward hysteresis without reflow',async({page})=>{
  const header=page.locator('#shopify-section-grove-header');
  const distances=await page.locator('grove-header').evaluate(el=>({
    hide:Number((el as HTMLElement).dataset.hideAfter),
    reveal:Number((el as HTMLElement).dataset.revealAfter),
  }));
  const mainDocumentTopBefore=await page.locator('#main').evaluate(el=>el.getBoundingClientRect().top+window.scrollY);
  await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),distances.hide+1);
  await expect(header).toHaveClass(/is-hidden/);
  const afterHide=await header.evaluate(el=>({
    height:el.getBoundingClientRect().height,
    measured:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grove-header-height')),
    visible:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grove-header-visible-height')),
  }));
  expect(Math.abs(afterHide.height-afterHide.measured)).toBeLessThan(1);
  expect(afterHide.visible).toBeLessThan(1);
  expect(await page.locator('#main').evaluate(el=>el.getBoundingClientRect().top+window.scrollY)).toBe(mainDocumentTopBefore);

  await page.evaluate(({y,distance})=>window.scrollTo({top:y-distance,behavior:'instant'}),{y:distances.hide+1,distance:distances.reveal-1});
  await expect(header).toHaveClass(/is-hidden/);
  await page.evaluate(({y,distance})=>window.scrollTo({top:y-distance,behavior:'instant'}),{y:distances.hide-distances.reveal+2,distance:2});
  await expect(header).not.toHaveClass(/is-hidden/);
  await expect.poll(()=>page.locator('html').evaluate(el=>parseFloat(getComputedStyle(el).getPropertyValue('--grove-header-visible-height')))).toBeGreaterThan(0);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await expect(header).not.toHaveClass(/is-hidden/);
});

test('keyboard focus, mobile menu, and cart modal keep the header visible',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const header=page.locator('#shopify-section-grove-header');
  const menu=page.locator('.grove-menu-toggle');
  const hideAfter=await page.locator('grove-header').getAttribute('data-hide-after');
  await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),Number(hideAfter)+1);
  await expect(header).toHaveClass(/is-hidden/);

  await page.evaluate(()=>document.querySelector<HTMLButtonElement>('.grove-menu-toggle')?.focus({preventScroll:true}));
  await expect(header).not.toHaveClass(/is-hidden/);
  await page.keyboard.press('Enter');
  await expect(page.locator('.grove-nav')).toBeVisible();
  await page.evaluate(()=>window.scrollBy({top:100,behavior:'instant'}));
  await expect(header).not.toHaveClass(/is-hidden/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.grove-nav')).toBeHidden();
  await expect(menu).toBeFocused();

  await page.evaluate(()=>document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.evaluate(()=>window.scrollTo({top:500,behavior:'instant'}));
  await expect(header).toHaveClass(/is-hidden/);
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('cart:open')));
  await expect(page.locator('.kg-cart__drawer')).toBeVisible();
  await expect(header).not.toHaveClass(/is-hidden/);
  await page.evaluate(()=>window.scrollBy({top:100,behavior:'instant'}));
  await expect(header).not.toHaveClass(/is-hidden/);
});

test('header transition is disabled for reduced motion and survives reconnect',async({page})=>{
  const header=page.locator('#shopify-section-grove-header');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(header).toHaveCSS('transition-duration','0s');
  await page.evaluate(()=>window.scrollTo({top:500,behavior:'instant'}));
  await expect(header).toHaveClass(/is-hidden/);
  await page.evaluate(()=>{
    const node=document.querySelector('grove-header')!;
    const parent=node.parentNode!;
    const next=node.nextSibling;
    node.remove();
    parent.insertBefore(node,next);
  });
  await expect(header).not.toHaveClass(/is-hidden/);
  await page.evaluate(()=>window.scrollBy({top:100,behavior:'instant'}));
  await expect(header).toHaveClass(/is-hidden/);
  await page.evaluate(()=>window.scrollBy({top:-40,behavior:'instant'}));
  await expect(header).not.toHaveClass(/is-hidden/);
});

test('chapter copy pauses with film and resets for reduced motion',async({page})=>{
  const initial=await page.locator('[data-copy-field="heading"]').textContent();
  const journey=page.locator('grove-journey');
  const video=journey.locator('video');
  await expect(journey).toHaveClass(/has-frame/);
  await scrollJourney(page,.5);
  await expect(journey).toHaveAttribute('data-active-chapter','1');
  const frozen=await page.locator('[data-copy-field="heading"]').textContent();
  const frozenTime=await video.evaluate(v=>(v as HTMLVideoElement).currentTime);
  await pressMotionToggle(page);
  const seekAndWait=async(time:number)=>{
    await video.evaluate(async(v,target)=>{
      const element=v as HTMLVideoElement;
      const seeked=new Promise<void>(resolve=>element.addEventListener('seeked',()=>resolve(),{once:true}));
      element.currentTime=target;
      await seeked;
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    },time);
    await expect.poll(()=>video.evaluate(v=>(v as HTMLVideoElement).currentTime)).toBeGreaterThan(time-.2);
    await expect.poll(()=>video.evaluate(v=>(v as HTMLVideoElement).currentTime)).toBeLessThan(time+.2);
  };
  const duration=await video.evaluate(v=>(v as HTMLVideoElement).duration);
  await seekAndWait(duration*.85);
  await expect(page.locator('[data-copy-field="heading"]')).toHaveText(frozen!);
  await expect(journey).toHaveClass(/has-frame/);
  await seekAndWait(frozenTime);
  await scrollJourney(page,.85);
  await expect(page.locator('[data-copy-field="heading"]')).toHaveText(frozen!);
  await pressMotionToggle(page);
  await expect(journey).toHaveAttribute('data-active-chapter','2');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('[data-copy-field="heading"]')).toHaveText(initial!);
  await expect(page.locator('grove-journey')).toHaveAttribute('data-active-chapter','0');
});

test('journey progress uses rendered CSS viewport geometry, not window.innerHeight',async({page})=>{
  await page.evaluate(()=>{
    const original=Object.getOwnPropertyDescriptor(window,'innerHeight');
    Object.defineProperty(window,'__savedInnerHeightDescriptor',{value:original,configurable:true});
    const originalValue=window.innerHeight;
    Object.defineProperty(window,'innerHeight',{configurable:true,get:()=>originalValue+173});
  });
  try {
    await scrollJourney(page,.5);
    const progress=()=>page.locator('grove-journey').evaluate(el=>parseFloat(getComputedStyle(el).getPropertyValue('--journey-progress')));
    await expect.poll(progress).toBeGreaterThanOrEqual(.48);
    await expect.poll(progress).toBeLessThanOrEqual(.52);
    await expect(page.locator('grove-journey')).toHaveAttribute('data-active-chapter','1');
  } finally {
    await page.evaluate(()=>{
      const original=(window as Window&{__savedInnerHeightDescriptor?:PropertyDescriptor}).__savedInnerHeightDescriptor;
      if(original)Object.defineProperty(window,'innerHeight',original);
      delete (window as Window&{__savedInnerHeightDescriptor?:PropertyDescriptor}).__savedInnerHeightDescriptor;
    });
  }
});

test('reconnecting a scrolled hero preserves the opening chapter',async({page})=>{
  const opening=await page.locator('[data-copy-field="heading"]').textContent();
  await expect(page.locator('grove-journey')).toHaveClass(/has-frame/);
  await scrollJourney(page,.85);
  await expect(page.locator('grove-journey')).toHaveAttribute('data-active-chapter','2');
  await page.evaluate(()=>{
    const hero=document.querySelector('grove-journey')!;
    const parent=hero.parentNode!,next=hero.nextSibling;
    hero.remove();parent.insertBefore(hero,next);
    scrollTo({top:0,behavior:'instant'});
  });
  await expect(page.locator('grove-journey')).toHaveAttribute('data-active-chapter','0');
  await expect(page.locator('[data-copy-field="heading"]')).toHaveText(opening!);
});

test('homepage loads visible film and pantry links to real products',async({page})=>{
  await expect(page.locator('grove-journey')).toHaveAttribute('data-motion','true');
  await expect(page.locator('grove-journey')).toHaveClass(/has-frame/);
  await expect(page.locator('grove-journey video')).toHaveCSS('opacity','1');
  await page.locator('.grove-journey__copy a[href="#pantry"]').click();
  const product=page.locator('.grove-card__details h3 a').first();
  const productURL=await product.getAttribute('href');
  await product.click();
  await expect(page).toHaveURL(new RegExp(productURL!));
  await expect(page.locator('h1')).toBeVisible();
});

test('journey seeks forward and backward, and pause freezes the frame',async({page})=>{
  const video=page.locator('grove-journey video');
  await expect(video).toHaveJSProperty('readyState',4);
  await scrollJourney(page,.75);
  await expect.poll(()=>video.evaluate(v=>(v as HTMLVideoElement).currentTime)).toBeGreaterThan(7);
  await pressMotionToggle(page);
  const frozen=await video.evaluate(v=>(v as HTMLVideoElement).currentTime);
  await scrollJourney(page,.25);
  await expect(video).toHaveJSProperty('currentTime',frozen);
  await pressMotionToggle(page);
  await expect.poll(()=>video.evaluate(v=>(v as HTMLVideoElement).currentTime)).toBeLessThan(5);
});

test('homepage quick add creates a real cart line with a loaded thumbnail',async({page})=>{
  await page.locator('.grove-card__add').first().click();
  await expect(page.locator('.kg-cart__drawer')).toBeVisible();
  await expect(page.locator('.kg-cart__line')).toHaveCount(1);
  await expect.poll(()=>page.locator('.kg-cart__line-media img').evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.locator('[data-kg-qty-increment]').click();
  await expect(page.locator('[data-kg-qty-input]')).toHaveValue('2');
  await page.locator('[data-kg-cart-remove]').click();
  await expect(page.locator('[data-kg-cart-empty]')).toBeVisible();
});

test('mobile menu and pantry are usable without overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.locator('.grove-menu-toggle').click();
  await expect(page.locator('.grove-nav')).toBeVisible();
  await page.locator('.grove-nav a').first().click();
  await expect(page.locator('.grove-nav')).toBeHidden();
  await expect(page.locator('.grove-card__add').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('mobile video opening keeps shopping accessible',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('grove-journey')).toHaveClass(/has-frame/);
  await page.locator('.grove-journey__copy a[href="#pantry"]').click();
  await page.locator('.grove-card__details h3 a').first().click();
  await expect(page).toHaveURL(/\/products\//);
  await expect(page.locator('h1')).toBeVisible();
});

test('mobile menu supports keyboard activation and Escape focus return',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const toggle=page.locator('.grove-menu-toggle');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.grove-nav')).toBeVisible();
  // Navigation precedes the action buttons in the document's keyboard order.
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.grove-nav a').last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.grove-nav')).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('reduced motion has a static hero and does not fetch journey media',async({page})=>{
  const mediaRequests:string[]=[];
  await page.emulateMedia({reducedMotion:'reduce'});
  page.on('request',request=>{if(request.url().includes('grove-journey.mp4'))mediaRequests.push(request.url());});
  await page.reload();
  await expect(page.locator('grove-journey')).not.toHaveClass(/is-enhanced/);
  await expect(page.locator('grove-journey video')).toHaveJSProperty('currentSrc','');
  await expect(page.locator('h1')).toBeVisible();
  await expect.poll(()=>page.locator('.grove-journey__poster img').evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(mediaRequests).toEqual([]);
  await page.locator('.grove-journey__copy a[href="#pantry"]').click();
  await expect(page.locator('#PantryHeading')).toBeInViewport();
  await expect(page.locator('.grove-card__add').first()).toBeEnabled();
});

test('keyboard shoppers can open products, select staples and add to cart',async({page})=>{
  await page.locator('.grove-card__details h3 a').first().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/products\//);
  await page.goto('/');
  const selection=page.locator('grove-shelf input[type="checkbox"]').first();
  await selection.focus();
  await page.keyboard.press('Space');
  await expect(selection).toBeChecked();
  await expect(page.locator('grove-shelf button')).toBeEnabled();
  await page.locator('grove-shelf button').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.kg-cart__drawer')).toBeVisible();
  await expect(page.locator('.kg-cart__line')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.kg-cart__drawer')).toBeHidden();
});

test('failed film preserves poster and shopping access',async({page})=>{
  await page.route('**/grove-journey.mp4*',route=>route.abort());
  await page.reload();
  await expect(page.locator('grove-journey')).not.toHaveClass(/is-enhanced/);
  await expect.poll(()=>page.locator('.grove-journey__poster img').evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.locator('.grove-journey__copy a[href="#pantry"]').click();
  await expect(page.locator('.grove-card__add').first()).toBeVisible();
});

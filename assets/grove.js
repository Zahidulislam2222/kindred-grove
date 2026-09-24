/* Shopify supplies routes, messages and timing configuration through Liquid. */
(() => {
  'use strict';
  let config = null;
  try {
    const payload = JSON.parse(document.getElementById('GroveConfig')?.dataset.config || 'null');
    if (payload && typeof payload === 'object' && !Array.isArray(payload)
      && payload.motion && typeof payload.motion === 'object'
      && ['initialTime', 'endMargin', 'seekThreshold', 'revealThreshold'].every((key) => Number.isFinite(payload.motion[key]) && payload.motion[key] >= 0)
      && payload.messages && typeof payload.messages === 'object'
      && ['selected', 'selectHint'].every((key) => typeof payload.messages[key] === 'string' && payload.messages[key].length > 0)) config = payload;
  } catch (_error) {
    config = null;
  }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  async function addItems(items) {
    if (!window.KGClient?.configValid || !Array.isArray(items) || !items.length || items.length > window.KGClient.limits.maxCartAddItems
      || items.some((item) => !item || !Number.isSafeInteger(item.id) || item.id < 1 || !Number.isSafeInteger(item.quantity) || item.quantity < 1)) {
      return { ok: false, reconciled: false, blocked: true };
    }
    const route = window.KGClient.cartRoute('add');
    const cartRoute = window.KGClient.cartRoute('cart');
    if (!route || !cartRoute) return { ok: false, reconciled: false, blocked: true };
    const outcome = await window.KGClient.mutateCart(
      () => window.KGClient.requestJSON(route, {
        method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json'},
        body: JSON.stringify({items}),
      }),
      () => window.KGClient.requestJSON(cartRoute, { headers: { Accept: 'application/json' } }),
      window.KGClient.isAddedItems,
    );
    if (!outcome.ok) {
      if (outcome.reconciled) document.dispatchEvent(new CustomEvent('cart:updated'));
      return outcome;
    }
    document.dispatchEvent(new CustomEvent('cart:updated'));
    return outcome;
  }

  class GroveHeader extends HTMLElement {
    connectedCallback() {
      this.abort = new AbortController();
      this.section = this.closest('.shopify-section');
      if (!this.section) return;
      this.measure = () => {
        const rootStyle=document.documentElement.style;
        const height=this.section.getBoundingClientRect().height;
        rootStyle.setProperty('--grove-header-height', `${height}px`);
        rootStyle.setProperty('--grove-header-visible-height', this.section.classList.contains('is-hidden') ? '0px' : `${height}px`);
      };
      this.resizeObserver = new ResizeObserver(this.measure);
      this.resizeObserver.observe(this.section);
      this.measure();
      this.hideAfter = this.readThreshold('hideAfter');
      this.revealAfter = this.readThreshold('revealAfter');
      this.lastScrollY = window.scrollY;
      this.direction = 0;
      this.directionDistance = 0;
      this.frame = 0;
      this.schedule = this.schedule.bind(this);
      window.addEventListener('scroll', this.schedule, {passive:true,signal:this.abort.signal});
      window.addEventListener('resize', this.schedule, {passive:true,signal:this.abort.signal});
      document.addEventListener('focusin', this.schedule, {signal:this.abort.signal});
      document.addEventListener('focusout', this.schedule, {signal:this.abort.signal});
      this.mutationObserver = new MutationObserver(this.schedule);
      this.mutationObserver.observe(document.body, {
        subtree:true,
        attributes:true,
        attributeFilter:['hidden','open'],
      });

      const button = this.querySelector('button');
      const nav = this.querySelector('nav');
      const close = () => {
        this.classList.remove('is-open');
        button?.setAttribute('aria-expanded', 'false');
        this.schedule();
      };
      button?.addEventListener('click', () => {
        const open = this.classList.toggle('is-open');
        button.setAttribute('aria-expanded', String(open));
        this.schedule();
      }, {signal:this.abort.signal});
      nav?.addEventListener('click', close, {signal:this.abort.signal});
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && this.classList.contains('is-open')) {close();button?.focus();}
      }, {signal:this.abort.signal});
      this.schedule();
    }
    readThreshold(name) {
      const value = Number(this.dataset[name]);
      return Number.isFinite(value) && value > 0 ? value : 0;
    }
    schedule() {
      if (!this.isConnected || this.frame) return;
      this.frame = requestAnimationFrame(() => this.updateVisibility());
    }
    shouldStayVisible() {
      return this.classList.contains('is-open')
        || this.contains(document.activeElement)
        || Boolean(document.querySelector('dialog[open], [aria-modal="true"]:not([hidden])'));
    }
    setHidden(hidden) {
      this.section.classList.toggle('is-hidden', hidden);
      document.documentElement.style.setProperty('--grove-header-visible-height', hidden ? '0px' : `${this.section.getBoundingClientRect().height}px`);
    }
    updateVisibility() {
      this.frame = 0;
      if (!this.isConnected || !this.section) return;
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - this.lastScrollY;
      this.lastScrollY = currentY;

      if (this.shouldStayVisible()) {
        this.direction = 0;
        this.directionDistance = 0;
        this.setHidden(false);
        return;
      }

      if (currentY === 0) {
        this.direction = 0;
        this.directionDistance = 0;
        this.setHidden(false);
        return;
      }

      if (delta === 0) return;
      const direction = delta > 0 ? 1 : -1;
      if (direction !== this.direction) {
        this.direction = direction;
        this.directionDistance = 0;
      }
      this.directionDistance += Math.abs(delta);

      if (direction > 0 && !this.section.classList.contains('is-hidden') && this.hideAfter && this.directionDistance >= this.hideAfter) {
        this.setHidden(true);
      } else if (direction < 0 && this.section.classList.contains('is-hidden') && this.revealAfter && this.directionDistance >= this.revealAfter) {
        this.setHidden(false);
      }
    }
    disconnectedCallback() {
      this.abort?.abort();
      this.resizeObserver?.disconnect();
      this.mutationObserver?.disconnect();
      if (this.frame) cancelAnimationFrame(this.frame);
      this.section?.classList.remove('is-hidden');
      document.documentElement.style.removeProperty('--grove-header-height');
      document.documentElement.style.removeProperty('--grove-header-visible-height');
    }
  }

  class GroveJourney extends HTMLElement {
    connectedCallback() {
      if (!config?.motion) return;
      // The editorial opening needs no video request or scroll listeners.
      if (this.dataset.motion !== 'true') return;
      this.abort = new AbortController();
      this.video = this.querySelector('video');
      this.copy = this.querySelector('.grove-journey__copy');
      this.copyFields = [...this.copy.querySelectorAll('[data-copy-field]')];
      this.chapters = [...this.querySelector('[data-journey-chapters]').content.children].map(node => ({...node.dataset}));
      this.chapter = -1;
      this.setChapter(0,false);
      this.frame = null;
      this.paused = false;
      this.targetTime = 0;
      this.style.setProperty('--journey-distance', `${this.dataset.travel}vh`);
      this.update = this.update.bind(this);
      this.schedule = this.schedule.bind(this);
      this.setup = this.setup.bind(this);
      this.paint = this.paint.bind(this);
      const signal = this.abort.signal;
      window.addEventListener('scroll', this.schedule, {passive:true,signal});
      window.addEventListener('resize', this.schedule, {passive:true,signal});
      motion.addEventListener('change', this.setup, {signal});
      this.video.addEventListener('loadedmetadata', () => {this.video.currentTime = config.motion.initialTime;this.schedule();}, {signal});
      this.video.addEventListener('loadeddata', () => requestAnimationFrame(this.paint), {signal});
      this.video.addEventListener('seeked', () => {
        if (this.video.requestVideoFrameCallback) {
          if (this.videoCallback) this.video.cancelVideoFrameCallback(this.videoCallback);
          this.videoCallback = this.video.requestVideoFrameCallback(this.paint);
        }
        requestAnimationFrame(this.paint);
        if (Math.abs(this.video.currentTime - this.targetTime) > config.motion.seekThreshold) this.schedule();
      }, {signal});
      this.video.addEventListener('error', () => this.fallback(), {signal});
      this.querySelector('button').addEventListener('click', event => {
        this.paused = !this.paused;
        event.currentTarget.setAttribute('aria-pressed',String(this.paused));
        event.currentTarget.textContent = this.paused ? event.currentTarget.dataset.resumeLabel : event.currentTarget.dataset.pauseLabel;
        if (!this.paused) this.schedule();
      }, {signal});
      this.setup();
    }
    setup() {
      this.classList.toggle('is-enhanced',!motion.matches);
      if (motion.matches) {this.video.pause();this.classList.remove('has-frame');this.setChapter(0);return;}
      if (!this.video.getAttribute('src') && !this.loading) this.loadVideo();
      this.schedule();
    }
    async loadVideo() {
      this.loading=true;
      try {
        // Shopify CLI's local media proxy can expose a zero-length seekable range.
        // A complete local blob gives the decoder a real seekable file in preview
        // and has a matching cleanup path when the editor removes this section.
        const response=await fetch(this.video.dataset.src,{signal:this.abort.signal});
        if(!response.ok)throw new Error('Media unavailable');
        const blob=await response.blob();
        if(!this.isConnected || this.abort.signal.aborted || motion.matches)return;
        this.mediaUrl=URL.createObjectURL(blob);
        this.video.src=this.mediaUrl;this.video.load();
      }catch(error){
        if(error.name!=='AbortError')this.fallback();
      }finally{this.loading=false;}
    }
    fallback() {this.classList.remove('is-enhanced','has-frame');this.setChapter(0);}
    setChapter(index,animate=true) {
      if (index === this.chapter) return;
      this.chapter = index;
      this.setAttribute('data-active-chapter',String(index));
      this.copyFields.forEach(node => {node.textContent = this.chapters[index][node.dataset.copyField];});
      this.querySelectorAll('[data-chapter]').forEach((node,i)=>node.classList.toggle('is-active',i===index));
      this.copy.classList.remove('is-changing');
      if (animate && !motion.matches) {
        // Restart the CSS-token-controlled fade only at chapter boundaries.
        void this.copy.offsetWidth;
        this.copy.classList.add('is-changing');
      }
    }
    paint() {
      if (!this.isConnected || this.abort.signal.aborted || motion.matches || !this.classList.contains('is-enhanced') || this.video.readyState < 2) return;
      this.classList.add('has-frame');
      if (!this.paused && Number.isFinite(this.video.duration) && this.video.duration > 0) {
        this.setChapter(Math.min(this.chapters.length-1,Math.floor(this.video.currentTime/this.video.duration*this.chapters.length)));
      }
    }
    schedule() {if (!this.frame) this.frame=requestAnimationFrame(this.update);}
    update() {
      this.frame=null;
      if (motion.matches || this.paused) return;
      const rect=this.getBoundingClientRect();
      const headerHeight=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grove-header-height'))||0;
      const stageInset=Math.max(0,rect.top);
      const visibleHeaderHeight=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grove-header-visible-height'))||0;
      this.style.setProperty('--stage-inset', `${stageInset}px`);
      const stageHeight=this.querySelector('.grove-journey__stage').getBoundingClientRect().height;
      const cssViewportHeight=stageHeight+Math.max(visibleHeaderHeight,stageInset);
      const referenceStageHeight=Math.max(1,cssViewportHeight-Math.max(headerHeight,stageInset));
      const distance=this.offsetHeight-referenceStageHeight;
      const progress=Math.min(1,Math.max(0,(headerHeight-rect.top)/Math.max(1,distance)));
      this.style.setProperty('--journey-progress',String(progress));
      if (Number.isFinite(this.video.duration) && this.video.readyState >= 1) {
        this.targetTime=Math.max(config.motion.initialTime,progress*(this.video.duration-config.motion.endMargin));
        if (!this.video.seeking && Math.abs(this.video.currentTime-this.targetTime)>config.motion.seekThreshold) this.video.currentTime=this.targetTime;
      }
    }
    disconnectedCallback() {
      if (!this.abort) return;
      this.abort.abort();cancelAnimationFrame(this.frame);
      if (this.videoCallback && this.video.cancelVideoFrameCallback) this.video.cancelVideoFrameCallback(this.videoCallback);
      this.video.pause();this.video.removeAttribute('src');this.video.load();
      if(this.mediaUrl)URL.revokeObjectURL(this.mediaUrl);
    }
  }

  class GroveShop extends HTMLElement {
    connectedCallback() {
      if (!window.KGClient?.configValid) return;
      this.abort = new AbortController();
      this.addEventListener('submit', async event => {
        const form=event.target.closest('[data-grove-add]');
        if (!form || this.busy) return;
        event.preventDefault();
        const button=form.querySelector('button');
        if (button.disabled) return;
        const status=form.querySelector('[role="status"]');
        button.disabled=true;button.setAttribute('aria-busy','true');status.textContent=window.KGClient.config.messages.cart.adding;
        this.busy=true;
        try {
          const id=Number(new FormData(form).get('id'));
          const outcome=await addItems([{id,quantity:1}]);
          if(!this.isConnected)return;
          if(outcome.ok)status.textContent=window.KGClient.config.messages.cart.added;
          else status.textContent=window.KGClient.config.messages.cart.statusUnknown;
          if(!outcome.ok&&!outcome.reconciled)button.disabled=true;
        } catch (_error) {
          if(this.isConnected)status.textContent=window.KGClient.config.messages.cart.statusError;
        } finally {
          this.busy=false;
          if(this.isConnected&&!window.KGClient.cartWritesBlocked()){button.disabled=false;button.removeAttribute('aria-busy');}
        }
      }, {signal:this.abort.signal});
    }
    disconnectedCallback() {this.abort.abort();}
  }

  class GroveShelf extends HTMLElement {
    connectedCallback() {
      if (!window.KGClient?.configValid) return;
      this.abort=new AbortController();
      this.form=this.querySelector('form');
      if(!this.form)return;
      this.button=this.form.querySelector('button');
      this.status=this.form.querySelector('[role="status"]');
      try {this.money=new Intl.NumberFormat(document.documentElement.lang||undefined,{style:'currency',currency:window.KGClient.config.currency});}
      catch (_error) {this.money={format:()=>''};}
      this.addEventListener('change',()=>this.update(),{signal:this.abort.signal});
      this.form.addEventListener('submit',async event=>{
        event.preventDefault();
        const selected=this.selected();
        if (!selected.length || this.busy) return;
        this.busy=true;this.button.disabled=true;this.button.setAttribute('aria-busy','true');this.status.textContent=window.KGClient.config.messages.cart.adding;
        try {
          const outcome=await addItems(selected.map(input=>({id:Number(input.value),quantity:1})));
          if(this.isConnected)this.status.textContent=outcome.ok?window.KGClient.config.messages.cart.added:window.KGClient.config.messages.cart.statusUnknown;
          if(!outcome.ok&&!outcome.reconciled)this.button.disabled=true;
        } catch (_error) {
          if(this.isConnected)this.status.textContent=window.KGClient.config.messages.cart.statusError;
        } finally {
          this.busy=false;
          if(this.isConnected&&!window.KGClient.cartWritesBlocked()){this.button.removeAttribute('aria-busy');this.update(false);}
        }
      },{signal:this.abort.signal});
      this.update();
    }
    selected() {return [...this.querySelectorAll('input:checked:not(:disabled)')];}
    update(announce=true) {
      const selected=this.selected();
      let total=0;
      for(const input of selected){const price=Number(input.dataset.price);if(!Number.isSafeInteger(price)||price<0||!Number.isSafeInteger(total+price)){total=NaN;break;}total+=price;}
      this.querySelector('[data-shelf-total]').textContent=Number.isSafeInteger(total)?this.money.format(total/100):'';
      this.button.disabled=this.busy || !selected.length || selected.length>window.KGClient.limits.maxCartAddItems || !Number.isSafeInteger(total);
      this.querySelectorAll('[data-shelf-object]').forEach(object=>object.classList.toggle('is-selected',selected.some(input=>input.value===object.dataset.shelfObject)));
      if(announce&&this.status)this.status.textContent=selected.length ? (config?.messages?.selected||'').replace('[count]',String(selected.length)) : (config?.messages?.selectHint||'');
    }
    disconnectedCallback() {this.abort.abort();}
  }

  for (const [name,element] of [['grove-header',GroveHeader],['grove-journey',GroveJourney],['grove-shop',GroveShop],['grove-shelf',GroveShelf]]) {
    if (!customElements.get(name)) customElements.define(name,element);
  }
  const revealThreshold=config?.motion?.revealThreshold;
  const observer=Number.isFinite(revealThreshold) && revealThreshold > 0 ? new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.remove('is-waiting');observer.unobserve(entry.target);}
  }),{threshold:revealThreshold}) : null;
  function reveal(root) {
    if(motion.matches||!observer)return;
    document.documentElement.classList.add('grove-animate');
    root.querySelectorAll('[data-reveal]').forEach(node=>{node.classList.add('is-waiting');observer.observe(node);});
  }
  reveal(document);
  document.addEventListener('shopify:section:load',event=>reveal(event.target));
  document.addEventListener('shopify:section:unload',event=>event.target.querySelectorAll('[data-reveal]').forEach(node=>observer?.unobserve(node)));
  document.addEventListener('change',event=>{
    const form=event.target.closest('[data-grove-sort]');
    if(form)form.requestSubmit();
  });
})();

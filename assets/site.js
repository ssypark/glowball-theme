(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Shopify Ajax Cart ----------
  function moneyFmt(cents){
    return '$' + (cents/100).toFixed(2).replace(/\.00$/, '');
  }

  function fetchCart(){
    return fetch('/cart.js', { headers: { 'Accept': 'application/json' } }).then(function(r){ return r.json(); });
  }

  function addItemsToCart(items){
    // items: [{id, quantity, properties}]
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: items })
    }).then(function(r){
      if(!r.ok) return r.json().then(function(err){ throw err; });
      return r.json();
    });
  }

  function updateCartLine(line, quantity){
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ line: line, quantity: quantity })
    }).then(function(r){ return r.json(); });
  }

  function esc(str){
    var d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function renderCart(cart){
    var cartItemsEl = document.getElementById('cartItems');
    var cartSubtotalEl = document.getElementById('cartSubtotal');
    var cartCountEl = document.getElementById('cartCount');
    if(!cartItemsEl) return;

    if(!cart || cart.item_count === 0){
      cartItemsEl.innerHTML = '<p class="cart-empty">Your cart is empty. The fairway is dark &mdash; go fix that.</p>';
      if(cartCountEl){ cartCountEl.textContent = '0'; cartCountEl.setAttribute('data-empty','true'); }
      if(cartSubtotalEl) cartSubtotalEl.textContent = '$0';
      return;
    }

    var html = '';
    cart.items.forEach(function(item, idx){
      var props = '';
      if(item.properties){
        Object.keys(item.properties).forEach(function(k){
          if(item.properties[k]) props += '<span class="sku">' + esc(k) + ': ' + esc(item.properties[k]) + '</span>';
        });
      }
      html += '<div class="cart-item" data-line="'+(idx+1)+'">'
        + (item.image ? '<img src="'+item.image+'" alt="">' : '<div style="width:56px;height:56px;background:var(--graphite);flex-shrink:0;"></div>')
        + '<div class="cart-item-info">'
        + '<h4>'+esc(item.product_title)+'</h4>'
        + (item.variant_title ? '<span class="sku">'+esc(item.variant_title)+'</span>' : '')
        + '<span class="sku">'+esc(item.sku||'')+'</span>'
        + props
        + '<div class="qty-row">'
        + '<button class="qty-btn" data-action="dec" aria-label="Decrease quantity">&minus;</button>'
        + '<span class="qty-val">'+item.quantity+'</span>'
        + '<button class="qty-btn" data-action="inc" aria-label="Increase quantity">+</button>'
        + '<button class="remove-btn" data-action="remove">Remove</button>'
        + '</div></div>'
        + '<span class="cart-item-price">'+moneyFmt(item.final_line_price)+'</span>'
        + '</div>';
    });
    cartItemsEl.innerHTML = html;
    if(cartSubtotalEl) cartSubtotalEl.textContent = moneyFmt(cart.total_price);
    if(cartCountEl){ cartCountEl.textContent = cart.item_count; cartCountEl.setAttribute('data-empty', cart.item_count === 0 ? 'true' : 'false'); }
  }

  function refreshCart(){
    return fetchCart().then(renderCart);
  }

  function initCartDrawer(){
    var cartDrawer = document.getElementById('cartDrawer');
    var overlay = document.getElementById('overlay');
    var cartItemsEl = document.getElementById('cartItems');
    var openBtn = document.getElementById('cartOpenBtn');
    var closeBtn = document.getElementById('cartCloseBtn');
    if(!cartDrawer) return { open: function(){}, close: function(){} };

    function openCart(){ cartDrawer.classList.add('open'); if(overlay) overlay.classList.add('open'); }
    function closeCart(){ cartDrawer.classList.remove('open'); if(overlay) overlay.classList.remove('open'); }
    if(openBtn) openBtn.addEventListener('click', function(){ refreshCart(); openCart(); });
    if(closeBtn) closeBtn.addEventListener('click', closeCart);
    if(overlay) overlay.addEventListener('click', closeCart);

    if(cartItemsEl){
      cartItemsEl.addEventListener('click', function(e){
        var btn = e.target.closest('button');
        if(!btn) return;
        var row = btn.closest('.cart-item');
        if(!row) return;
        var line = parseInt(row.getAttribute('data-line'), 10);
        var action = btn.getAttribute('data-action');
        var qtyVal = row.querySelector('.qty-val');
        var currentQty = parseInt(qtyVal.textContent, 10);
        var newQty = currentQty;
        if(action === 'inc') newQty = currentQty + 1;
        if(action === 'dec') newQty = Math.max(0, currentQty - 1);
        if(action === 'remove') newQty = 0;
        updateCartLine(line, newQty).then(refreshCart);
      });
    }
    refreshCart();
    return { open: openCart, close: closeCart };
  }

  function initAddButtons(drawer){
    document.addEventListener('click', function(e){
      var btn = e.target.closest('button.add-btn');
      if(!btn) return;
      e.preventDefault();
      if(btn.getAttribute('data-soon') === 'true'){
        var original = btn.textContent;
        btn.textContent = 'Soon';
        setTimeout(function(){ btn.textContent = original; }, 1200);
        return;
      }
      var variantId = btn.getAttribute('data-variant-id');
      if(!variantId) return;
      addItemsToCart([{ id: variantId, quantity: 1 }]).then(function(){
        btn.classList.add('added');
        var orig = btn.textContent;
        btn.textContent = '✓';
        setTimeout(function(){ btn.classList.remove('added'); btn.textContent = orig; }, 900);
        if(drawer){ refreshCart(); drawer.open(); }
      }).catch(function(err){
        console.error('Add to cart failed', err);
      });
    });
  }

  // ---------- nav / mobile menu ----------
  function initMobileMenu(){
    var mobileMenu = document.getElementById('mobileMenu');
    var openBtn = document.getElementById('menuOpenBtn');
    var closeBtn = document.getElementById('menuCloseBtn');
    if(!mobileMenu) return;
    if(openBtn) openBtn.addEventListener('click', function(){ mobileMenu.classList.add('open'); });
    if(closeBtn) closeBtn.addEventListener('click', function(){ mobileMenu.classList.remove('open'); });
    mobileMenu.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ mobileMenu.classList.remove('open'); });
    });
  }

  // ---------- nav: solid background once the page scrolls ----------
  function initNavScroll(){
    var nav = document.querySelector('.topnav');
    if(!nav) return;
    function update(){ nav.classList.toggle('scrolled', window.scrollY > 40); }
    window.addEventListener('scroll', update, { passive:true });
    update();
  }

  // ---------- FAQ accordion ----------
  function initFAQ(){
    var items = document.querySelectorAll('.faq-q');
    if(!items.length) return;
    items.forEach(function(btn){
      btn.addEventListener('click', function(){
        var item = btn.closest('.faq-item');
        var isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item.open').forEach(function(o){
          o.classList.remove('open');
          o.querySelector('.faq-q').setAttribute('aria-expanded','false');
        });
        if(!isOpen){
          item.classList.add('open');
          btn.setAttribute('aria-expanded','true');
        }
      });
    });
  }

  // ---------- homepage hero: starfield + driving-range streaks ----------
  function initHeroAnimation(){
    var rangeBg = document.getElementById('rangeBg');
    if(!rangeBg) return;
    var count = 70;
    for(var i=0;i<count;i++){
      var s = document.createElement('div');
      var size = Math.random() < .85 ? (1 + Math.random()) : (2 + Math.random()*1.5);
      s.className = 'star';
      s.style.width = size+'px';
      s.style.height = size+'px';
      s.style.left = (Math.random()*100)+'%';
      s.style.top = (Math.random()*65)+'%';
      if(!reduced){
        s.style.animationDuration = (2.5 + Math.random()*4)+'s';
        s.style.animationDelay = (Math.random()*4)+'s';
      } else {
        s.style.opacity = '.5';
      }
      rangeBg.appendChild(s);
    }
    if(reduced) return;
    initRangeShots(rangeBg);
  }

  // Driver shots seen from a hitting bay: real launch speeds, drag, backspin
  // lift and sidespin, projected in 3D so balls rip off the tee, then slow and
  // shrink toward the horizon until they're specks among the stars.
  function initRangeShots(rangeBg){
    var canvas = document.createElement('canvas');
    canvas.className = 'range-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    rangeBg.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var G = 9.81;
    var K_DRAG = 0.0047;     // 0.5·ρ·Cd·A / m for a golf ball (1/m)
    var K_LIFT = 0.0034;     // same for backspin (Magnus) lift
    var SPIN_DECAY = 0.03;   // lift fades a little as spin bleeds off (1/s)
    var BALL_R = 0.0214;     // m
    var CAM_H = 1.5;         // eye height in the bay (m)
    var CAM_BACK = 3.5;      // standing just behind the tee (m)
    var TRACER_S = 0.45;     // tracer length (s)
    var FADE_START = 260, FADE_END = 340;  // only the very longest drives dissolve before dropping out of frame (m)
    var STEP = 1 / 240;
    var colors = ['#5aff8c', '#1ee1ff', '#ff911e', '#ff3cc8', '#f2f2f0'];

    var W = 0, H = 0, f = 0, horizon = 0;
    var balls = [];
    var clock = 0, nextLaunch = 0, lastFrame = 0, rafId = null;

    function resize(){
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rangeBg.clientWidth; H = rangeBg.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // telephoto framing (~25° vertical FOV) with the horizon just below the hero,
      // so the climb fills the sky and balls drop out of frame before they land
      f = H * 2.3;
      horizon = H * 1.08;
    }

    function launch(){
      var ownBay = Math.random() < 0.3;
      var x0 = ownBay ? (Math.random() - 0.5) * 0.6 : (Math.random() - 0.5) * 70;
      var speed = (130 + Math.random() * 40) * 0.44704;          // 130–170 mph
      var angle = (9 + Math.random() * 8) * Math.PI / 180;        // launch angle
      var side = (Math.random() - 0.5) * 0.0016;                  // draw / fade
      var vh = speed * Math.cos(angle);

      // Fly the shot once aimed straight downrange to find its carry and curve.
      // The forces don't care which way the ball is pointed, so rotating the aim
      // rotates the whole flight path; aim it so it lands in the middle third
      // of the screen (most shots), or just outside it (the rest).
      var probe = { x: 0, y: 0.03, z: 0, vx: 0, vy: speed * Math.sin(angle), vz: vh, side: side, t: 0 };
      while(!(probe.y <= 0 && probe.vy < 0) && probe.t < 12) step(probe, 1 / 60);
      var reach = Math.sqrt(probe.x * probe.x + probe.z * probe.z);
      var spread = Math.random() < 0.8 ? 1 : 1.7;
      var targetX = (Math.random() * 2 - 1) * spread * (W / 6) * (reach + CAM_BACK) / f;
      var ratio = Math.max(-1, Math.min(1, (targetX - x0) / reach));
      var aim = Math.asin(ratio) - Math.atan2(probe.x, probe.z);

      balls.push({
        x: x0, y: 0.03, z: 0,
        vx: vh * Math.sin(aim), vy: speed * Math.sin(angle), vz: vh * Math.cos(aim),
        side: side,
        t: 0, landed: -1, trail: [],
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    function step(b, dt){
      var v = Math.sqrt(b.vx*b.vx + b.vy*b.vy + b.vz*b.vz);
      var h = Math.sqrt(b.vx*b.vx + b.vz*b.vz) || 1e-6;
      var kl = K_LIFT * Math.exp(-SPIN_DECAY * b.t);
      var side = b.side * v * v / h;
      b.vx += (-K_DRAG*v*b.vx - kl*v*b.vy*b.vx/h + side*b.vz) * dt;
      b.vy += (-G - K_DRAG*v*b.vy + kl*v*h) * dt;
      b.vz += (-K_DRAG*v*b.vz - kl*v*b.vy*b.vz/h - side*b.vx) * dt;
      b.x += b.vx*dt; b.y += b.vy*dt; b.z += b.vz*dt; b.t += dt;
    }

    function project(b){   // b: anything with world x/y/z (m)
      var d = b.z + CAM_BACK;
      return {
        x: W / 2 + f * b.x / d,
        y: horizon - f * (b.y - CAM_H) / d,
        r: Math.max(1.7, f * BALL_R * 2.2 / d),
        d: d
      };
    }

    function advance(dt){
      clock += dt;
      while(clock >= nextLaunch){
        launch();
        nextLaunch = clock + 0.3 + Math.random() * 0.9;
      }
      balls.forEach(function(b){
        if(b.landed >= 0){ b.landed += dt; return; }
        // record the tracer per physics step so it stays smooth even when frames drop
        for(var s = 0; s < dt; s += STEP){
          step(b, Math.min(STEP, dt - s));
          if(b.y <= 0 && b.vy < 0){ b.y = 0; b.landed = 0; break; }
          b.trail.push({ x: b.x, y: b.y, z: b.z, t: b.t });   // world coords, so resizes don't kink the tracer
        }
      });
      balls = balls.filter(function(b){ return b.landed < 0.6 && b.z < FADE_END; });
      var tail = function(b){ return b.t - TRACER_S; };
      balls.forEach(function(b){ while(b.trail.length > 2 && b.trail[0].t < tail(b)) b.trail.shift(); });
    }

    function draw(){
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      balls.forEach(function(b){
        var p = project(b);
        var fade = b.landed >= 0 ? 1 - b.landed / 0.6 : 1;
        fade *= Math.min(1, Math.max(0, (FADE_END - b.z) / (FADE_END - FADE_START)));

        ctx.strokeStyle = b.color;
        ctx.lineCap = 'round';
        var pts = b.trail.map(project);
        for(var i = 1; i < pts.length; i++){
          var a = pts[i-1], c = pts[i];
          ctx.globalAlpha = 0.7 * fade * (i / b.trail.length);
          ctx.lineWidth = Math.max(0.8, p.r * 1.1 * (i / b.trail.length));
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
        }

        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.14 * fade;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.3 * fade;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = fade;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function frame(now){
      var dt = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      advance(dt);
      draw();
      rafId = requestAnimationFrame(frame);
    }

    function start(){
      if(rafId) return;
      lastFrame = performance.now();
      rafId = requestAnimationFrame(frame);
    }
    function stop(){
      if(rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    resize();
    window.addEventListener('resize', resize);
    // start mid-session so the sky isn't empty on load
    for(var i = 0; i < 360; i++) advance(1 / 60);

    if('IntersectionObserver' in window){
      new IntersectionObserver(function(entries){
        entries[0].isIntersecting ? start() : stop();
      }).observe(rangeBg);
    } else {
      start();
    }
  }

  function initHeroScroll(){
    var hero = document.getElementById('hero');
    if(!hero) return;
    var ticking = false;
    window.addEventListener('scroll', function(){
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(function(){
        var y = window.scrollY;
        var shrink = Math.min(y / 600, 1);
        hero.style.opacity = 1 - shrink * 0.6;
        ticking = false;
      });
    }, { passive:true });
  }

  // ---------- product detail page ----------
  function initVariantPicker(){
    var picker = document.getElementById('pdpVariantPicker');
    var dataEl = document.getElementById('pdpVariantData');
    var addBtn = document.getElementById('pdpAddBtn');
    if(!picker || !dataEl || !addBtn) return;
    var variants = JSON.parse(dataEl.textContent);
    var selects = picker.querySelectorAll('select');
    var priceEl = document.getElementById('pdpPrice');
    var skuEl = document.getElementById('pdpSku');

    picker.addEventListener('change', function(){
      var chosen = [];
      selects.forEach(function(sel){ chosen[parseInt(sel.getAttribute('data-option-position'), 10) - 1] = sel.value; });
      var variant = variants.filter(function(v){
        return v.options.every(function(opt, i){ return opt === chosen[i]; });
      })[0];

      if(!variant){
        addBtn.disabled = true;
        addBtn.textContent = 'Unavailable';
        return;
      }
      addBtn.setAttribute('data-variant-id', variant.id);
      addBtn.disabled = !variant.available;
      addBtn.textContent = variant.available ? 'Add to cart' : 'Sold out';
      if(priceEl) priceEl.textContent = moneyFmt(variant.price);
      if(skuEl) skuEl.textContent = variant.sku || '';
      var url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url.toString());
    });
  }

  function initProductPage(){
    var root = document.getElementById('pdpRoot');
    if(!root) return;
    initVariantPicker();

    var mainImg = document.getElementById('pdpMainImg');
    var thumbs = document.getElementById('pdpThumbs');
    if(thumbs){
      thumbs.querySelectorAll('.pdp-thumb').forEach(function(t){
        t.addEventListener('click', function(){
          var full = t.getAttribute('data-full');
          mainImg.innerHTML = '<img src="'+full+'" alt="">';
          thumbs.querySelectorAll('.pdp-thumb').forEach(function(o){ o.classList.remove('active'); });
          t.classList.add('active');
        });
      });
    }

    var notifyBtn = document.getElementById('pdpNotifyBtn');
    if(notifyBtn){
      notifyBtn.addEventListener('click', function(){
        document.getElementById('pdpAddedMsg').textContent = 'Added to the launch list. We’ll ship you the details.';
      });
    }

    var qtyDisplay = document.getElementById('pdpQtyDisplay');
    var qty = 1;
    var qtyDec = document.getElementById('pdpQtyDec');
    var qtyInc = document.getElementById('pdpQtyInc');
    if(qtyDec) qtyDec.addEventListener('click', function(){ qty = Math.max(1, qty-1); qtyDisplay.textContent = qty; });
    if(qtyInc) qtyInc.addEventListener('click', function(){ qty++; qtyDisplay.textContent = qty; });

    var logoToggle = document.getElementById('pdpLogoToggle');
    var logoUploadRow = document.getElementById('logoUploadRow');
    if(logoToggle){
      logoToggle.addEventListener('change', function(){ logoUploadRow.hidden = !logoToggle.checked; });
    }

    var addBtn = document.getElementById('pdpAddBtn');
    if(addBtn){
      addBtn.addEventListener('click', function(){
        var variantId = addBtn.getAttribute('data-variant-id');
        var addonVariantId = addBtn.getAttribute('data-addon-variant-id');
        var productName = addBtn.getAttribute('data-product-name');
        var items = [{ id: variantId, quantity: qty }];
        var msg = qty + ' × ' + productName + ' added to cart.';
        if(logoToggle && logoToggle.checked){
          items[0].properties = { 'Custom logo': 'Yes — will email logo separately' };
          if(addonVariantId && addonVariantId !== ''){
            items.push({ id: addonVariantId, quantity: qty });
          }
          msg += ' Custom logo add-on included — you’ll be asked to email your file after ordering.';
        }
        addItemsToCart(items).then(function(){
          document.getElementById('pdpAddedMsg').textContent = msg;
          var cartDrawerApi = window.__glowballCartDrawer;
          if(cartDrawerApi){ refreshCart().then(function(){ cartDrawerApi.open(); }); }
        }).catch(function(err){
          console.error('Add to cart failed', err);
          document.getElementById('pdpAddedMsg').textContent = 'Something went wrong adding this to your cart.';
        });
      });
    }
  }

  // ---------- boot ----------
  document.addEventListener('DOMContentLoaded', function(){
    var drawer = initCartDrawer();
    window.__glowballCartDrawer = drawer;
    initAddButtons(drawer);
    initMobileMenu();
    initNavScroll();
    initFAQ();
    initHeroAnimation();
    initHeroScroll();
    initProductPage();
  });
})();

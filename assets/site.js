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
    var colors = ['#5aff8c','#1ee1ff','#ff911e','#ff3cc8'];
    var styleEl = document.createElement('style');
    var css = '';
    var ballCount = 10;
    for(var j=0;j<ballCount;j++){
      var b = document.createElement('div');
      var bsize = 4 + Math.random()*5;
      var color = colors[j % colors.length];
      b.className = 'range-ball';
      b.style.width = bsize+'px';
      b.style.height = bsize+'px';
      b.style.background = color;
      b.style.boxShadow = '0 0 '+(bsize*2)+'px '+color;
      var startX = 6 + Math.random()*88;
      var name = 'flight'+j;
      var duration = (5 + Math.random()*4)+'s';
      var delay = (Math.random()*6)+'s';
      css += '@keyframes '+name+'{'
        + '0%{ left:'+startX+'%; bottom:2%; transform:scale(1.4); opacity:0; }'
        + '15%{ opacity:1; }'
        + '90%{ opacity:.7; }'
        + '100%{ left:'+(46+Math.random()*10)+'%; bottom:62%; transform:scale(.15); opacity:0; }'
        + '}';
      b.style.animationName = name;
      b.style.animationDuration = duration;
      b.style.animationDelay = delay;
      rangeBg.appendChild(b);
    }
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
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
    initFAQ();
    initHeroAnimation();
    initHeroScroll();
    initProductPage();
  });
})();

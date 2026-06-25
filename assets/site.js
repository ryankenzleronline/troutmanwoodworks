/* Troutman Woodworks — site interactions (vanilla, no deps) */
(function(){
  "use strict";

  /* ---- mobile nav ---- */
  var burger = document.querySelector('.burger');
  if(burger){
    burger.addEventListener('click', function(){
      document.body.classList.toggle('nav-open');
    });
    document.querySelectorAll('.mobile-nav a').forEach(function(a){
      a.addEventListener('click', function(){ document.body.classList.remove('nav-open'); });
    });
  }

  /* ---- header elevation on scroll ---- */
  var header = document.querySelector('.site-header');
  if(header){
    var onScroll = function(){
      header.style.boxShadow = window.scrollY > 12 ? '0 10px 30px -22px rgba(41,35,28,.45)' : 'none';
    };
    onScroll();
    window.addEventListener('scroll', onScroll, {passive:true});
  }

  /* ---- scroll reveal ---- */
  var reveals = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && reveals.length){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, {rootMargin:'0px 0px -8% 0px', threshold:.08});
    reveals.forEach(function(el){ io.observe(el); });
  } else {
    reveals.forEach(function(el){ el.classList.add('in'); });
  }

  /* ---- lightbox gallery ---- */
  var imgs = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox] img'));
  if(imgs.length){
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML =
      '<button class="lb-close" aria-label="Close">&times;</button>'+
      '<button class="lb-nav prev" aria-label="Previous">&#8249;</button>'+
      '<button class="lb-nav next" aria-label="Next">&#8250;</button>'+
      '<img alt="">'+
      '<div class="lb-cap"></div>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('.lb-cap');
    var idx = 0;

    function show(i){
      idx = (i + imgs.length) % imgs.length;
      var src = imgs[idx];
      lbImg.src = src.currentSrc || src.src;
      lbImg.alt = src.alt || '';
      lbCap.textContent = src.alt || '';
    }
    function open(i){ show(i); lb.classList.add('open'); document.body.style.overflow='hidden'; }
    function close(){ lb.classList.remove('open'); document.body.style.overflow=''; }

    imgs.forEach(function(im, i){
      var btn = im.closest('button') || im;
      btn.addEventListener('click', function(){ open(i); });
    });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.next').addEventListener('click', function(e){ e.stopPropagation(); show(idx+1); });
    lb.querySelector('.prev').addEventListener('click', function(e){ e.stopPropagation(); show(idx-1); });
    lbCap.addEventListener('click', function(e){ e.stopPropagation(); }); /* image name: do nothing */
    lbImg.addEventListener('click', function(e){ e.stopPropagation(); }); /* image: do nothing */
    lb.addEventListener('click', function(e){ if(e.target === lb) close(); });
    document.addEventListener('keydown', function(e){
      if(!lb.classList.contains('open')) return;
      if(e.key==='Escape') close();
      if(e.key==='ArrowRight') show(idx+1);
      if(e.key==='ArrowLeft') show(idx-1);
    });
  }

  /* ---- current year ---- */
  document.querySelectorAll('[data-year]').forEach(function(el){
    el.textContent = new Date().getFullYear();
  });

  /* ---- marquee: auto-scroll + drag/swipe/wheel ---- */
  document.querySelectorAll('.marquee').forEach(function(marquee){
    var track = marquee.querySelector('.marquee-track');
    if(!track) return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // duplicate content for a seamless loop
    track.innerHTML = track.innerHTML + track.innerHTML;

    var half = 0;                       // width of one copy (loop point)
    function measure(){ half = track.scrollWidth / 2; }
    measure();
    window.addEventListener('resize', measure);

    var pos = 0;                        // current translateX (negative = moved left)
    var speed = 0.4;                    // px per frame auto-scroll (~24px/s @60fps)
    var dragging = false, paused = false, wasDragged = false;
    var startX = 0, startPos = 0, lastX = 0, lastT = 0, velocity = 0;

    function wrap(){
      if(half <= 0) return;
      // keep pos within (-half, 0] so the loop is seamless
      while(pos <= -half) pos += half;
      while(pos > 0)      pos -= half;
    }
    function render(){ track.style.transform = 'translateX(' + pos + 'px)'; }

    function frame(){
      if(!dragging && !paused){
        pos -= speed;
        wrap();
        render();
      } else if(!dragging && Math.abs(velocity) > 0.1){
        // momentum after a flick
        pos += velocity;
        velocity *= 0.94;
        wrap();
        render();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // pause auto-scroll on hover (desktop), resume on leave
    marquee.addEventListener('mouseenter', function(){ if(!dragging) paused = true; });
    marquee.addEventListener('mouseleave', function(){ if(!dragging) paused = false; });

    function pointerDown(x){
      dragging = true; paused = true; velocity = 0; wasDragged = false;
      startX = x; startPos = pos; lastX = x; lastT = performance.now();
      marquee.classList.add('dragging');
    }
    function pointerMove(x){
      if(!dragging) return;
      if(Math.abs(x - startX) > 5) wasDragged = true;
      pos = startPos + (x - startX);
      wrap();
      render();
      var now = performance.now();
      var dt = now - lastT;
      if(dt > 0){ velocity = (x - lastX); }
      lastX = x; lastT = now;
    }
    function pointerUp(){
      if(!dragging) return;
      dragging = false;
      marquee.classList.remove('dragging');
      // resume auto-scroll shortly unless the pointer is still hovering
      setTimeout(function(){ if(!dragging && !marquee.matches(':hover')) paused = false; }, 600);
    }

    // mouse
    marquee.addEventListener('mousedown', function(e){ e.preventDefault(); pointerDown(e.clientX); });
    window.addEventListener('mousemove', function(e){ pointerMove(e.clientX); });
    window.addEventListener('mouseup', pointerUp);

    // suppress click navigation if the pointer was dragged
    track.addEventListener('click', function(e){ if(wasDragged){ e.preventDefault(); e.stopPropagation(); } }, true);

    // touch (1-finger drag)
    marquee.addEventListener('touchstart', function(e){ pointerDown(e.touches[0].clientX); }, {passive:true});
    marquee.addEventListener('touchmove', function(e){
      if(!dragging) return;
      var t = e.touches[0];
      var moved = Math.abs(t.clientX - startX);
      if(moved > 6) e.preventDefault();   // claim horizontal gesture
      pointerMove(t.clientX);
    }, {passive:false});
    marquee.addEventListener('touchend', pointerUp);
    marquee.addEventListener('touchcancel', pointerUp);

    // trackpad / 2-finger swipe (horizontal wheel)
    var wheelTO;
    marquee.addEventListener('wheel', function(e){
      if(Math.abs(e.deltaX) > Math.abs(e.deltaY)){
        e.preventDefault();
        paused = true;
        pos -= e.deltaX;
        wrap();
        render();
        clearTimeout(wheelTO);
        wheelTO = setTimeout(function(){ if(!dragging && !marquee.matches(':hover')) paused = false; }, 700);
      }
    }, {passive:false});
  });
  /* ---- reviews carousel (infinite loop) ---- */
  document.querySelectorAll('.reviews').forEach(function(root){
    var track = root.querySelector('.rev-track');
    var vp = root.querySelector('.rev-viewport');
    var origCards = Array.prototype.slice.call(root.querySelectorAll('.rev-card'));
    var prev = root.querySelector('.rev-arrow.prev');
    var next = root.querySelector('.rev-arrow.next');
    var dotsWrap = root.parentElement.querySelector('.rev-dots');
    if(!track || !origCards.length) return;

    var N = origCards.length;

    // clone a full set before and after for seamless wrapping
    var leadFrag = document.createDocumentFragment();
    var tailFrag = document.createDocumentFragment();
    origCards.forEach(function(c){ leadFrag.appendChild(c.cloneNode(true)); });
    origCards.forEach(function(c){ tailFrag.appendChild(c.cloneNode(true)); });
    track.insertBefore(leadFrag, track.firstChild);
    track.appendChild(tailFrag);

    var base = N;          // index of first real card in the combined list
    var index = base;      // current left-most card index
    var animating = false;
    var pendingFinish = null;

    function perView(){
      var w = window.innerWidth;
      if(w <= 620) return 1;
      if(w <= 900) return 2;
      return 3;
    }
    function step(){
      var cardW = origCards[0].getBoundingClientRect().width;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 20;
      return cardW + gap;
    }
    function pageCount(){ return Math.ceil(N / perView()); }

    function setX(withAnim){
      track.style.transition = withAnim ? '' : 'none';
      track.style.transform = 'translateX(' + (-index * step()) + 'px)';
      if(!withAnim){ track.offsetHeight; track.style.transition = ''; }
      updateDots();
    }

    function normalize(){
      // snap back into the real range without animation
      while(index >= base + N){ index -= N; }
      while(index < base){ index += N; }
      setX(false);
      animating = false;
    }

    function move(dir){
      // if a slide is mid-flight, snap it to completion instantly so this click registers now
      if(animating && pendingFinish){ pendingFinish(); }
      animating = true;
      vp.classList.add('sliding'); // edge fade only while moving
      // fade the edges back out so they're gone right as the card stops sliding
      clearTimeout(vp._fadeTO);
      vp._fadeTO = setTimeout(function(){ vp.classList.remove('sliding'); }, 200);
      index += dir; // one card at a time
      setX(true);
      var done = false;
      var finish = function(){ if(done) return; done = true; pendingFinish = null; normalize(); vp.classList.remove('sliding'); };
      pendingFinish = finish;
      track.addEventListener('transitionend', finish, {once:true});
      setTimeout(finish, 650); // fallback
    }

    function updateDots(){
      if(!dotsWrap) return;
      var pv = perView();
      var rel = ((index - base) % N + N) % N;
      var active = Math.floor(rel / pv) % dotsWrap.children.length;
      Array.prototype.forEach.call(dotsWrap.children, function(d,i){
        d.classList.toggle('active', i === active);
      });
    }

    function buildDots(){
      if(!dotsWrap) return;
      dotsWrap.innerHTML = '';
      var n = pageCount();
      for(var i=0;i<n;i++){
        var b = document.createElement('button');
        b.setAttribute('role','tab');
        b.setAttribute('aria-label','Review page ' + (i+1));
        (function(idx){ b.addEventListener('click', function(){
          if(animating) return;
          var pv = perView();
          var rel = ((index - base) % N + N) % N;
          var curPage = Math.floor(rel / pv);
          var diff = (idx - curPage) * pv;
          if(diff !== 0) move(diff);
        }); })(i);
        dotsWrap.appendChild(b);
      }
    }

    if(prev) prev.addEventListener('click', function(){ move(-1); });
    if(next) next.addEventListener('click', function(){ move(1); });

    // swipe
    var sx = 0, sy = 0, swiping = false;
    vp.addEventListener('touchstart', function(e){ sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiping = true; }, {passive:true});
    vp.addEventListener('touchend', function(e){
      if(!swiping) return; swiping = false;
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if(Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)){ move(dx < 0 ? 1 : -1); }
    }, {passive:true});

    var rt;
    window.addEventListener('resize', function(){
      clearTimeout(rt);
      rt = setTimeout(function(){ buildDots(); setX(false); }, 150);
    });

    buildDots();
    setX(false);
  });

  /* ---- Before/After reveal slider ---- */
  document.querySelectorAll('.ba-slider').forEach(function(el){
    var after = el.querySelector('.ba-after');
    var handle = el.querySelector('.ba-handle');
    var pos = 50; // percent revealed of "after"
    var dragging = false;
    function apply(){
      after.style.clipPath = 'inset(0 ' + (100 - pos) + '% 0 0)';
      handle.style.left = pos + '%';
      el.setAttribute('aria-valuenow', Math.round(pos));
    }
    function setFromX(clientX){
      var r = el.getBoundingClientRect();
      pos = ((clientX - r.left) / r.width) * 100;
      if(pos < 0) pos = 0; if(pos > 100) pos = 100;
      apply();
    }
    el.addEventListener('mousedown', function(e){ dragging = true; setFromX(e.clientX); e.preventDefault(); });
    window.addEventListener('mousemove', function(e){ if(dragging) setFromX(e.clientX); });
    window.addEventListener('mouseup', function(){ dragging = false; });
    el.addEventListener('touchstart', function(e){ dragging = true; setFromX(e.touches[0].clientX); }, {passive:true});
    el.addEventListener('touchmove', function(e){ if(dragging){ setFromX(e.touches[0].clientX); } }, {passive:true});
    el.addEventListener('touchend', function(){ dragging = false; });
    el.addEventListener('keydown', function(e){
      if(e.key === 'ArrowLeft'){ pos = Math.max(0, pos - 4); apply(); e.preventDefault(); }
      else if(e.key === 'ArrowRight'){ pos = Math.min(100, pos + 4); apply(); e.preventDefault(); }
    });
    apply();
  });
})();

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Nav scroll state ---------------- */
  var nav = document.getElementById('siteNav');
  function onScroll() {
    if (window.scrollY > 12) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------- Mobile nav sheet ---------------- */
  var navToggle = document.getElementById('navToggle');
  var navSheet = document.getElementById('navSheet');
  var navSheetClose = document.getElementById('navSheetClose');

  function openSheet() {
    navSheet.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() {
    navSheet.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  if (navToggle) navToggle.addEventListener('click', openSheet);
  if (navSheetClose) navSheetClose.addEventListener('click', closeSheet);
  navSheet.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeSheet);
  });

  /* ---------------- Staggered per-row reveal (HeyClicky-style cascade) ---------------- */
  document.querySelectorAll('.index-list, .tracklist, .steps, .platform-strip, .roadmap-list').forEach(function (list) {
    var rows = list.children;
    for (var i = 0; i < rows.length; i++) {
      rows[i].setAttribute('data-reveal', '');
      rows[i].style.transitionDelay = Math.min(i, 5) * 0.07 + 's';
    }
  });

  /* ---------------- Scroll reveal ----------------
     Runs regardless of reduceMotion: the fade/blur/rise reveal is a mild,
     one-shot entrance (not continuous or repeating), so it's exempted the
     same way the marquee is. Only the hero parallax stays gated by
     reduceMotion below, since that IS continuous motion tied to scroll. */
  if ('IntersectionObserver' in window) {
    var revealEls = document.querySelectorAll('[data-reveal]');
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* ---------------- Copy-to-clipboard for code blocks ---------------- */
  document.querySelectorAll('.code-copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.getAttribute('data-copy-target');
      var codeEl = document.getElementById(targetId);
      if (!codeEl) return;
      var text = codeEl.innerText;
      var restore = btn.textContent;

      function done(ok) {
        btn.textContent = ok ? 'copied' : 'failed';
        setTimeout(function () { btn.textContent = restore; }, 1600);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          done(true);
        } catch (e) {
          done(false);
        }
      }
    });
  });

  /* ---------------- FAQ accordion ---------------- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var btn = item.querySelector('.faq-q');
    var panel = item.querySelector('.faq-a');
    btn.addEventListener('click', function () {
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.faq-item').forEach(function (other) {
        if (other !== item) {
          other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
          other.querySelector('.faq-a').style.maxHeight = null;
        }
      });
      var next = !isOpen;
      btn.setAttribute('aria-expanded', String(next));
      panel.style.maxHeight = next ? panel.scrollHeight + 'px' : null;
    });
  });

  /* ---------------- Platform detection hint ---------------- */
  var hint = document.getElementById('platformHint');
  (function detectPlatform() {
    if (!hint) return;
    var ua = navigator.userAgent || '';
    var isMac = /Mac/.test(ua) && !/iPhone|iPad/.test(ua);
    if (!isMac) {
      hint.textContent = 'not on macos? the cli installs anywhere node runs, see below';
    }
  })();

  /* ---------------- Live GitHub stats (real fetch, no hardcoding) ---------------- */
  (function fetchGitHubStats() {
    var starsEl = document.getElementById('ghStars');
    var forksEl = document.getElementById('ghForks');
    if (!starsEl || !forksEl) return;

    fetch('https://api.github.com/repos/riporipo223/iam-ilovemusic')
      .then(function (res) { if (!res.ok) throw new Error('bad response'); return res.json(); })
      .then(function (data) {
        starsEl.textContent = (data.stargazers_count || 0).toLocaleString();
        forksEl.textContent = (data.forks_count || 0).toLocaleString();
      })
      .catch(function () {
        starsEl.textContent = '···';
        forksEl.textContent = '···';
      });
  })();

  /* ---------------- Smooth anchor scroll offset for fixed nav ----------------
     Always smooth, regardless of reduceMotion — same call as the marquee
     and reveal system: a short scroll-to-section on click is a deliberate
     one-shot response to a user action, not the kind of ambient/continuous
     motion reduced-motion is meant to suppress, and jumping straight to
     the target reads as broken rather than accessible. */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      var y = target.getBoundingClientRect().top + window.pageYOffset - 72;
      window.scrollTo({ top: y, behavior: 'smooth' });
      history.pushState(null, '', '#' + id);
    });
  });

  /* ---------------- Marquee (JS-driven, pixel-exact loop) ----------------
     A CSS keyframe animating to translateX(-50%) assumes both duplicated
     spans are pixel-identical; sub-pixel font rounding breaks that
     assumption and shows up as a visible jump once per loop. Measuring the
     real rendered width of one span and looping on that exact value is
     immune to that. Runs regardless of reduceMotion — same reasoning as
     the reveal system: short, decorative, non-disorienting, and the user
     explicitly asked for it to keep moving. */
  (function scrollMarquee() {
    var track = document.querySelector('.strip-track');
    if (!track) return;
    var spans = track.querySelectorAll('span');
    if (spans.length < 2) return;

    var distance = 0;
    var offset = 0;
    var lastTs = null;
    var PX_PER_SEC = 32;

    function measure() {
      var span = spans[0];
      var rect = span.getBoundingClientRect();
      var marginRight = parseFloat(getComputedStyle(span).marginRight) || 0;
      distance = rect.width + marginRight;
    }

    function frame(ts) {
      if (lastTs === null) lastTs = ts;
      var dt = (ts - lastTs) / 1000;
      lastTs = ts;
      if (distance > 0) {
        offset = (offset + PX_PER_SEC * dt) % distance;
        track.style.transform = 'translateX(' + (-offset).toFixed(2) + 'px)';
      }
      requestAnimationFrame(frame);
    }

    measure();
    requestAnimationFrame(frame);

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 150);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure);
    }
  })();

  /* ---------------- Living product demo ---------------- */
  (function demo() {
    var stage = document.getElementById('demoStage');
    var wave = document.getElementById('demoWave');
    var fill = document.getElementById('demoFill');
    var pct = document.getElementById('demoPct');
    var status = document.getElementById('demoStatus');
    var title = document.getElementById('demoTitle');
    var artist = document.getElementById('demoArtist');
    var art = document.getElementById('demoArt');
    var chips = stage ? stage.querySelectorAll('.demo-chip') : [];
    if (!stage || !wave || !fill) return;

    var BAR_COUNT = 56;
    var bars = [];
    // deterministic pseudo-random waveform heights
    var seed = 17;
    function rand() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }
    for (var i = 0; i < BAR_COUNT; i++) {
      var bar = document.createElement('i');
      var h = 8 + Math.round(rand() * 32);
      bar.style.height = h + 'px';
      wave.appendChild(bar);
      bars.push(bar);
    }

    var played = false;
    function playDemo() {
      if (played) return;
      played = true;

      title.textContent = 'Warehouse Sunrise';
      artist.textContent = 'Ilsa Voight';

      if (reduceMotion) {
        chips.forEach(function (c) { c.classList.add('is-in'); });
        bars.forEach(function (b) { b.classList.add('is-active'); });
        fill.style.width = '100%';
        pct.textContent = '100%';
        status.textContent = 'DONE';
        art.classList.add('is-loaded');
        art.textContent = '✓';
        return;
      }

      status.textContent = 'QUEUED';
      chips.forEach(function (chip, idx) {
        setTimeout(function () { chip.classList.add('is-in'); }, 250 + idx * 150);
      });

      setTimeout(function () {
        status.textContent = 'DOWNLOADING';
        var duration = 2600;
        var start = null;
        function step(ts) {
          if (!start) start = ts;
          var elapsed = ts - start;
          var progress = Math.min(1, elapsed / duration);
          var eased = 1 - Math.pow(1 - progress, 2);
          var p = Math.round(eased * 100);
          fill.style.width = p + '%';
          pct.textContent = p + '%';
          var activeBars = Math.round(BAR_COUNT * eased);
          for (var b = 0; b < BAR_COUNT; b++) {
            bars[b].classList.toggle('is-active', b < activeBars);
          }
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            status.textContent = 'DONE';
            art.classList.add('is-loaded');
            art.textContent = '✓';
          }
        }
        requestAnimationFrame(step);
      }, 900);
    }

    if ('IntersectionObserver' in window) {
      var demoIo = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              playDemo();
              demoIo.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      demoIo.observe(stage);
    } else {
      playDemo();
    }
  })();

  /* ---------------- Hero parallax (portrait drifts against scroll) ---------------- */
  (function heroParallax() {
    if (reduceMotion) return;
    var wrap = document.querySelector('.hero-portrait-wrap');
    var heroEl = document.querySelector('.hero');
    if (!wrap || !heroEl) return;

    var ticking = false;
    function update() {
      ticking = false;
      var rect = heroEl.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      var progress = (0 - rect.top) / (rect.height || 1); // 0 at top of viewport, grows as user scrolls past
      var shift = Math.max(-40, Math.min(40, progress * 60));
      // set a custom property rather than the transform shorthand so the
      // base rotate() from CSS (which differs at the mobile breakpoint)
      // is never clobbered by this inline style
      wrap.style.setProperty('--parallax-y', shift.toFixed(1) + 'px');
    }
    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  })();
})();

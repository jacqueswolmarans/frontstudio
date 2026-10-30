/* Front Studio - interactions. No dependencies. */
(function () {
  "use strict";
  var d = document;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function fmt(n) { return "$" + Math.round(n).toLocaleString("en-NZ"); }

  // Run a rAF loop only while the element is on screen.
  function visibleLoop(el, frame, onStart) {
    var raf = 0, on = false;
    function tick(t) { frame(t); raf = requestAnimationFrame(tick); }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !on) { on = true; if (onStart) onStart(); raf = requestAnimationFrame(tick); }
        else if (!e.isIntersecting && on) { on = false; cancelAnimationFrame(raf); }
      });
    }, { rootMargin: "80px" }).observe(el);
  }

  function tween(from, to, ms, step, done) {
    var t0 = performance.now();
    if (reduce) { step(to); if (done) done(); return; }
    (function f(t) {
      var p = clamp((t - t0) / ms, 0, 1), e = 1 - Math.pow(1 - p, 3);
      step(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(f); else if (done) done();
    })(t0);
  }

  $("#year").textContent = new Date().getFullYear();

  /* Reveal on scroll */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  $$("[data-reveal]").forEach(function (el) { io.observe(el); });

  /* Spotlight on tiles */
  $$("[data-spot]").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - r.left) + "px");
      el.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* Magnetic buttons */
  if (fine && !reduce) {
    $$("[data-magnetic]").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.22, y = (e.clientY - r.top - r.height / 2) * 0.3;
        b.style.transform = "translate(" + x + "px," + y + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }

  /* Scroll-linked: nav, progress, deck, process line */
  var nav = $("#nav"), deck = $("#deck"), steps = $("#steps"), stepItems = steps ? $$("li", steps) : [];
  var tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight, h = d.documentElement.scrollHeight - vh;
    nav.classList.toggle("scrolled", y > 10);
    nav.style.setProperty("--p", h > 0 ? (y / h).toFixed(4) : 0);
    if (deck && !reduce) {
      var p = clamp(y / (vh * 0.7), 0, 1);
      deck.style.setProperty("--rx", (22 * (1 - p) + tilt.y).toFixed(2) + "deg");
      deck.style.setProperty("--ry", tilt.x.toFixed(2) + "deg");
      deck.style.setProperty("--sc", (0.94 + 0.06 * p).toFixed(4));
    }
    if (steps) {
      var r = steps.getBoundingClientRect();
      var sp = clamp((vh * 0.72 - r.top) / (r.height + 40), 0, 1);
      steps.style.setProperty("--p", sp.toFixed(4));
      stepItems.forEach(function (li, i) { li.classList.toggle("on", sp >= i / stepItems.length + 0.02); });
    }
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }
  window.addEventListener("scroll", req, { passive: true });
  window.addEventListener("resize", req);
  onScroll();
  if (reduce && deck) { deck.style.setProperty("--rx", "0deg"); deck.style.setProperty("--sc", "1"); }

  /* Hero: reactive dot field + deck parallax */
  (function () {
    var hero = $(".hero"), cv = $("#field");
    if (!cv) return;
    var ctx = cv.getContext("2d"), W = 0, H = 0, dots = [], gap = 26, last = -1e4;
    var m = { x: -999, y: -999, tx: -999, ty: -999 };
    function size() {
      var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (var y = gap / 2; y < H; y += gap) for (var x = gap / 2; x < W; x += gap) dots.push(x, y);
      if (reduce) draw(0);
    }
    hero.addEventListener("pointermove", function (e) {
      var r = cv.getBoundingClientRect();
      m.tx = e.clientX - r.left; m.ty = e.clientY - r.top; last = performance.now();
      if (fine) { tilt.tx = (e.clientX / window.innerWidth - 0.5) * 6; tilt.ty = -(e.clientY / window.innerHeight - 0.5) * 4; }
    });
    hero.addEventListener("pointerleave", function () { tilt.tx = 0; tilt.ty = 0; });
    function draw(t) {
      if (t - last > 2200) {
        m.tx = W * (0.5 + 0.34 * Math.sin(t / 3400));
        m.ty = H * (0.36 + 0.2 * Math.sin(t / 2500 + 1.3));
      }
      if (m.x < -900) { m.x = m.tx; m.y = m.ty; }
      m.x = lerp(m.x, m.tx, 0.07); m.y = lerp(m.y, m.ty, 0.07);
      ctx.clearRect(0, 0, W, H);
      var R = Math.min(220, W * 0.22), R2 = R * R, near = [];
      ctx.fillStyle = "rgba(255,255,255,0.085)";
      for (var i = 0; i < dots.length; i += 2) {
        var x = dots[i], y = dots[i + 1], dx = x - m.x, dy = y - m.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) near.push(x, y, dx, dy, d2);
        else ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
      }
      for (var j = 0; j < near.length; j += 5) {
        var dd = Math.sqrt(near[j + 4]) || 1, f = 1 - dd / R, push = f * f * 26;
        var px = near[j] + near[j + 2] / dd * push, py = near[j + 1] + near[j + 3] / dd * push, s = 0.9 + f * 1.6;
        ctx.fillStyle = "rgba(255," + (90 + (1 - f) * 110 | 0) + "," + (54 + (1 - f) * 120 | 0) + "," + (0.12 + f * 0.85).toFixed(3) + ")";
        ctx.fillRect(px - s, py - s, s * 2, s * 2);
      }
      tilt.x = lerp(tilt.x, tilt.tx, 0.06); tilt.y = lerp(tilt.y, tilt.ty, 0.06);
      if (Math.abs(tilt.x - tilt.tx) > 0.01 || Math.abs(tilt.y - tilt.ty) > 0.01) onScroll();
    }
    size();
    if ("ResizeObserver" in window) new ResizeObserver(size).observe(cv); else window.addEventListener("resize", size);
    if (!reduce) visibleLoop(cv, draw);
  })();

  /* Before / after */
  (function () {
    var ba = $("#ba"); if (!ba) return;
    var input = $("input", ba), touched = false;
    function set(v) { ba.style.setProperty("--pos", v + "%"); }
    input.addEventListener("input", function () { touched = true; set(input.value); });
    if (reduce) return;
    var hinted = false;
    new IntersectionObserver(function (es, o) {
      if (!es[0].isIntersecting || hinted) return;
      hinted = true; o.disconnect();
      var keys = [50, 24, 74, 50], k = 0;
      (function next() {
        if (touched || k >= keys.length - 1) return;
        var a = keys[k], b = keys[k + 1]; k++;
        tween(a, b, 900, function (v) { if (!touched) { set(v); input.value = v; } }, function () { setTimeout(next, 120); });
      })();
    }, { threshold: 0.6 }).observe(ba);
  })();

  /* Particle wordmark */
  (function () {
    var st = $("#pt"); if (!st) return;
    var cv = $("canvas", st), ctx = cv.getContext("2d"), hint = $(".pt-hint", st);
    var W = 0, H = 0, P = [], step = 2, sz = 1.6, m = { x: -999, y: -999 };
    var cols = [];
    for (var k = 0; k < 10; k++) {
      var t = k / 9;
      cols.push("rgb(255," + Math.round(lerp(90, 196, t)) + "," + Math.round(lerp(54, 140, t)) + ")");
    }
    function build(scatter) {
      var r = st.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.floor(r.width); H = Math.floor(r.height); if (!W || !H) return;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var o = d.createElement("canvas"); o.width = W; o.height = H;
      var oc = o.getContext("2d"), fam = getComputedStyle(d.body).fontFamily;
      oc.font = "800 100px " + fam;
      var tw = oc.measureText("FRONT").width || 340;
      var fs = Math.min(H * 0.5, (W * 0.84) / tw * 100);
      oc.font = "800 " + fs + "px " + fam;
      oc.textAlign = "center"; oc.textBaseline = "middle"; oc.fillStyle = "#fff";
      oc.fillText("FRONT", W / 2, H * 0.43);
      var data = oc.getImageData(0, 0, W, H).data;
      step = Math.max(2, Math.round(fs / 42)); sz = Math.max(1.3, step * 0.9);
      var old = P; P = [];
      for (var y = 0; y < H; y += step) for (var x = 0; x < W; x += step) {
        if (data[(y * W + x) * 4 + 3] > 140) {
          var q = old[P.length];
          P.push({ hx: x, hy: y, x: scatter || !q ? Math.random() * W : q.x, y: scatter || !q ? Math.random() * H : q.y, vx: 0, vy: 0, b: Math.min(9, Math.floor(x / W * 10)) });
        }
      }
      P.sort(function (a, b) { return a.b - b.b; });
      if (reduce) P.forEach(function (p) { p.x = p.hx; p.y = p.hy; });
      hint.textContent = P.length.toLocaleString("en-NZ") + " particles, rendered live";
      if (reduce) frame();
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      var R = 64, R2 = R * R, cb = -1;
      for (var i = 0; i < P.length; i++) {
        var p = P[i], dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) { var dd = Math.sqrt(d2) || 1, f = (1 - dd / R) * 3.4; p.vx += dx / dd * f; p.vy += dy / dd * f; }
        p.vx = (p.vx + (p.hx - p.x) * 0.045) * 0.86;
        p.vy = (p.vy + (p.hy - p.y) * 0.045) * 0.86;
        p.x += p.vx; p.y += p.vy;
        if (p.b !== cb) { cb = p.b; ctx.fillStyle = cols[cb]; }
        ctx.fillRect(p.x, p.y, sz, sz);
      }
    }
    function pos(e) { var r = cv.getBoundingClientRect(); m.x = e.clientX - r.left; m.y = e.clientY - r.top; }
    st.addEventListener("pointermove", pos);
    st.addEventListener("pointerleave", function () { m.x = m.y = -999; });
    st.addEventListener("pointerdown", function (e) {
      pos(e);
      P.forEach(function (p) {
        var dx = p.x - m.x, dy = p.y - m.y, dd = Math.sqrt(dx * dx + dy * dy) || 1, f = 900 / (dd + 30);
        p.vx += dx / dd * f + (Math.random() - 0.5) * 6; p.vy += dy / dd * f + (Math.random() - 0.5) * 6;
      });
    });
    build(true);
    if ("ResizeObserver" in window) {
      var rt; new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(function () { build(false); }, 120); }).observe(st);
    }
    if (!reduce) visibleLoop(st, frame);
  })();

  /* Estimator */
  (function () {
    var est = $("#est"); if (!est) return;
    var area = $("#estArea"), out = $("#estOut"), aout = $("#estAreaOut");
    var cur = null, tid = 0;
    function r100(n) { return Math.round(n / 100) * 100; }
    function show(lo, hi) { out.textContent = fmt(Math.round(lo / 10) * 10) + " - " + fmt(Math.round(hi / 10) * 10); }
    function calc() {
      var a = +area.value, rate = +$("input[name=timber]:checked", est).value, add = 0;
      $$(".chk input:checked", est).forEach(function (i) { add += +i.value; });
      var base = a * rate + add + 650, lo = r100(base * 0.94), hi = r100(base * 1.08);
      aout.textContent = a + " m\u00b2";
      area.style.setProperty("--fill", ((a - area.min) / (area.max - area.min) * 100).toFixed(1) + "%");
      if (!cur) { cur = { lo: lo, hi: hi }; show(lo, hi); return; }
      var id = ++tid, fl = cur.lo, fh = cur.hi;
      tween(0, 1, 420, function (e) {
        if (id !== tid) return;
        cur.lo = lerp(fl, lo, e); cur.hi = lerp(fh, hi, e); show(cur.lo, cur.hi);
      });
    }
    est.addEventListener("input", calc);
    est.addEventListener("change", calc);
    calc();
  })();

  /* Booking */
  (function () {
    var bk = $("#bk"); if (!bk) return;
    var daysEl = $(".bk-days", bk), slotsEl = $(".bk-slots", bk), go = $(".bk-go", bk), when = $(".bk-when", bk), reset = $(".bk-reset", bk);
    var SL = ["8:30am", "10:00am", "11:30am", "1:00pm", "2:30pm", "4:00pm"];
    var DN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var days = [], dt = new Date(); dt.setHours(12, 0, 0, 0);
    while (days.length < 6) { dt.setDate(dt.getDate() + 1); if (dt.getDay() !== 0) days.push(new Date(dt)); }
    var selD = 0, selS = -1;
    function taken(i, j) { var x = days[i]; return (x.getDate() * 7 + j * 5) % 4 === 0 || (x.getDay() === 6 && j > 2); }
    function label() { var x = days[selD]; return DN[x.getDay()] + " " + x.getDate() + " " + MN[x.getMonth()] + ", " + SL[selS]; }
    function upd() {
      go.disabled = selS < 0;
      go.textContent = selS < 0 ? "Choose a time" : "Book " + label();
    }
    function renderDays() {
      daysEl.innerHTML = "";
      days.forEach(function (x, i) {
        var b = d.createElement("button");
        b.type = "button"; b.setAttribute("aria-pressed", String(i === selD));
        b.setAttribute("aria-label", DN[x.getDay()] + " " + x.getDate() + " " + MN[x.getMonth()]);
        b.innerHTML = "<span>" + DN[x.getDay()] + "</span><b>" + x.getDate() + "</b>";
        b.addEventListener("click", function () { selD = i; selS = -1; renderDays(); renderSlots(); upd(); });
        daysEl.appendChild(b);
      });
    }
    function renderSlots() {
      slotsEl.innerHTML = "";
      SL.forEach(function (s, j) {
        var b = d.createElement("button");
        b.type = "button"; b.textContent = s; b.disabled = taken(selD, j);
        b.setAttribute("aria-pressed", String(j === selS));
        b.addEventListener("click", function () { selS = j; renderSlots(); upd(); });
        slotsEl.appendChild(b);
      });
    }
    go.addEventListener("click", function () {
      if (selS < 0) return;
      when.textContent = label() + ". In a real site, a confirmation lands in your inbox and your calendar.";
      bk.classList.add("done");
      setTimeout(function () { reset.focus({ preventScroll: true }); }, 300);
    });
    reset.addEventListener("click", function () { bk.classList.remove("done"); selS = -1; renderSlots(); upd(); });
    renderDays(); renderSlots(); upd();
  })();

  /* 3D card */
  (function () {
    var st = $("#c3s"), c = $("#c3"); if (!st || !c) return;
    var s = { rx: 0, ry: 0, tx: 0, ty: 0, nx: 0.5, ny: 0.5, hover: false };
    function apply() {
      c.style.setProperty("--rx", s.rx.toFixed(2) + "deg");
      c.style.setProperty("--ry", s.ry.toFixed(2) + "deg");
      var hx = 50 + s.ry * 2.2, hy = 50 - s.rx * 2.2;
      c.style.setProperty("--sx", hx.toFixed(1) + "%"); c.style.setProperty("--sy", hy.toFixed(1) + "%");
      c.style.setProperty("--hx", hx.toFixed(1) + "%"); c.style.setProperty("--hy", hy.toFixed(1) + "%");
    }
    st.addEventListener("pointermove", function (e) {
      var r = c.getBoundingClientRect();
      var nx = clamp((e.clientX - r.left) / r.width, -0.2, 1.2), ny = clamp((e.clientY - r.top) / r.height, -0.2, 1.2);
      s.ty = (nx - 0.5) * 32; s.tx = -(ny - 0.5) * 28; s.hover = true;
    });
    st.addEventListener("pointerleave", function () { s.hover = false; });
    if (reduce) { apply(); return; }
    visibleLoop(st, function (t) {
      if (!s.hover) { s.ty = Math.sin(t / 1800) * 16; s.tx = Math.cos(t / 2300) * 8; }
      s.rx = lerp(s.rx, s.tx, 0.09); s.ry = lerp(s.ry, s.ty, 0.09);
      apply();
    });
  })();

  /* Brand switcher */
  (function () {
    var bp = $("#bp"); if (!bp) return;
    var F = {
      modern: "var(--sans)",
      editorial: "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif",
      rounded: "ui-rounded,'SF Pro Rounded',Nunito,'Arial Rounded MT Bold',sans-serif"
    };
    function group(sel, fn) {
      var bs = $$(sel + " button");
      bs.forEach(function (b) {
        b.addEventListener("click", function () {
          bs.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
          fn(b);
        });
      });
    }
    group("#sw", function (b) { bp.style.setProperty("--b1", b.dataset.c); bp.style.setProperty("--b2", b.dataset.b); });
    group("#fo", function (b) { bp.style.setProperty("--bf", F[b.dataset.f]); });
  })();

  /* Live performance numbers */
  (function () {
    var pf = $("#pf"); if (!pf || !performance.getEntriesByType) return;
    function measure() {
      var nav = performance.getEntriesByType("navigation")[0], res = performance.getEntriesByType("resource");
      var load = nav ? (nav.loadEventEnd > 0 ? nav.loadEventEnd : nav.domContentLoadedEventEnd) : NaN;
      var bytes = nav ? (nav.encodedBodySize || nav.transferSize || 0) : 0, third = 0;
      res.forEach(function (r) {
        bytes += r.encodedBodySize || r.transferSize || 0;
        try { if (new URL(r.name).origin !== location.origin) third++; } catch (e) {}
      });
      var vals = {
        load: { v: load / 1000, dp: 2, u: "s" },
        kb: { v: bytes / 1024, dp: 0, u: "KB" },
        req: { v: 1 + res.length, dp: 0, u: "" },
        trk: { v: third, dp: 0, u: "" }
      };
      var go = function () {
        $$("b[data-k]", pf).forEach(function (b) {
          var o = vals[b.dataset.k];
          if (!o || !isFinite(o.v) || (b.dataset.k === "kb" && o.v <= 0)) { b.textContent = "-"; return; }
          tween(0, o.v, 1300, function (x) { b.innerHTML = x.toFixed(o.dp) + (o.u ? "<i>" + o.u + "</i>" : ""); });
        });
      };
      new IntersectionObserver(function (es, ob) { if (es[0].isIntersecting) { ob.disconnect(); go(); } }, { threshold: 0.4 }).observe(pf);
    }
    if (d.readyState === "complete") setTimeout(measure, 60);
    else window.addEventListener("load", function () { setTimeout(measure, 60); });
  })();

  /* Copy email */
  (function () {
    var b = $("#copy"); if (!b) return;
    var sp = $("span", b), email = "hello@frontstudio.co.nz";
    b.addEventListener("click", function () {
      var ok = function () { sp.textContent = "Copied to clipboard"; setTimeout(function () { sp.textContent = email; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(email).then(ok, function () { location.href = "mailto:" + email; });
      else location.href = "mailto:" + email;
    });
  })();
})();

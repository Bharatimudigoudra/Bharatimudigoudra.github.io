/* Chat window: round launcher, in-page panel (drag, resize), floating pop-out window. */
(function (AB) {
  'use strict';
  // ---------- UI ----------
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }

  var BASE = AB.root;
  var WIN = document.documentElement.hasAttribute('data-ab-window'), HIST = [];

  function init() {
    var root = el('div', 'ab-root');
    var bubble = el('button', 'ab-bubble', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>Ask');
    bubble.setAttribute('aria-label', 'Ask Bharati');
    bubble.setAttribute('aria-haspopup', 'dialog');
    var panel = el('div', 'ab-panel');
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Ask Bharati chat');
    var head = el('div', 'ab-head', '<div><div class="ab-title">Ask Bharati</div><div class="ab-sub">Automated chat answering from my portfolio</div></div>');
    var close = el('button', 'ab-close', '&times;'); close.setAttribute('aria-label', 'Close chat'); head.appendChild(close);
    var pop = el('button', 'ab-close ab-pop', '&#10697;'); pop.type = 'button'; pop.setAttribute('aria-label', 'Open in a separate window'); pop.title = 'Open in a separate window'; head.insertBefore(pop, close);
    var log = el('div', 'ab-log'); log.setAttribute('aria-live', 'polite');
    var chips = el('div', 'ab-chips');
    var form = el('form', 'ab-form');
    var input = el('input'); input.type = 'text'; input.placeholder = 'Ask about projects, skills, experience...'; input.maxLength = 300; input.setAttribute('aria-label', 'Your question');
    var send = el('button', '', 'Ask'); send.type = 'submit';
    form.appendChild(input); form.appendChild(send);
    var foot = el('div', 'ab-foot', 'Automated answers from my portfolio and resume, not live replies.');
    var rz = el('div', 'ab-rz'); rz.setAttribute('aria-hidden', 'true');
    var CFG = AB.history && AB.history.key ? AB.history : null;
    var LOCALPREV = location.protocol === 'file:' && !/[?&]gate=1/.test(location.search);
    var TESTING = false; try { TESTING = localStorage.getItem('abTesting') === '1'; } catch (e) {}
    var PREVIEW = LOCALPREV || TESTING;
    var email = ''; try { email = sessionStorage.getItem('abEmail') || ''; } catch (e) {}
    var gate = el('form', 'ab-gate');
    gate.noValidate = true;
    gate.innerHTML = '<p class="ab-gate-t">Enter your email to start the chat.</p>' +
      '<p class="ab-gate-n">Your email and questions are sent to Bharati by email through the form service Web3Forms. She may use your email to follow up about job openings. Web3Forms keeps its copy for up to 7 days; Bharati keeps hers in her mailbox. Your email is not verified and nothing is sent to you automatically.</p>';
    var gIn = el('input'); gIn.type = 'email'; gIn.placeholder = 'you@example.com'; gIn.maxLength = 120; gIn.autocomplete = 'email'; gIn.setAttribute('aria-label', 'Your email');
    var gErr = el('div', 'ab-gate-e'); gErr.setAttribute('role', 'alert');
    var gBtn = el('button', '', 'Start chat'); gBtn.type = 'submit';
    var tLink = el('button', 'ab-gate-l', 'My testing mode'); tLink.type = 'button'; tLink.title = 'For the site owner: skips the email field and sends nothing, in this browser only';
    gate.appendChild(gIn); gate.appendChild(gErr); gate.appendChild(gBtn); gate.appendChild(tLink);
    var tBar = el('div', 'ab-test'); tBar.appendChild(document.createTextNode('Testing mode: no email asked, nothing is sent. '));
    var tExit = el('button', '', 'Exit testing mode'); tExit.type = 'button'; tBar.appendChild(tExit);
    var status = el('div', 'ab-status');
    [head, tBar, gate, log, chips, form, status, foot, rz].forEach(function (n) { panel.appendChild(n); });
    function gated() { return false; }
    function showGate() { tBar.style.display = TESTING ? 'block' : 'none'; var g = gated(); gate.style.display = g ? '' : 'none'; log.style.display = chips.style.display = form.style.display = g ? 'none' : ''; }
    gate.addEventListener('submit', function (e) {
      e.preventDefault(); var v = gIn.value.trim();
      if (!/^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[A-Za-z]{2,}$/.test(v) || v.length > 120) { gErr.textContent = 'Please enter a valid email ID'; return; }
      gErr.textContent = ''; email = v; try { sessionStorage.setItem('abEmail', v); } catch (x) {}
      showGate(); input.focus();
    });
    tLink.addEventListener('click', function () {
      TESTING = true; PREVIEW = true; try { localStorage.setItem('abTesting', '1'); } catch (x) {}
      pending = []; if (timer) { clearTimeout(timer); timer = null; }
      showGate(); input.focus();
    });
    tExit.addEventListener('click', function () {
      TESTING = false; PREVIEW = LOCALPREV; try { localStorage.removeItem('abTesting'); sessionStorage.removeItem('abEmail'); } catch (x) {}
      email = ''; pending = []; if (timer) { clearTimeout(timer); timer = null; }
      showGate(); (gated() ? gIn : input).focus();
    });
    // ---------- history to Bharati by email (Web3Forms), only when configured and not local preview ----------
    var pending = [], sentMails = 0, timer = null, MAXMAIL = 6;
    function setStatus(t) { status.textContent = t || ''; status.style.display = t ? '' : 'none'; }
    setStatus('');
    function body() { return pending.map(function (x) { return 'Q: ' + x.q + '\nA: ' + x.a; }).join('\n\n'); }
    function flush(unload) {
      if (!CFG || PREVIEW || !pending.length || sentMails >= MAXMAIL) return;
      var batch = pending.slice(), payload = JSON.stringify({
        access_key: CFG.key, subject: 'Ask Bharati chat (anonymous visitor)', from_name: 'Ask Bharati portfolio chat',
        message: 'Visitor: anonymous (no email asked)' + '\n\n' + batch.map(function (x) { return 'Q: ' + x.q + '\nA: ' + x.a; }).join('\n\n'), botcheck: ''
      });
      sentMails++; pending = [];
      fetch(CFG.endpoint, {method: 'POST', headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}, body: payload, keepalive: !!unload})
        .then(function (r) { return r.json(); }).then(function (j) { if (j && j.success) { setStatus(''); } else throw new Error('x'); })
        .catch(function () { sentMails--; pending = batch.concat(pending); if (!unload) setStatus('Your message could not be sent to Bharati yet. It will be retried with your next question.'); });
    }
    function queue(q, a) {
      if (!CFG || PREVIEW) return;
      pending.push({q: q.slice(0, 300), a: (Array.isArray(a.text) ? a.text.join(' ') : String(a.text)).slice(0, 600)});
      if (timer) clearTimeout(timer); timer = setTimeout(function () { flush(false); }, 20000);
      if (pending.length >= 5) flush(false);
    }
    window.addEventListener('pagehide', function () { flush(true); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(true); });
    root.appendChild(bubble); root.appendChild(panel); document.body.appendChild(root);

    function addUser(t) { HIST.push({u: t}); log.appendChild(el('div', 'ab-msg ab-user', esc(t))); log.scrollTop = log.scrollHeight; }
    function addBot(a, noHist) {
      if (!noHist) HIST.push({b: a});
      var m = el('div', 'ab-msg ab-bot');
      var paras = Array.isArray(a.text) ? a.text : [a.text];
      m.innerHTML = paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
      if (a.links && a.links.length) {
        var ls = el('div', 'ab-links');
        a.links.forEach(function (l) { var x = el('a', '', esc(l[0])); x.href = /^(https?:|mailto:)/.test(l[1]) ? l[1] : BASE + '../' + l[1]; if (!/^mailto:/.test(l[1])) { x.target = '_blank'; x.rel = 'noopener'; } ls.appendChild(x); });
        m.appendChild(ls);
      }
      if (a.src) m.appendChild(el('div', 'ab-note', 'Source: ' + esc(a.src)));
      log.appendChild(m);
      var u = log.querySelectorAll('.ab-user'); var last = u[u.length - 1];
      log.scrollTop = last ? Math.max(0, last.offsetTop - log.offsetTop - 8) : 0;
    }
    function ask(q) {
      q = q.trim(); if (!q || gated()) return; addUser(q);
      if (AB.answerAsync) {
        var noteNode = null, done = false;
        var tm = setTimeout(function () {
          if (!done) { addBot({text: 'Getting the chat ready, one moment...', links: [], src: ''}, true); noteNode = log.lastChild; }
        }, 4000);
        AB.answerAsync(q).then(function (a) {
          done = true; clearTimeout(tm);
          if (noteNode && noteNode.parentNode) noteNode.parentNode.removeChild(noteNode);
          addBot(a); queue(q, a);
        });
        return;
      }
      var a = AB.answer(q); addBot(a); queue(q, a);
    }
    [['Projects', 'What projects have you built?'], ['Skills', 'What are your skills?'], ['Experience', 'Tell me about your experience'], ['Education', 'What is your education?'], ['Links', 'LinkedIn and GitHub links']].forEach(function (c) {
      var b = el('button', 'ab-chip', c[0]); b.type = 'button'; b.addEventListener('click', function () { ask(c[1]); }); chips.appendChild(b);
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); input.value = ''; });

    var saved = null;
    if (WIN) { try { saved = JSON.parse(sessionStorage.getItem('abHist') || 'null'); } catch (e) {} }
    if (saved && saved.length) saved.forEach(function (h) { if (h.u) { HIST.push(h); log.appendChild(el('div', 'ab-msg ab-user', esc(h.u))); } else addBot(h.b); });
    else addBot({text: 'Hello, welcome to my portfolio. You can ask me about my projects, skills, experience or education. The answers are written in advance from my portfolio and resume, so they are not live replies.', links: [], src: ''});

    showGate();
    // open / close / position / size
    var M = 8, box = null;
    var vw = function () { return document.documentElement.clientWidth; }, vh = function () { return window.innerHeight; };
    function defaults() { var w = Math.min(390, vw() - 2 * M), h = Math.min(560, vh() - 2 * M - 60); return {left: vw() - w - 20, top: vh() - h - 80, width: w, height: h}; }
    function clamp(b) {
      b.width = Math.max(Math.min(300, vw() - 2 * M), Math.min(b.width, vw() - 2 * M));
      b.height = Math.max(Math.min(340, vh() - 2 * M), Math.min(b.height, vh() - 2 * M));
      b.left = Math.max(M, Math.min(b.left, vw() - b.width - M));
      b.top = Math.max(M, Math.min(b.top, vh() - b.height - M));
      return b;
    }
    function apply() { clamp(box); panel.style.left = box.left + 'px'; panel.style.top = box.top + 'px'; panel.style.width = box.width + 'px'; panel.style.height = box.height + 'px'; }
    function open() { if (!box) box = defaults(); apply(); panel.classList.add('open'); bubble.style.display = 'none'; if (AB.semantic) AB.semantic.warm(); (gated() ? gIn : input).focus(); }
    function shut() { if (pipWin) { pipWin.close(); return; } panel.classList.remove('open'); bubble.style.display = ''; bubble.focus(); }
    bubble.addEventListener('click', open); close.addEventListener('click', shut);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('open')) shut(); });
    window.addEventListener('resize', function () { if (box && panel.classList.contains('open')) apply(); });

    var pipWin = null;
    function backFromPip() {
      if (!pipWin) return; pipWin = null;
      root.appendChild(panel); panel.classList.remove('open'); root.classList.remove('ab-win'); bubble.style.display = ''; pop.style.display = '';
    }
    function toPip(pw) {
      pipWin = pw;
      [].forEach.call(document.querySelectorAll('link[rel~="stylesheet"],style'), function (n) { pw.document.head.appendChild(n.cloneNode(true)); });
      pw.document.documentElement.setAttribute('data-ab-window', ''); pw.document.title = 'Ask Bharati';
      var r = pw.document.createElement('div'); r.className = 'ab-root ab-win'; pw.document.body.appendChild(r); r.appendChild(panel);
      panel.classList.add('open'); bubble.style.display = 'none'; pop.style.display = 'none';
      pw.addEventListener('pagehide', backFromPip);
      pw.document.addEventListener('keydown', function (e) { if (e.key === 'Escape') pw.close(); });
      input.focus();
    }
    function popOut() {
      if (window.documentPictureInPicture && window.isSecureContext && !pipWin) {
        documentPictureInPicture.requestWindow({width: 420, height: 640}).then(toPip).catch(popOutClassic);
        return;
      }
      popOutClassic();
    }
    function popOutClassic() {
      try { sessionStorage.setItem('abHist', JSON.stringify(HIST.slice(-40))); } catch (e) {}
      var w = 420, h = 640, l = Math.max(0, (window.screenX || 0) + (window.outerWidth || 1200) - w - 20), t = Math.max(0, (window.screenY || 0) + 60);
      var url = BASE + 'window.html';
      var p = null;
      try { p = window.open(url, 'askbharati', 'popup=yes,width=' + w + ',height=' + h + ',left=' + l + ',top=' + t); } catch (e) {}
      if (!p) { addBot({text: 'Your browser blocked the separate window. Allow pop-ups for this site and press the window button again.', links: [], src: ''}, true); return; }
      p.focus(); shut();
    }
    pop.addEventListener('click', popOut);
    if (WIN) {
      root.classList.add('ab-win'); document.title = 'Ask Bharati'; panel.classList.add('open'); bubble.style.display = 'none';
      pop.style.display = 'none'; close.addEventListener('click', function () { window.close(); }); input.focus();
      return;
    }

    var drag = null;
    function start(e, mode) { if (e.button > 0 || vw() <= 520) return; drag = {mode: mode, x: e.clientX, y: e.clientY, b: {left: box.left, top: box.top, width: box.width, height: box.height}}; e.currentTarget.setPointerCapture(e.pointerId); if (mode === 'move') head.classList.add('dragging'); e.preventDefault(); }
    function move(e) {
      if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y, o = drag.b;
      if (drag.mode === 'move') box = clamp({left: o.left + dx, top: o.top + dy, width: o.width, height: o.height});
      else box = clamp({left: o.left, top: o.top, width: Math.min(o.width + dx, vw() - M - o.left), height: Math.min(o.height + dy, vh() - M - o.top)});
      apply();
    }
    function end() { drag = null; head.classList.remove('dragging'); }
    head.addEventListener('pointerdown', function (e) { if (!e.target.closest('button')) start(e, 'move'); });
    rz.addEventListener('pointerdown', function (e) { start(e, 'size'); });
    [head, rz].forEach(function (n) { n.addEventListener('pointermove', move); n.addEventListener('pointerup', end); n.addEventListener('pointercancel', end); });

    AB.open = open;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})((window.AskBharati = window.AskBharati || {}));

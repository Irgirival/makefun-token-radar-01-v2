// Token Radar v2's dashboard. It reads window.RADAR (written beside dashboard/ by main.ts) and
// renders the ranked board, a filterable table, a per-protocol detail drawer with the model's own
// breakdown and the protocol's farm plan, the calibration the model was fitted on, and the live
// set it was fitted from. No network: every byte it shows is in data.js.
// Shot modes for screenshots: ?shot=board | ?shot=detail&slug=<slug> | ?shot=filtered&category=<name>.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var params = new URLSearchParams(window.location.search);
  var state = {
    q: '',
    category: 'all',
    chain: 'all',
    scope: 'all',
    tab: 'pre-token',
    sort: 'implied',
    dir: -1,
    selected: null,
    shot: params.get('shot') || 'board',
  };

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function fmtMult(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return n.toFixed(2) + 'x';
  }
  // The model in one function: the page recomputes a row from the snapshot figures and the
  // calibrated multiple the row carries, so the page's code and the board's data are visibly
  // the same arithmetic. A row whose recompute differs from board.json would show it here.
  function impliedOf(row) {
    return Math.max(
      1,
      Math.round(
        row.tvl_usd * row.base_multiple * row.growth_factor * row.maturity_factor * row.breadth_factor * row.freshness_factor
      )
    );
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var hp = new URLSearchParams(hash);
    if (hp.get('q')) state.q = hp.get('q');
    if (hp.get('p')) state.selected = hp.get('p');
    if (hp.get('category')) state.category = hp.get('category');
    if (hp.get('chain')) state.chain = hp.get('chain');
  }
  function writeHash() {
    var hp = new URLSearchParams();
    if (state.q) hp.set('q', state.q);
    if (state.category !== 'all') hp.set('category', state.category);
    if (state.chain !== 'all') hp.set('chain', state.chain);
    if (state.selected) hp.set('p', state.selected);
    var next = hp.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function categories() {
    return Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
  }
  function chains() {
    var seen = {};
    DATA.rows.forEach(function (r) { (r.chains || []).forEach(function (c) { seen[c] = true; }); });
    return Object.keys(seen).sort();
  }
  function rows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.chain !== 'all' && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (state.scope !== 'all' && r.scope !== state.scope) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'multiple') { av = a.base_multiple; bv = b.base_multiple; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function header() {
    return el('header', { class: 'top' },
      el('div', { class: 'brand' }, el('span', { class: 'mark' }), el('span', { class: 'brand-name', text: 'Token Radar · radar-3' })),
      el('div', { class: 'top-meta' },
        el('span', { html: 'Snapshot <b>' + DATA.as_of + '</b>' }),
        el('span', { text: 'DefiLlama protocol index' }),
        el('span', { html: 'Model <b>' + DATA.model_version + ' · calibrated</b>' })
      )
    );
  }

  function lede() {
    var total = DATA.rows.reduce(function (s, r) { return s + r.implied_value_usd; }, 0);
    var med = DATA.rows.slice().sort(function (a, b) { return a.implied_value_usd - b.implied_value_usd; })[Math.floor(DATA.rows.length / 2)];
    return el('section', { class: 'lede' },
      el('div', null,
        el('h1', { text: 'Which pre-token protocol is worth farming next?' }),
        el('p', { html: 'Every protocol in the snapshot that <b>records no token</b>, ranked by what its launch would be worth if its record stayed as it is. The watchlist — ' + DATA.watchlist_size + ' protocols at or above $50M of TVL — is the floor: the radar adds ' + DATA.early_size + ' early finds below it. Bridges, liquid-staking wrappers and exchange products are left out entirely — WBTC is Bitcoin on Ethereum, not a launch waiting to happen. Implied value is a model, not a promise, and never a prediction that a token is coming.' })
      ),
      el('div', { class: 'facts' },
        el('div', { class: 'fact' }, el('b', { text: DATA.watchlist_size + ' / ' + DATA.watchlist_size }), el('span', { text: 'Watchlist covered' })),
        el('div', { class: 'fact' }, el('b', { text: String(DATA.board_size) }), el('span', { text: 'Pre-token rows scored' })),
        el('div', { class: 'fact' }, el('b', { text: fmtUsd(total) }), el('span', { text: 'Total implied value' })),
        el('div', { class: 'fact' }, el('b', { text: fmtUsd(med ? med.implied_value_usd : 0) }), el('span', { text: 'Median implied value' }))
      )
    );
  }

  function calibPanel() {
    var c = DATA.calibration;
    var cells = [
      el('div', { class: 'calib-cell' }, el('b', { text: fmtMult(c.overall_median) }), el('span', { text: 'Overall median mcap / TVL' })),
      el('div', { class: 'calib-cell' }, el('b', { text: fmtMult(c.overall_p25) + ' – ' + fmtMult(c.overall_p75) }), el('span', { text: 'Middle half of launched multiples' })),
      el('div', { class: 'calib-cell' }, el('b', { text: String(c.launched) }), el('span', { text: 'Launched protocols fitted' })),
      el('div', { class: 'calib-cell' }, el('b', { text: String(c.by_category.length) }), el('span', { text: 'Categories with their own median' })),
    ];
    var topCats = c.by_category.slice(0, 8).map(function (cc) {
      return el('div', { class: 'calib-cell' }, el('b', { text: fmtMult(cc.median) }), el('span', { text: cc.category + ' · n=' + cc.launched }));
    });
    return el('section', { class: 'panel calib' },
      el('h2', { text: 'Where the multiple comes from' }),
      el('p', { html: 'No multiple here is picked by hand. The model fits it on the snapshot itself: every protocol in it whose token already trades gives one market multiple, market cap divided by TVL. A protocol is scored at its <b>category median</b> where five or more of its category have launched, else at the overall median, clamped to 0.02x–3.00x. The Live view below shows the launched protocols the fit was made on, with each one\u2019s multiple.' }),
      el('div', { class: 'calib-grid' }, cells.concat(topCats)),
      el('p', { class: 'calib-note', text: 'Categories with fewer than five launched protocols fall back to the overall median, so a thin category never sets its own price.' })
    );
  }

  function controls() {
    var cats = categories();
    var chs = chains();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Search name, category or chain', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); render(); });
    var catSel = el('select', { id: 'category', 'aria-label': 'Filter by category' },
      el('option', { value: 'all', text: 'All categories' }),
      cats.map(function (c) { return el('option', { value: c, text: c, selected: c === state.category ? 'selected' : null }); })
    );
    catSel.addEventListener('change', function () { state.category = catSel.value; writeHash(); render(); });
    var chainSel = el('select', { id: 'chain', 'aria-label': 'Filter by chain' },
      el('option', { value: 'all', text: 'All chains' }),
      chs.map(function (c) { return el('option', { value: c, text: c, selected: c === state.chain ? 'selected' : null }); })
    );
    chainSel.addEventListener('change', function () { state.chain = chainSel.value; writeHash(); render(); });
    var scopeSel = el('select', { id: 'scope', 'aria-label': 'Filter by scope' },
      el('option', { value: 'all', text: 'Watchlist + early finds' }),
      el('option', { value: 'watchlist', text: 'Watchlist only', selected: state.scope === 'watchlist' ? 'selected' : null }),
      el('option', { value: 'early', text: 'Early finds only', selected: state.scope === 'early' ? 'selected' : null })
    );
    scopeSel.addEventListener('change', function () { state.scope = scopeSel.value; writeHash(); render(); });
    var pre = el('button', { type: 'button', 'aria-pressed': state.tab === 'pre-token' ? 'true' : 'false', text: 'Pre-token', onclick: function () { state.tab = 'pre-token'; render(); } });
    var live = el('button', { type: 'button', 'aria-pressed': state.tab === 'live' ? 'true' : 'false', text: 'Live token', onclick: function () { state.tab = 'live'; render(); } });
    return el('div', { class: 'controls' },
      el('div', { class: 'field' }, el('label', { for: 'q', text: 'Search' }), search),
      el('div', { class: 'field' }, el('label', { for: 'category', text: 'Category' }), catSel),
      el('div', { class: 'field' }, el('label', { for: 'chain', text: 'Chain' }), chainSel),
      el('div', { class: 'field' }, el('label', { for: 'scope', text: 'Scope' }), scopeSel),
      el('div', { class: 'field' }, el('span', { class: 'sub', text: 'Token status' }), el('div', { class: 'tabs' }, pre, live)),
      el('span', { class: 'count', text: state.tab === 'pre-token' ? rows().length + ' of ' + DATA.board_size + ' rows shown' : DATA.live.length + ' live-token protocols' })
    );
  }

  function sortHeader(key, label) {
    return el('th', { scope: 'col' },
      el('button', { type: 'button', onclick: function () { if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = -1; } render(); } },
        label,
        state.sort === key ? el('span', { 'aria-hidden': 'true', text: state.dir < 0 ? ' v' : ' ^' }) : null
      )
    );
  }

  function boardTable() {
    var list = sortedRows(rows());
    if (list.length === 0) {
      return el('div', { class: 'panel' }, el('div', { class: 'empty' },
        el('h2', { text: 'No protocol matches that filter' }),
        el('p', { text: 'Clear the search or pick another category to see the board again.' }),
        el('button', { class: 'button primary', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.scope = 'all'; writeHash(); render(); } })
      ));
    }
    var max = list[0].implied_value_usd || 1;
    var tbody = el('tbody');
    list.forEach(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', null, el('div', { class: 'name' },
          el('b', { text: r.name }),
          el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') })
        )),
        el('td', null, el('span', { class: 'badge' + (r.scope === 'watchlist' ? ' watch' : ''), text: r.scope === 'watchlist' ? 'Watchlist' : 'Early find' })),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + growthClass, text: growth }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', { class: 'num', text: fmtMult(r.base_multiple) }),
        el('td', null, el('div', { class: 'implied' },
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(3, Math.round((r.implied_value_usd / max) * 100)) + '%' })),
          el('span', { class: 'num', text: fmtUsd(r.implied_value_usd) })
        )),
        el('td', null, el('span', { class: 'status', text: 'no token' }))
      );
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Pre-token protocols, strongest implied value first. Select a row for its model breakdown and full 10-step farm plan.' }),
          el('thead', null, el('tr', null,
            sortHeader('implied', 'Rank'),
            sortHeader('name', 'Protocol'),
            el('th', { scope: 'col', text: 'Scope' }),
            sortHeader('tvl', 'TVL'),
            sortHeader('growth', '7d'),
            sortHeader('age', 'Age'),
            sortHeader('multiple', 'Multiple'),
            sortHeader('implied', 'Implied value'),
            el('th', { scope: 'col', text: 'Token' })
          )),
          tbody
        )
      )
    );
  }

  function liveTable() {
    var tbody = el('tbody');
    DATA.live.forEach(function (r) {
      tbody.appendChild(el('tr', null,
        el('td', null, el('span', { class: 'badge live', text: 'Live' })),
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') }))),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }),
        el('td', { class: 'num', text: fmtMult(r.mcap_tvl) }),
        el('td', null, el('span', { class: 'status live', text: 'already trades' }))
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Token live: these protocols already trade, so their market cap is a fact, not a model — and their mcap / TVL multiples are the calibration the radar-3 model was fitted on.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'mcap / TVL' }), el('th', { scope: 'col', text: 'Token' }))),
          tbody
        )
      )
    );
  }

  function modelPanel() {
    var m = DATA.model;
    var c = DATA.calibration;
    return el('section', { class: 'panel model' },
      el('h2', { text: 'How implied value is computed' }),
      el('p', { html: 'Every row is scored by one function of the snapshot figures. No protocol name is special-cased, and no row is hand-picked. The multiple is <b>not chosen</b>: it is the category median of market-cap-per-TVL among the snapshot\u2019s ' + c.launched + ' launched protocols (' + fmtMult(c.overall_median) + ' overall), falling back to the overall median where a category has fewer than five launched protocols, clamped to 0.02x–3.00x.' }),
      el('div', { class: 'formula' },
        el('b', { text: 'implied = round( tvl_usd × base multiple × growth × maturity × breadth × freshness )' }),
        document.createTextNode('  —  growth = 1 + clamp(7d, -50, 150) / 100 × 0.8 · maturity = 0.5 + 0.5 × min(age, 1460) / 1460 · breadth = 1 + 0.03 × extra chains (max 5) · freshness = 0.85 under 90 days, else 1')
      ),
      el('p', { class: 'sub', text: 'TVL, seven-day growth, age and chains come from the snapshot. Age is the time since the protocol was first listed, the best record of how long it has run with no token; an unlisted age uses 365 days. Farm plans price gas on the protocol\u2019s own chain — an L2 farmer is not charged Ethereum prices — and capital on its TVL, the hold on its age.' })
    );
  }

  function foot() {
    return el('footer', { class: 'foot' },
      el('p', { text: 'Implied value is this radar\u2019s own claim from one sealed snapshot (' + DATA.as_of + ', ' + DATA.source + '). It is not a price, not a prediction that a token will launch, and not advice. “Records no token” means the snapshot records none — a protocol may still have a token its record does not carry.' }),
      el('p', { text: 'Model ' + DATA.model_version + ': calibrated on the snapshot\u2019s launched protocols, deterministic on the sealed bytes. The dashboard runs with no network.' })
    );
  }

  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });

  function openDetail(slug) {
    var row = DATA.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    state.selected = slug;
    writeHash();
    dialog.textContent = '';
    var recomputed = impliedOf(row);
    var match = recomputed === row.implied_value_usd;
    var catNote = row.category_launched > 0
      ? 'Category median of ' + fmtMult(row.category_median) + ' from ' + row.category_launched + ' launched ' + (row.category || 'Other') + ' protocols in this snapshot.'
      : 'No category median: fewer than five launched ' + (row.category || 'Other') + ' protocols in this snapshot, so the overall median ' + fmtMult(row.category_median) + ' applies.';
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'brand-name', text: 'Rank ' + row.rank + ' of ' + DATA.board_size + ' · ' + (row.scope === 'watchlist' ? 'Watchlist' : 'Early find') }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain') })
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close', onclick: function () { dialog.close(); } })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Implied value, factor by factor' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'TVL' }), el('b', { class: 'num', text: fmtUsd(row.tvl_usd) })),
        el('div', null, el('span', { text: 'Base multiple (calibrated)' }), el('b', { class: 'num', text: fmtMult(row.base_multiple) })),
        el('div', null, el('span', { text: 'Seven-day growth' }), el('b', { class: 'num', text: fmtPct(row.change_7d) + ' → ×' + row.growth_factor.toFixed(2) })),
        el('div', null, el('span', { text: 'Age with no token' }), el('b', { class: 'num', text: fmtAge(row.age_days) + ' → ×' + row.maturity_factor.toFixed(2) })),
        el('div', null, el('span', { text: 'Breadth (' + (row.chains || []).length + ' chains)' }), el('b', { class: 'num', text: '×' + row.breadth_factor.toFixed(2) })),
        el('div', null, el('span', { text: 'Freshness' }), el('b', { class: 'num', text: '×' + row.freshness_factor.toFixed(2) })),
        el('div', { class: 'total' }, el('span', { text: 'Implied value' }), el('b', { class: 'num', text: fmtUsd(row.implied_value_usd) }))
      ),
      el('p', { html: '<b>' + catNote + '</b>' }),
      el('p', { text: 'The page recomputes this row as ' + fmtUsd(recomputed) + (match ? ', the same number board.json carries: the screenshots and the code agree.' : ', which differs from the board — the data would be stale.') + ' This is an estimate, not a price.' })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm plan · 10 steps' }),
      el('ol', { class: 'steps' }, row.farm_steps.map(function (s) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return el('li', null, el('b', { text: action }), el('span', { class: 'cost', text: tail }));
      }))
    ));
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    shell.appendChild(header());
    shell.appendChild(lede());
    shell.appendChild(calibPanel());
    shell.appendChild(controls());
    shell.appendChild(state.tab === 'pre-token' ? boardTable() : liveTable());
    if (state.tab === 'pre-token') shell.appendChild(modelPanel());
    shell.appendChild(foot());
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);
  }

  // Deterministic shot modes: the screenshots are taken at fixed URLs, so the
  // board, the detail view and the filtered view each render the same every run.
  if (state.shot === 'detail') {
    var slug = params.get('slug');
    state.selected = slug || (DATA.rows[0] ? DATA.rows[0].slug : null);
  } else if (state.shot === 'filtered') {
    var cat = params.get('category');
    state.category = cat || (DATA.rows[0] ? DATA.rows[0].category || 'all' : 'all');
    if (params.get('chain')) state.chain = params.get('chain');
  }
  readHash();
  render();
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();

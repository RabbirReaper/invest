<script setup>
import { provide, ref, onMounted } from 'vue'
import { fmtB, calcWACC, runDCF, SCENARIO_MULT, SCENARIO_NOTE } from '../utils/financial.js'
import { PHASES } from '../data/phases.js'
import AppTopBar        from '../components/AppTopBar.vue'
import PhaseRow         from '../components/PhaseRow.vue'
import TradingViewChart from '../components/TradingViewChart.vue'
import InputSidebar     from '../components/InputSidebar.vue'
import MetricsRow       from '../components/MetricsRow.vue'
import FinancialSummary from '../components/FinancialSummary.vue'
import DCFTable         from '../components/DCFTable.vue'
import EVBreakdown      from '../components/EVBreakdown.vue'
import WACCChart        from '../components/WACCChart.vue'
import FCFChart         from '../components/FCFChart.vue'
import SensitivityMatrix from '../components/SensitivityMatrix.vue'
import ConclusionPanel  from '../components/ConclusionPanel.vue'
import CycleIndicators  from '../components/CycleIndicators.vue'

let curScenario = 'conservative'
const waccChartRef = ref(null)
const fcfChartRef  = ref(null)

// ── helpers ──
function n(id) { return parseFloat(document.getElementById(id).value) || 0 }
function sv(id) { return parseFloat(document.getElementById(id).value) || 1 }

function sync(key, val, suf, dec) {
  const map = {
    rf: 'lbl-rf', beta: 'lbl-beta', dv: 'lbl-dv', spread: 'lbl-spread', tc: 'lbl-tc',
    g1: 'lbl-g1', g2: 'lbl-g2', gp: 'lbl-gp', margin: 'lbl-margin', rsi: 'lbl-rsi', ma: 'lbl-ma',
    fcfnorm: 'lbl-fcfnorm', rm: 'lbl-rm',
  }
  if (map[key]) document.getElementById(map[key]).textContent = parseFloat(val).toFixed(dec) + suf
  if (key === 'rf') {
    const rfTop = document.getElementById('inp-rf-top')
    if (rfTop) rfTop.value = parseFloat(val).toFixed(1)
  }
  recalc()
}

function syncRfTop() {
  const v = Math.min(Math.max(parseFloat(document.getElementById('inp-rf-top').value) || 3.5, 0), 10)
  document.getElementById('sl-rf').value = v
  document.getElementById('lbl-rf').textContent = v.toFixed(1) + '%'
  recalc()
}

function fcfModeChange() {
  const mode = document.getElementById('sel-fcf-mode').value
  const isNorm = mode === 'norm'
  document.getElementById('fcf-actual-block').style.display = isNorm ? 'none' : ''
  document.getElementById('fcf-norm-block').style.display   = isNorm ? '' : 'none'
  recalc()
}

function fcfFromComponents() {
  const ocf   = n('inp-ocf')   * sv('sel-ocf-u')
  const capex = n('inp-capex') * sv('sel-capex-u')
  const fcf   = ocf - capex
  document.getElementById('inp-fcf').value = (fcf / 1e8).toFixed(1)
  document.getElementById('sel-fcf-u').value = '1e8'
  document.getElementById('fcb-ocf').textContent   = fmtB(ocf)
  document.getElementById('fcb-capex').textContent = '-' + fmtB(capex)
  document.getElementById('fcb-fcf').textContent   = fmtB(fcf)
  const rev = n('inp-rev') * sv('sel-rev-u')
  document.getElementById('fcb-margin').textContent = rev > 0 ? (fcf / rev * 100).toFixed(1) + '%' : '-'
  recalc()
}

function recalc() {
  const rf = n('sl-rf'), beta = n('sl-beta'), dvPct = n('sl-dv')
  const spread = n('sl-spread'), tc = n('sl-tc'), rm = n('sl-rm')
  const g1 = n('sl-g1'), g2 = n('sl-g2'), gp = n('sl-gp'), marginPct = n('sl-margin')
  const rsi = n('sl-rsi'), ma = n('sl-ma'), price = n('inp-price')
  const priceCur = document.getElementById('sel-price-cur').value
  const shares = n('inp-shares') * sv('sel-shares-u')
  const rev    = n('inp-rev')    * sv('sel-rev-u')
  const fcf0   = n('inp-fcf')    * sv('sel-fcf-u')
  const cash   = n('inp-cash')   * sv('sel-cash-u')
  const debt   = n('inp-debt')   * sv('sel-debt-u')
  const name   = document.getElementById('inp-name').value
               || document.getElementById('inp-ticker').value || '-'

  const { re, rdA, wacc } = calcWACC(rf, beta, dvPct, spread, tc, rm)

  // FCF breakdown
  const ocf   = n('inp-ocf')   * sv('sel-ocf-u')
  const capex = n('inp-capex') * sv('sel-capex-u')
  document.getElementById('fcb-ocf').textContent    = fmtB(ocf)
  document.getElementById('fcb-capex').textContent  = '-' + fmtB(capex)
  document.getElementById('fcb-fcf').textContent    = fmtB(fcf0)
  document.getElementById('fcb-margin').textContent = rev > 0 ? (fcf0 / rev * 100).toFixed(1) + '%' : '-'

  // 決定實際用於 DCF 的 FCF
  const fcfMode = document.getElementById('sel-fcf-mode').value
  let effectiveFcf = fcf0
  if (fcfMode === 'norm') {
    const normPct = n('sl-fcfnorm')
    effectiveFcf = rev * normPct / 100
    document.getElementById('fcb-norm-val').textContent    = fmtB(effectiveFcf)
    document.getElementById('fcb-norm-rev').textContent    = fmtB(rev)
    document.getElementById('lbl-fcfnorm-pct').textContent = normPct.toFixed(0) + '%'
    document.getElementById('fcb-actual-fcf-ref').textContent = fmtB(fcf0)
  }

  if (effectiveFcf <= 0) {
    console.log('[recalc] FCF <= 0, DCF skipped', {
      name, price, currency: priceCur,
      shares, rev, fcf0, ocf, capex, cash, debt,
      rf, beta, dvPct, spread, tc, wacc,
    })
    document.getElementById('m-iv').textContent = 'FCF \u22640\u2014DCF\u4e0d\u9069\u7528'
    document.getElementById('m-iv').style.color = 'var(--red)'
    document.getElementById('m-iv-cur').textContent = '\u9700\u6b63 FCF \u624d\u80fd\u4f30\u5024'
    document.getElementById('m-target').textContent = '\u2014'
    document.getElementById('m-upside').textContent = '\u2014'
    return
  }

  const fcfMargin = rev > 0 ? effectiveFcf / rev * 100 : 0
  document.getElementById('m-fcfm').textContent    = fcfMargin.toFixed(1) + '%' + (fcfMode === 'norm' ? ' (正常化)' : '')
  document.getElementById('m-company').textContent = name.substring(0, 10) || 'TTM'
  document.getElementById('m-wacc').textContent    = (wacc * 100).toFixed(2) + '%'
  document.getElementById('m-wacc-j').textContent  = wacc < 0.07 ? '估值友好' : wacc < 0.10 ? '中性' : '高壓'

  const res = runDCF(effectiveFcf, g1, g2, gp, wacc)
  if (!res) {
    ;['m-iv', 'm-target', 'm-upside'].forEach(id => { document.getElementById(id).textContent = '模型失效' })
    document.getElementById('m-iv').style.color = 'var(--red)'
    return
  }

  const { fcfs, pvs, pv5, pv10, tvPV, total } = res
  const equity = total + cash - debt
  const iv     = equity / shares
  const target = iv * (1 - marginPct / 100)
  const upside  = (iv - price) / price * 100
  const uTarget = (target - price) / price * 100

  console.log('[recalc]', {
    name, price, currency: priceCur,
    shares, rev,
    ocf, capex, fcf0, cash, debt,
    rf, beta, dvPct, spread, tc,
    wacc: parseFloat((wacc * 100).toFixed(2)),
    g1, g2, gp, marginPct,
    pv5, pv10, tvPV, total,
    equity, iv: parseFloat(iv.toFixed(2)),
    target: parseFloat(target.toFixed(2)),
    upside: parseFloat(upside.toFixed(1)),
  })

  document.getElementById('m-iv').textContent       = iv.toFixed(2)
  document.getElementById('m-iv').style.color       = 'var(--blue)'
  document.getElementById('m-iv-cur').textContent   = priceCur + ' Fair Value'
  document.getElementById('m-target').textContent   = target.toFixed(2)
  document.getElementById('m-target-sub').textContent = '含 ' + marginPct.toFixed(0) + '% 安全邊際'
  const uEl = document.getElementById('m-upside')
  uEl.textContent  = (upside >= 0 ? '+' : '') + upside.toFixed(1) + '%'
  uEl.style.color  = upside > 0 ? 'var(--teal)' : 'var(--red)'

  // DCF table
  const tbody = document.getElementById('dcf-tbody')
  tbody.innerHTML = ''
  fcfs.forEach((cf, i) => {
    const pv = pvs[i]
    const cumPVrow = pvs.slice(0, i + 1).reduce((a, b) => a + b, 0)
    const g   = i < 5 ? g1 : g2
    const pct = total > 0 ? (cumPVrow / total * 100) : 0
    tbody.innerHTML += `<tr class="${i % 2 ? 'hl' : ''}">
      <td>第${i + 1}年</td>
      <td>${i < 5 ? 'Y1-5' : 'Y6-10'}</td>
      <td>${g.toFixed(0)}%</td>
      <td>${fmtB(cf)}</td>
      <td>${(1 / Math.pow(1 + wacc, i + 1)).toFixed(4)}</td>
      <td>${fmtB(pv)}</td>
      <td>${fmtB(cumPVrow)}</td>
      <td>${pct.toFixed(1)}%</td>
    </tr>`
  })
  tbody.innerHTML += `<tr class="ttl">
    <td>終值 TV</td><td>Gordon</td><td>g ${gp.toFixed(1)}%</td>
    <td>-</td><td>${(1 / Math.pow(1 + wacc, 10)).toFixed(4)}</td>
    <td class="good">${fmtB(tvPV)}</td>
    <td>-</td><td>${total > 0 ? (tvPV / total * 100).toFixed(1) + '%' : '-'}</td>
  </tr>`

  // EV table
  document.getElementById('ev-pv5').textContent    = fmtB(pv5)
  document.getElementById('ev-pv10').textContent   = fmtB(pv10)
  document.getElementById('ev-tv').textContent     = fmtB(tvPV)
  document.getElementById('ev-total').textContent  = fmtB(total)
  document.getElementById('ev-cash').textContent   = '+' + fmtB(cash)
  document.getElementById('ev-debt').textContent   = '-' + fmtB(debt)
  document.getElementById('ev-equity').textContent = fmtB(equity)
  const ivEl = document.getElementById('ev-iv')
  ivEl.textContent = iv.toFixed(2) + ' ' + priceCur
  ivEl.className   = 'right ' + (iv > price ? 'good' : 'bad')
  const tEl = document.getElementById('ev-target')
  tEl.textContent = target.toFixed(2) + ' ' + priceCur
  tEl.className   = 'right ' + (target > price ? 'good' : 'bad')
  document.getElementById('ev-price').textContent = price.toFixed(2) + ' ' + priceCur
  const utEl = document.getElementById('ev-upside')
  utEl.textContent = (uTarget >= 0 ? '+' : '') + uTarget.toFixed(1) + '%'
  utEl.className   = 'right ' + (uTarget > 0 ? 'good' : 'bad')

  updateConc(wacc, iv, target, price, rsi, ma, dvPct, gp, wacc * 100)
  waccChartRef.value?.update(beta, dvPct, spread, tc, rf, rm)
  fcfChartRef.value?.update(fcfs, pvs)
  updateSens(fcf0, g1, g2, gp, shares, marginPct, price, wacc, cash, debt, curScenario)
}

function updateConc(wacc, iv, target, price, rsi, ma, dv, gp, wPct) {
  const up = (target - price) / price * 100
  const we = document.getElementById('conc-wacc')
  if (wacc < 0.07) {
    we.className = 'conc bull'
    document.getElementById('conc-wacc-t').textContent = 'WACC - 寬鬆環境'
    document.getElementById('conc-wacc-b').textContent = `WACC ${wPct.toFixed(2)}%，折現壓力低，成長股估值受支撐，適合積極布局。`
  } else if (wacc < 0.10) {
    we.className = 'conc neutral'
    document.getElementById('conc-wacc-t').textContent = 'WACC - 中性'
    document.getElementById('conc-wacc-b').textContent = `WACC ${wPct.toFixed(2)}%，中性區間，FCF 需穩定成長方能支撐估值。`
  } else {
    we.className = 'conc bear'
    document.getElementById('conc-wacc-t').textContent = 'WACC - 緊縮高壓'
    document.getElementById('conc-wacc-b').textContent = `WACC ${wPct.toFixed(2)}%，每升 1% 估值縮水 10-15%。D/V ${dv}% 的高負債公司首當其衝，優先持低負債標的。`
  }
  const de = document.getElementById('conc-dcf')
  if (up > 30) {
    de.className = 'conc bull'
    document.getElementById('conc-dcf-t').textContent = 'DCF - 明顯低估'
    document.getElementById('conc-dcf-b').textContent = `目標 ${target.toFixed(2)} vs 股價 ${price.toFixed(2)}，空間 ${up.toFixed(1)}%，安全邊際充足，確認 FCF 季趨勢後可進場。`
  } else if (up > 0) {
    de.className = 'conc neutral'
    document.getElementById('conc-dcf-t').textContent = 'DCF - 合理偏低'
    document.getElementById('conc-dcf-b').textContent = `上漲空間 ${up.toFixed(1)}%，安全邊際尚可，等技術面確認後分批進場。`
  } else {
    de.className = 'conc bear'
    document.getElementById('conc-dcf-t').textContent = 'DCF - 高估'
    document.getElementById('conc-dcf-b').textContent = `股價 ${price.toFixed(2)} 高於目標 ${target.toFixed(2)}，下跌風險 ${Math.abs(up).toFixed(1)}%，等回調至安全邊際。`
  }
  const te = document.getElementById('conc-tech')
  let ts = 0
  if (rsi < 30) ts += 2; else if (rsi < 50) ts += 1
  if (ma < -3)  ts += 2; else if (ma < 0)   ts += 1
  if (ts >= 3) {
    te.className = 'conc bull'
    document.getElementById('conc-tech-t').textContent = '技術面 - 低位佈局'
    document.getElementById('conc-tech-b').textContent = `RSI ${rsi}${rsi < 30 ? ' (超賣)' : ''}，低月線 ${Math.abs(ma)}%。等 RSI 底背離 + 帶量突破月線確認。`
  } else if (ts >= 1) {
    te.className = 'conc neutral'
    document.getElementById('conc-tech-t').textContent = '技術面 - 中性等待'
    document.getElementById('conc-tech-b').textContent = `RSI ${rsi}，月線偏離 ${ma > 0 ? '+' : ''}${ma}%，尚無明確底部信號。`
  } else {
    te.className = 'conc bear'
    document.getElementById('conc-tech-t').textContent = '技術面 - 追漲風險'
    document.getElementById('conc-tech-b').textContent = `RSI ${rsi}${rsi > 70 ? ' (超買)' : ''}，高於月線 ${ma}%，注意短期修正風險。`
  }
  const sigs = []
  if (rsi < 30) sigs.push({ t: 'RSI超賣', c: 'bull' }); else if (rsi > 70) sigs.push({ t: 'RSI超買', c: 'bear' })
  if (ma < -5)  sigs.push({ t: '低於月線', c: 'bull' }); else if (ma > 5) sigs.push({ t: '高月線', c: 'neutral' })
  if (wacc < 0.08) sigs.push({ t: 'WACC低', c: 'bull' }); else if (wacc > 0.11) sigs.push({ t: 'WACC高', c: 'bear' })
  if (up > 30) sigs.push({ t: '大幅低估', c: 'bull' }); else if (up < 0) sigs.push({ t: '估值偏高', c: 'bear' })
  document.getElementById('sig-row').innerHTML = sigs.map(s => `<span class="sig sig-${s.c}">${s.t}</span>`).join('')
  const av = document.getElementById('action-val')
  if (up > 20 && ts >= 2 && wacc < 0.11) {
    av.textContent = '條件成熟 - 分批建倉，等帶量突破月線確認'
    av.style.color = 'var(--teal)'
  } else if (up < 0 || wacc > 0.12) {
    av.textContent = '暫緩進場 - 等估值或技術面改善'
    av.style.color = 'var(--red)'
  } else {
    av.textContent = '持續觀察 - 設定價格警報，等信號收斂'
    av.style.color = 'var(--amber)'
  }
}

function switchScenario(sc) {
  curScenario = sc
  ;['conservative', 'normal', 'optimistic'].forEach(s => {
    document.getElementById('stab-' + s[0]).className = 'stab ' + s + (s === sc ? ' active' : '')
  })
  document.getElementById('sens-note').textContent = SCENARIO_NOTE[sc]
  const rawFcf = n('inp-fcf') * sv('sel-fcf-u')
  const rev    = n('inp-rev') * sv('sel-rev-u')
  const fcfMode = document.getElementById('sel-fcf-mode').value
  const fcf0 = fcfMode === 'norm' ? rev * n('sl-fcfnorm') / 100 : rawFcf
  const g1 = n('sl-g1'), g2 = n('sl-g2'), gp = n('sl-gp'), marginPct = n('sl-margin')
  const shares = n('inp-shares') * sv('sel-shares-u')
  const price  = n('inp-price')
  const cash   = n('inp-cash')   * sv('sel-cash-u')
  const debt   = n('inp-debt')   * sv('sel-debt-u')
  const wacc   = calcWACC(n('sl-rf'), n('sl-beta'), n('sl-dv'), n('sl-spread'), n('sl-tc'), n('sl-rm')).wacc
  updateSens(fcf0, g1, g2, gp, shares, marginPct, price, wacc, cash, debt, sc)
}

function updateSens(fcf0, g1, g2, gp, shares, marginPct, price, baseWacc, cash, debt, sc) {
  const mult   = SCENARIO_MULT[sc]
  const adjFcf = fcf0 * mult
  const waccs  = [0.06, 0.07, 0.08, 0.09, 0.10, 0.11, 0.12, 0.13]
  const g1s    = [g1 - 8, g1 - 4, g1, g1 + 4, g1 + 8]
  let html = '<thead><tr><th>g1 \\ WACC</th>'
  waccs.forEach(w => { html += `<th>${(w * 100).toFixed(0)}%${Math.abs(w - baseWacc) < 0.005 ? ' ◆' : ''}</th>` })
  html += '</tr></thead><tbody>'
  g1s.forEach(g => {
    const isCur = Math.abs(g - g1) < 0.5
    html += `<tr${isCur ? ' style="outline:0.5px solid rgba(255,255,255,0.15)"' : ''}><td class="mono">${g.toFixed(0)}%${isCur ? ' ◆' : ''}</td>`
    waccs.forEach(w => {
      if (w <= gp / 100 + 0.005) { html += '<td style="color:var(--muted)">-</td>'; return }
      let cf = adjFcf, pv = 0
      for (let i = 1; i <= 10; i++) { cf *= (1 + (i <= 5 ? g / 100 : g2 / 100)); pv += cf / Math.pow(1 + w, i) }
      const tv  = cf * (1 + gp / 100) / (w - gp / 100) / Math.pow(1 + w, 10)
      const tgt = (pv + tv + cash - debt) / shares * (1 - marginPct / 100)
      const up  = (tgt - price) / price * 100
      html += `<td class="${up > 30 ? 'good' : up > 0 ? 'warn' : 'bad'}">${tgt.toFixed(0)}</td>`
    })
    html += '</tr>'
  })
  html += '</tbody>'
  document.getElementById('sens-tbl').innerHTML = html
}

function switchPhase(ph) {
  const p    = PHASES[ph]
  const pill = document.getElementById('phase-pill')
  pill.textContent      = p.label
  pill.style.background = p.bg
  pill.style.color      = p.color

  document.querySelectorAll('.pbtn').forEach(b => {
    const bp = PHASES[b.dataset.phase]
    if (b.dataset.phase === ph) {
      b.style.background  = bp.bg
      b.style.color       = bp.color
      b.style.borderColor = 'transparent'
      b.textContent       = '● ' + bp.label
    } else {
      b.style.background  = 'transparent'
      b.style.color       = 'var(--muted2)'
      b.style.borderColor = 'var(--border2)'
      b.textContent       = bp.label
    }
  })

  const ss = (id, val, lbl, suf, dec) => {
    document.getElementById(id).value = val
    document.getElementById(lbl).textContent = parseFloat(val).toFixed(dec) + suf
  }
  ss('sl-rf',     p.rf,     'lbl-rf',     '%', 1)
  ss('sl-beta',   p.beta,   'lbl-beta',   '',  1)
  ss('sl-dv',     p.dv,     'lbl-dv',     '%', 0)
  ss('sl-spread', p.spread, 'lbl-spread', '%', 1)

  document.getElementById('cycle-title').textContent = `周期象限 — ${p.label}關鍵指標`
  let html = `<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;padding:7px 9px;background:var(--s2);border-radius:6px;align-items:center;">
    <span style="font-size:9px;color:var(--muted);font-family:'DM Mono',monospace;margin-right:2px">超配</span>`
  p.assets.forEach(a => { html += `<span class="asset-tag" style="background:${p.bg};color:${p.color}">${a}</span>` })
  html += `<span style="font-size:9px;color:var(--muted);font-family:'DM Mono',monospace;margin-left:8px;margin-right:2px">迴避</span>`
  p.avoid.forEach(a => { html += `<span class="asset-tag" style="background:var(--s3);color:var(--muted2)">${a}</span>` })
  html += `</div><div class="three">`
  p.cols.forEach(col => {
    html += `<div><div style="font-size:9px;color:${col.c};font-family:'DM Mono',monospace;letter-spacing:1px;margin-bottom:5px">${col.l}</div>`
    col.lk.forEach(([t, u]) => { html += `<a class="ind-link" href="${u}" target="_blank">→ ${t}</a>` })
    html += `</div>`
  })
  html += `</div>`
  document.getElementById('cycle-body').innerHTML = html
  recalc()
}

async function autoFetch() {
  const raw = document.getElementById('inp-ticker').value.trim()
  if (!raw) { showStatus('err', '請先輸入股票代碼'); return }
  const ticker = raw.toUpperCase()
  showStatus('loading', `正在取得 ${ticker} 資料...`)
  document.getElementById('btn-fetch').textContent = '載入中'

  const proxies = [
    { url: `/api/yahoo/${ticker}`, parse: j => j },
  ]

  let data = null
  for (const proxy of proxies) {
    try {
      const r = await fetch(proxy.url, { headers: { Accept: 'application/json' } })
      if (!r.ok) continue
      const j = proxy.parse(await r.json())
      if (j?.quoteSummary?.result?.[0]) {
        console.log('[Yahoo Raw JSON]', JSON.stringify(j, null, 2))
        data = j.quoteSummary.result[0]
        break
      }
    } catch (e) {
      console.log('proxy error:', e.message)
    }
  }

  document.getElementById('btn-fetch').textContent = '⬇ 帶入'

  if (!data) {
    showStatus('err', `無法取得資料。請手動輸入，或嘗試 ${ticker.includes('.') ? ticker : ticker + '.TW'}`)
    return
  }

  try {
    const pr = data.price, fd = data.financialData, ks = data.defaultKeyStatistics
    const filled = []
    if (pr?.regularMarketPrice?.raw) {
      document.getElementById('inp-price').value = pr.regularMarketPrice.raw.toFixed(2)
      const cur = pr.currency || 'USD'
      const sel = document.getElementById('sel-price-cur')
      for (let i = 0; i < sel.options.length; i++) { if (sel.options[i].value === cur) { sel.selectedIndex = i; break } }
      filled.push('股價')
    }
    if (pr?.longName || pr?.shortName) {
      document.getElementById('inp-name').value = pr.longName || pr.shortName
      filled.push('公司名稱')
    }
    const sh = pr?.sharesOutstanding?.raw || ks?.sharesOutstanding?.raw
    if (sh) {
      document.getElementById('inp-shares').value = (sh / 1e6).toFixed(0)
      document.getElementById('sel-shares-u').value = '1e6'
      filled.push('股數')
    }
    if (fd?.totalRevenue?.raw) {
      document.getElementById('inp-rev').value = (fd.totalRevenue.raw / 1e8).toFixed(0)
      document.getElementById('sel-rev-u').value = '1e8'
      filled.push('營收')
    }
    if (fd?.operatingCashflow?.raw) {
      document.getElementById('inp-ocf').value = (fd.operatingCashflow.raw / 1e8).toFixed(0)
      document.getElementById('sel-ocf-u').value = '1e8'
      filled.push('OCF')
    }
    if (fd?.freeCashflow?.raw) {
      const fcf = fd.freeCashflow.raw
      document.getElementById('inp-fcf').value = (fcf / 1e8).toFixed(0)
      document.getElementById('sel-fcf-u').value = '1e8'
      filled.push('FCF')
    }
    if (fd?.totalCash?.raw) {
      document.getElementById('inp-cash').value = (fd.totalCash.raw / 1e8).toFixed(0)
      document.getElementById('sel-cash-u').value = '1e8'
      filled.push('現金')
    }
    if (fd?.totalDebt?.raw) {
      document.getElementById('inp-debt').value = (fd.totalDebt.raw / 1e8).toFixed(0)
      document.getElementById('sel-debt-u').value = '1e8'
      filled.push('負債')
    }
    if (ks?.beta?.raw != null && isFinite(ks.beta.raw)) {
      const sl = document.getElementById('sl-beta')
      const bv = Math.min(Math.max(ks.beta.raw, parseFloat(sl.min)), parseFloat(sl.max))
      sl.value = bv.toFixed(2)
      document.getElementById('lbl-beta').textContent = bv.toFixed(1)
      filled.push('Beta')
    }

    // fundamentalsTimeSeries helper - 取最新一年的值
    function ftsVal(fts, fieldName) {
      const entries = fts?.timeseries?.result
      if (!entries) return null
      const entry = entries.find(e => fieldName in e)
      if (!entry) return null
      const arr = entry[fieldName]
      if (!arr || arr.length === 0) return null
      return arr[arr.length - 1]?.reportedValue?.raw ?? null
    }

    const fts = data.fundamentalsTimeSeries

    // cashflowStatementHistory - 嘗試舊格式，若空則 fallback 到 fundamentalsTimeSeries
    const cfs = data.cashflowStatementHistory?.cashflowStatements

    // CapEx
    const capexLegacy = cfs?.[0]?.capitalExpenditures?.raw
    const capexFts    = ftsVal(fts, 'annualCapitalExpenditure')
    const capexRaw    = capexLegacy ?? capexFts
    if (capexRaw != null) {
      const capexAbs = Math.abs(capexRaw)
      document.getElementById('inp-capex').value = (capexAbs / 1e8).toFixed(0)
      document.getElementById('sel-capex-u').value = '1e8'
      document.getElementById('ap-capex-api').textContent = fmtB(capexAbs)
      filled.push('CapEx')
    }

    // OCF 加權平均（舊格式）或最新年度值（FTS）
    const ocfFts = ftsVal(fts, 'annualOperatingCashFlow')
    if (cfs && cfs.length > 0 && cfs[0].totalCashFromOperatingActivities?.raw != null) {
      const weights = [4, 3, 2, 1].slice(0, cfs.length)
      const wSum = weights.reduce((a, b) => a + b, 0)
      const wOcf = cfs.reduce((sum, s, i) => {
        const v = s.totalCashFromOperatingActivities?.raw || 0
        return sum + v * (weights[i] || 1)
      }, 0) / wSum
      document.getElementById('ap-ocf-avg').textContent = fmtB(wOcf)
    } else if (ocfFts != null) {
      document.getElementById('ap-ocf-avg').textContent = fmtB(ocfFts)
    }

    // 折舊
    const deprLegacy = cfs?.[0]?.depreciation?.raw
    const deprFts    = ftsVal(fts, 'annualDepreciationAmortizationDepletion')
    const deprRaw    = deprLegacy ?? deprFts
    if (deprRaw != null) document.getElementById('ap-depr').textContent = fmtB(Math.abs(deprRaw))

    // 營運資金變動
    const wccLegacy = cfs?.[0]?.changeInWorkingCapital?.raw
    const wccFts    = ftsVal(fts, 'annualChangeInWorkingCapital')
    const wccRaw    = wccLegacy ?? wccFts
    if (wccRaw != null) document.getElementById('ap-wcc').textContent = (wccRaw >= 0 ? '+' : '') + fmtB(wccRaw)

    // incomeStatementHistory - 利息費用、債務成本 Rd
    const isStmts = data.incomeStatementHistory?.incomeStatementHistory
    const interestLegacy = isStmts?.[0]?.interestExpense?.raw
    const interestFts    = ftsVal(fts, 'annualInterestExpense')
    const interestRaw    = interestLegacy ?? interestFts
    if (interestRaw != null) {
      const iAbs = Math.abs(interestRaw)
      document.getElementById('ap-interest').textContent = fmtB(iAbs)
      const totalDebtRaw = fd?.totalDebt?.raw
      if (totalDebtRaw && totalDebtRaw > 0) {
        document.getElementById('ap-rd').textContent = (iAbs / totalDebtRaw * 100).toFixed(2) + '%'
      }
    }

    // API 顯示欄位
    const netIncomeRaw = ks?.netIncomeToCommon?.raw ?? fd?.netIncomeToCommon?.raw
    if (netIncomeRaw != null)
      document.getElementById('ap-netincome').textContent = fmtB(netIncomeRaw)
    if (ks?.enterpriseToEbitda?.raw != null)
      document.getElementById('ap-ev-ebitda').textContent = ks.enterpriseToEbitda.raw.toFixed(1) + 'x'
    if (ks?.forwardEps?.raw != null)
      document.getElementById('ap-feps').textContent = ks.forwardEps.raw.toFixed(2)
    if (ks?.heldPercentInstitutions?.raw != null)
      document.getElementById('ap-inst').textContent = (ks.heldPercentInstitutions.raw * 100).toFixed(1) + '%'
    const cashRaw = fd?.totalCash?.raw || 0
    const debtRaw = fd?.totalDebt?.raw || 0
    if (cashRaw || debtRaw) {
      const netCash = cashRaw - debtRaw
      const el = document.getElementById('ap-net-cash')
      el.textContent = (netCash >= 0 ? '+' : '') + fmtB(netCash)
      el.style.color = netCash >= 0 ? 'var(--teal)' : 'var(--red)'
    }

    showStatus('ok', `已帶入：${filled.join('、')}（數據來源：Yahoo Finance TTM）`)
    recalc()
  } catch (e) {
    showStatus('err', '解析資料失敗，請手動填入')
  }
}

function showStatus(type, msg) {
  const el = document.getElementById('fetch-status')
  el.className = 'fetch-status ' + type
  el.textContent = msg
  if (type === 'ok') setTimeout(() => { el.className = 'fetch-status' }, 5000)
}

// ── provide ──
provide('recalc',            recalc)
provide('sync',              sync)
provide('syncRfTop',         syncRfTop)
provide('fcfModeChange',     fcfModeChange)
provide('fcfFromComponents', fcfFromComponents)
provide('autoFetch',         autoFetch)
provide('switchPhase',       switchPhase)
provide('switchScenario',    switchScenario)

onMounted(() => {
  switchPhase('stagflation')
  fcfFromComponents()
})
</script>

<template>
  <div class="shell">
    <AppTopBar />
    <PhaseRow />
    <div class="body">
      <div class="left-panel">
        <TradingViewChart />
        <InputSidebar />
      </div>
      <div class="main">
        <MetricsRow />
        <FinancialSummary />
        <DCFTable />
        <div class="two">
          <EVBreakdown />
          <WACCChart ref="waccChartRef" />
        </div>
        <SensitivityMatrix />
        <div class="two">
          <FCFChart ref="fcfChartRef" />
          <ConclusionPanel />
        </div>
        <CycleIndicators />
      </div>
    </div>
  </div>
</template>

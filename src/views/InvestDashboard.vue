<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'

let waccChart = null
let fcfChart = null
let curScenario = 'conservative'

// ── helpers ──
function n(id) { return parseFloat(document.getElementById(id).value) || 0 }
function sv(id) { return parseFloat(document.getElementById(id).value) || 1 }

function fmtB(v) {
  const a = Math.abs(v)
  if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T'
  if (a >= 1e9)  return (v / 1e9).toFixed(1) + 'B'
  if (a >= 1e8)  return (v / 1e8).toFixed(1) + '億'
  if (a >= 1e6)  return (v / 1e6).toFixed(1) + 'M'
  return v.toFixed(0)
}

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

function calcWACC(rf, beta, dv, spread, tc, rm) {
  const rm_r = (rm ?? 9) / 100
  const d = dv / 100, e = 1 - d
  const re  = rf / 100 + beta * (rm_r - rf / 100)
  const rdA = (rf / 100 + spread / 100) * (1 - tc / 100)
  return { re, rdA, wacc: e * re + d * rdA, e, d }
}

function runDCF(fcf0, g1, g2, gp, wacc) {
  const fcfs = [], pvs = []
  let cf = fcf0, pv5 = 0, pv10 = 0
  for (let i = 1; i <= 10; i++) {
    const g = i <= 5 ? g1 / 100 : g2 / 100
    cf *= (1 + g)
    const pv = cf / Math.pow(1 + wacc, i)
    if (i <= 5) pv5 += pv; else pv10 += pv
    fcfs.push(cf); pvs.push(pv)
  }
  if (wacc <= gp / 100 + 0.001) return null
  const tv   = cf * (1 + gp / 100) / (wacc - gp / 100)
  const tvPV = tv / Math.pow(1 + wacc, 10)
  return { fcfs, pvs, pv5, pv10, tvPV, total: pv5 + pv10 + tvPV }
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
  updateWACCChart(beta, dvPct, spread, tc, rf, rm)
  updateFCFChart(fcfs, pvs)
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

function updateWACCChart(beta, dv, spread, tc, rf, rm) {
  const labels = [], wd = [], red = [], rdd = []
  for (let r = 0; r <= 10; r += 0.5) {
    const { re, rdA, wacc } = calcWACC(r, beta, dv, spread, tc, rm)
    labels.push(r.toFixed(1) + '%')
    wd.push(+(wacc * 100).toFixed(3))
    red.push(+(re * 100).toFixed(3))
    rdd.push(+(rdA * 100).toFixed(3))
  }
  if (waccChart) waccChart.destroy()
  waccChart = new Chart(document.getElementById('waccChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'WACC', data: wd,  borderColor: '#9b7fe8', backgroundColor: 'rgba(155,127,232,0.05)', borderWidth: 2, pointRadius: 1.5, fill: true,  tension: 0.3 },
        { label: 'Re',   data: red, borderColor: '#4d9de0', borderWidth: 1.5, pointRadius: 1, fill: false, tension: 0.3 },
        { label: 'Rd',   data: rdd, borderColor: '#e8a838', borderWidth: 1.5, pointRadius: 1, fill: false, tension: 0.3 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.parsed.y.toFixed(2) + '%' } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6e6c64', font: { size: 9 }, maxTicksLimit: 11 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6e6c64', font: { size: 9 }, callback: v => v + '%' } },
      },
    },
  })
}

function updateFCFChart(fcfs, pvs) {
  if (fcfChart) fcfChart.destroy()
  const labels = fcfs.map((_, i) => 'Y' + (i + 1))
  fcfChart = new Chart(document.getElementById('fcfChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'FCF', data: fcfs.map(v => +(v / 1e8).toFixed(2)), backgroundColor: 'rgba(77,157,224,0.45)', borderColor: '#4d9de0', borderWidth: 1, borderRadius: 3 },
        { label: 'PV',  data: pvs.map(v  => +(v  / 1e8).toFixed(2)), backgroundColor: 'rgba(46,196,160,0.45)', borderColor: '#2ec4a0', borderWidth: 1, borderRadius: 3 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6e6c64', font: { size: 9 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6e6c64', font: { size: 9 }, callback: v => v + '億' } },
      },
    },
  })
}

const SCENARIO_MULT = { conservative: 0.75, normal: 1.0, optimistic: 1.25 }
const SCENARIO_NOTE = {
  conservative: '保守情境：基期 FCF × 0.75，模擬景氣下行、毛利率壓縮或停滯性通膨侵蝕獲利。',
  normal:       '正常情境：基期 FCF × 1.00，使用當前 TTM FCF 作為基準。',
  optimistic:   '樂觀情境：基期 FCF × 1.25，模擬業務擴張、新產品線放量或降本增效。',
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

// ── Phase system ──
const PHASES = {
  recovery: {
    label: '復甦期', color: '#2ec4a0', bg: 'rgba(46,196,160,0.15)', rf: 1.5, beta: 1.2, dv: 30, spread: 1.5, tc: 21,
    assets: ['成長股', '小型股', '銅/工業金屬'], avoid: ['現金', '短債'],
    cols: [
      { l: '進攻信號', c: '#2ec4a0', lk: [['PMI突破50', 'https://www.ismworld.org'], ['殖利率曲線轉正', 'https://fred.stlouisfed.org/series/T10Y2Y'], ['銅價回升', 'https://finance.yahoo.com/quote/HG=F/'], ['AAII看空>50%', 'https://www.aaii.com/sentimentsurvey']] },
      { l: '資金流向', c: '#4d9de0', lk: [['VIX由高回落', 'https://finance.yahoo.com/quote/%5EVIX/'], ['HY利差收窄', 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2'], ['LEI連三月正', 'https://www.conference-board.org/topics/us-leading-indicators'], ['FCF季趨勢上升', 'https://www.gurufocus.com']] },
      { l: '技術確認', c: '#9b7fe8', lk: [['RSI底背離', 'https://finance.yahoo.com'], ['帶量突破月線', 'https://finance.yahoo.com'], ['恐慌貪婪<20', 'https://edition.cnn.com/markets/fear-and-greed'], ['ROIC.ai', 'https://roic.ai']] },
    ],
  },
  overheat: {
    label: '過熱期', color: '#e8a838', bg: 'rgba(232,168,56,0.15)', rf: 4.5, beta: 1.0, dv: 35, spread: 1.5, tc: 21,
    assets: ['原物料/能源', '金融股', 'REITs'], avoid: ['長天期債', '高本益比科技'],
    cols: [
      { l: '通膨信號', c: '#e8a838', lk: [['CPI MoM>0.3%', 'https://www.bls.gov/cpi/'], ['PPI走高', 'https://www.bls.gov/ppi/'], ['油價走強', 'https://finance.yahoo.com/quote/BZ=F/'], ['5Y盈虧平衡', 'https://fred.stlouisfed.org/series/T5YIE']] },
      { l: '景氣確認', c: '#2ec4a0', lk: [['PMI>55', 'https://www.ismworld.org'], ['LEI持續上升', 'https://www.conference-board.org/topics/us-leading-indicators'], ['融資餘額高位', 'https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics'], ['EPS修正上調', 'https://www.factset.com/insight/earnings-insight']] },
      { l: '轉換觀察', c: '#e05c5c', lk: [['Fed升息信號', 'https://fred.stlouisfed.org/series/DFII10'], ['HY利差變化', 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2'], ['殖利率平坦化', 'https://fred.stlouisfed.org/series/T10Y2Y'], ['ROIC vs WACC', 'https://roic.ai']] },
    ],
  },
  stagflation: {
    label: '滯脹期', color: '#e05c5c', bg: 'rgba(224,92,92,0.15)', rf: 3.5, beta: 1.2, dv: 40, spread: 2.0, tc: 21,
    assets: ['黃金/實體黃金', '大宗商品', '防禦股'], avoid: ['成長股', '高本益比科技', '高負債企業'],
    cols: [
      { l: '必看指標', c: '#e05c5c', lk: [['實質利率TIPS', 'https://fred.stlouisfed.org/series/DFII10'], ['殖利率曲線', 'https://fred.stlouisfed.org/series/T10Y2Y'], ['核心PCE', 'https://fred.stlouisfed.org/series/PCEPI'], ['PMI製造業', 'https://www.ismworld.org']] },
      { l: '滯脹確認', c: '#e8a838', lk: [['HY信用利差', 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2'], ['5Y盈虧平衡', 'https://fred.stlouisfed.org/series/T5YIE'], ['初領失業金', 'https://fred.stlouisfed.org/series/ICSA'], ['恐慌貪婪指數', 'https://edition.cnn.com/markets/fear-and-greed']] },
      { l: '企業基本面', c: '#2ec4a0', lk: [['EPS修正率', 'https://www.factset.com/insight/earnings-insight'], ['ROIC vs WACC', 'https://www.gurufocus.com'], ['ROIC.ai', 'https://roic.ai'], ['AAII情緒', 'https://www.aaii.com/sentimentsurvey']] },
    ],
  },
  recession: {
    label: '衰退期', color: '#9b7fe8', bg: 'rgba(155,127,232,0.15)', rf: 2.0, beta: 0.8, dv: 25, spread: 4.0, tc: 21,
    assets: ['長天期國債', '防禦股（公用事業）', '現金'], avoid: ['原物料', '循環消費', '高負債'],
    cols: [
      { l: '衰退確認', c: '#9b7fe8', lk: [['PMI<45', 'https://www.ismworld.org'], ['殖利率再陡化', 'https://fred.stlouisfed.org/series/T10Y2Y'], ['失業金飆升', 'https://fred.stlouisfed.org/series/ICSA'], ['LEI連三月負', 'https://www.conference-board.org/topics/us-leading-indicators']] },
      { l: '信用市場', c: '#e05c5c', lk: [['HY利差>500bps', 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2'], ['IG信用利差', 'https://fred.stlouisfed.org/series/BAMLC0A0CM'], ['NFCI金融情況', 'https://fred.stlouisfed.org/series/NFCI'], ['融資餘額急降', 'https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics']] },
      { l: '播種機會', c: '#2ec4a0', lk: [['AAII看空極值', 'https://www.aaii.com/sentimentsurvey'], ['VIX>40', 'https://finance.yahoo.com/quote/%5EVIX/'], ['FCF正且低負債', 'https://roic.ai'], ['RSI底背離', 'https://finance.yahoo.com']] },
    ],
  },
}

function switchPhase(ph) {
  const p    = PHASES[ph]
  const pill = document.getElementById('phase-pill')
  pill.textContent   = p.label
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

// ── Auto Fetch ──
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

    // cashflowStatementHistory - CapEx 直接取值（修正間接算法 bug）、OCF 加權、折舊、營運資金變動
    const cfs = data.cashflowStatementHistory?.cashflowStatements
    if (cfs && cfs.length > 0) {
      const capexRaw = cfs[0].capitalExpenditures?.raw
      if (capexRaw != null) {
        const capexAbs = Math.abs(capexRaw)
        document.getElementById('inp-capex').value = (capexAbs / 1e8).toFixed(0)
        document.getElementById('sel-capex-u').value = '1e8'
        document.getElementById('ap-capex-api').textContent = fmtB(capexAbs)
        filled.push('CapEx')
      }
      const weights = [4, 3, 2, 1].slice(0, cfs.length)
      const wSum = weights.reduce((a, b) => a + b, 0)
      const wOcf = cfs.reduce((sum, s, i) => {
        const v = s.totalCashFromOperatingActivities?.raw || 0
        return sum + v * (weights[i] || 1)
      }, 0) / wSum
      document.getElementById('ap-ocf-avg').textContent = fmtB(wOcf)
      const depr = cfs[0].depreciation?.raw
      if (depr != null) document.getElementById('ap-depr').textContent = fmtB(Math.abs(depr))
      const wcc = cfs[0].changeInWorkingCapital?.raw
      if (wcc != null) document.getElementById('ap-wcc').textContent = (wcc >= 0 ? '+' : '') + fmtB(wcc)
    }

    // incomeStatementHistory - 利息費用、債務成本 Rd
    const isStmts = data.incomeStatementHistory?.incomeStatementHistory
    if (isStmts && isStmts.length > 0) {
      const interest = isStmts[0].interestExpense?.raw
      if (interest != null) {
        const iAbs = Math.abs(interest)
        document.getElementById('ap-interest').textContent = fmtB(iAbs)
        const totalDebtRaw = fd?.totalDebt?.raw
        if (totalDebtRaw && totalDebtRaw > 0) {
          document.getElementById('ap-rd').textContent = (iAbs / totalDebtRaw * 100).toFixed(2) + '%'
        }
      }
    }

    // API 顯示欄位
    if (fd?.netIncomeToCommon?.raw != null)
      document.getElementById('ap-netincome').textContent = fmtB(fd.netIncomeToCommon.raw)
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

function toggleTV() {
  const c = document.getElementById('tv-container')
  c.style.display = c.style.display === 'none' ? 'block' : 'none'
}

onMounted(() => {
  try {
    new window.TradingView.widget({
      container_id: 'tradingview_adv',
      width: '100%', height: 300,
      symbol: 'TWSE:2317',
      interval: 'D',
      timezone: 'Asia/Taipei',
      theme: 'dark',
      style: '1',
      locale: 'zh_TW',
      toolbar_bg: '#141413',
      hide_side_toolbar: true,
      allow_symbol_change: true,
      save_image: false,
      withdateranges: true,
      details: false,
      hotlist: false,
      calendar: false,
    })
  } catch (e) {
    const el = document.getElementById('tradingview_adv')
    if (el) el.innerHTML = '<div style="padding:20px;font-size:11px;color:#6e6c64;text-align:center">TradingView 圖表載入中...<br><a href="https://tw.tradingview.com/chart/ZaZMsB37/?symbol=TWSE%3A2317" target="_blank" style="color:#4d9de0">點此開啟策略圖</a></div>'
  }
  switchPhase('stagflation')
  fcfFromComponents()
})

onBeforeUnmount(() => {
  if (waccChart) { waccChart.destroy(); waccChart = null }
  if (fcfChart)  { fcfChart.destroy();  fcfChart  = null }
})
</script>

<template>
  <div class="shell">

    <!-- TOP BAR -->
    <div class="topbar">
      <h1>投資分析台</h1>
      <span class="topbar-sub">DCF · WACC · 周期 · TradingView</span>
      <div class="rf-sep"></div>
      <div class="rf-quick">
        <span class="rf-lbl">無風險利率 Rf</span>
        <input type="number" id="inp-rf-top" value="3.5" step="0.1" min="0" max="10" @input="syncRfTop">
        <span class="rf-unit">%</span>
        <span class="rf-hint">10Y公債｜每日更新｜決定所有資產走向</span>
      </div>
      <div style="flex:1"></div>
      <div id="phase-pill" class="tag-pill" style="background:rgba(224,92,92,0.15);color:var(--red)">滯脹期</div>
    </div>

    <!-- PHASE ROW -->
    <div class="phase-row">
      <span class="phase-lbl">象限</span>
      <button class="pbtn" data-phase="recovery"    @click="switchPhase('recovery')">復甦期</button>
      <button class="pbtn" data-phase="overheat"    @click="switchPhase('overheat')">過熱期</button>
      <button class="pbtn" data-phase="stagflation" @click="switchPhase('stagflation')">● 滯脹期</button>
      <button class="pbtn" data-phase="recession"   @click="switchPhase('recession')">衰退期</button>
      <span style="font-size:10px;color:var(--muted);margin-left:8px">切換象限自動預填 WACC 參數</span>
      <div style="flex:1"></div>
      <span style="font-size:10px;color:var(--muted2);font-family:'DM Mono',monospace">美股：AAPL｜台股：2330.TW｜港股：0700.HK</span>
    </div>

    <!-- BODY -->
    <div class="body">

      <!-- LEFT PANEL -->
      <div class="left-panel">

        <!-- TradingView -->
        <div class="tv-section">
          <div class="tv-header">
            <span class="tv-title">策略圖表</span>
            <div class="tv-actions">
              <a class="tv-btn" href="https://tw.tradingview.com/chart/ZaZMsB37/?symbol=TWSE%3A2317" target="_blank">↗ 開啟策略圖</a>
              <button class="tv-btn" @click="toggleTV">收合</button>
            </div>
          </div>
          <div id="tv-container">
            <div class="tradingview-widget-container" style="height:300px;width:100%">
              <div id="tradingview_adv"></div>
            </div>
          </div>
        </div>

        <!-- Inputs -->
        <div class="sidebar">

          <div class="slbl">自動帶入資料</div>
          <div class="ctrl-row" style="margin-bottom:4px">
            <span class="ctrl-name">股票代碼</span>
            <span style="font-size:9px;color:var(--muted)">輸入後點帶入</span>
          </div>
          <div class="fetch-row">
            <input type="text" id="inp-ticker" placeholder="e.g. AAPL / 2330.TW" @keydown.enter="autoFetch">
            <button class="fetch-btn" id="btn-fetch" @click="autoFetch">⬇ 帶入</button>
          </div>
          <div id="fetch-status" class="fetch-status"></div>

          <div class="slbl">公司資料</div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">公司名稱</span></div>
            <input type="text" id="inp-name" placeholder="公司名稱" @input="recalc">
          </div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">當前股價</span></div>
            <div class="inp-row">
              <input type="number" id="inp-price" value="180" step="0.01" @input="recalc">
              <select id="sel-price-cur" @change="recalc"><option>USD</option><option>TWD</option><option>HKD</option></select>
            </div>
          </div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">流通股數</span></div>
            <div class="inp-row">
              <input type="number" id="inp-shares" value="1000" step="1" @input="recalc">
              <select id="sel-shares-u" @change="recalc"><option value="1e6">百萬股</option><option value="1e8">億股</option></select>
            </div>
          </div>

          <div class="slbl">損益 / 自由現金流</div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">TTM 營收</span></div>
            <div class="inp-row">
              <input type="number" id="inp-rev" value="3000" step="1" @input="recalc">
              <select id="sel-rev-u" @change="recalc"><option value="1e8">億</option><option value="1e6">百萬</option></select>
            </div>
          </div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">FCF 模式</span></div>
            <select id="sel-fcf-mode" class="fcf-mode-sel" @change="fcfModeChange">
              <option value="actual">實際 FCF (OCF - CapEx)</option>
              <option value="norm">正常化 FCF (% 營收)</option>
            </select>
          </div>

          <div id="fcf-actual-block">
            <div class="ctrl">
              <div class="ctrl-row"><span class="ctrl-name">營業現金流 OCF</span></div>
              <div class="inp-row">
                <input type="number" id="inp-ocf" value="400" step="1" @input="fcfFromComponents">
                <select id="sel-ocf-u" @change="fcfFromComponents"><option value="1e8">億</option><option value="1e6">百萬</option></select>
              </div>
            </div>
            <div class="ctrl">
              <div class="ctrl-row"><span class="ctrl-name">資本支出 CapEx</span></div>
              <div class="inp-row">
                <input type="number" id="inp-capex" value="100" step="1" @input="fcfFromComponents">
                <select id="sel-capex-u" @change="fcfFromComponents"><option value="1e8">億</option><option value="1e6">百萬</option></select>
              </div>
            </div>
            <div class="fcf-breakdown">
              <div class="fcb-row"><span class="fcb-label">OCF</span><span class="fcb-val" id="fcb-ocf">400億</span></div>
              <div class="fcb-row"><span class="fcb-label">− CapEx</span><span class="fcb-val bad" id="fcb-capex">−100億</span></div>
              <div class="fcb-divider"></div>
              <div class="fcb-row"><span class="fcb-label">= FCF (TTM)</span><span class="fcb-val good" id="fcb-fcf">300億</span></div>
              <div class="fcb-row"><span class="fcb-label">FCF Margin</span><span class="fcb-val" id="fcb-margin">10.0%</span></div>
            </div>
          </div>

          <div id="fcf-norm-block" style="display:none">
            <div class="ctrl">
              <div class="ctrl-row"><span class="ctrl-name">正常化 FCF Margin</span><span class="ctrl-val" id="lbl-fcfnorm">8%</span></div>
              <input type="range" id="sl-fcfnorm" min="1" max="40" step="1" value="8" @input="e => sync('fcfnorm', e.target.value, '%', 0)">
            </div>
            <div class="fcf-breakdown">
              <div class="fcb-row"><span class="fcb-label">TTM 營收</span><span class="fcb-val" id="fcb-norm-rev">—</span></div>
              <div class="fcb-row"><span class="fcb-label">× Margin</span><span class="fcb-val" id="lbl-fcfnorm-pct">8%</span></div>
              <div class="fcb-divider"></div>
              <div class="fcb-row"><span class="fcb-label">= 正常化 FCF</span><span class="fcb-val good" id="fcb-norm-val">—</span></div>
              <div class="fcb-row muted-note">實際 TTM FCF: <span id="fcb-actual-fcf-ref">—</span></div>
            </div>
          </div>

          <!-- hidden FCF input used by JS -->
          <div style="display:none">
            <input type="number" id="inp-fcf" value="300">
            <select id="sel-fcf-u"><option value="1e8">億</option><option value="1e6">百萬</option></select>
          </div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">現金及短期投資</span></div>
            <div class="inp-row">
              <input type="number" id="inp-cash" value="100" step="1" @input="recalc">
              <select id="sel-cash-u" @change="recalc"><option value="1e8">億</option><option value="1e6">百萬</option></select>
            </div>
          </div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">總負債</span></div>
            <div class="inp-row">
              <input type="number" id="inp-debt" value="200" step="1" @input="recalc">
              <select id="sel-debt-u" @change="recalc"><option value="1e8">億</option><option value="1e6">百萬</option></select>
            </div>
          </div>

          <div class="slbl">DCF 成長假設</div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">Y1–5 成長率</span><span class="ctrl-val" id="lbl-g1">12%</span></div>
            <input type="range" id="sl-g1" min="-10" max="50" step="1" value="12" @input="e => sync('g1', e.target.value, '%', 0)">
          </div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">Y6–10 成長率</span><span class="ctrl-val" id="lbl-g2">8%</span></div>
            <input type="range" id="sl-g2" min="-10" max="30" step="1" value="8" @input="e => sync('g2', e.target.value, '%', 0)">
          </div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">永久成長率 g∞</span><span class="ctrl-val" id="lbl-gp">3%</span></div>
            <input type="range" id="sl-gp" min="0" max="5" step="0.5" value="3" @input="e => sync('gp', e.target.value, '%', 1)">
          </div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">安全邊際</span><span class="ctrl-val" id="lbl-margin">25%</span></div>
            <input type="range" id="sl-margin" min="10" max="50" step="5" value="25" @input="e => sync('margin', e.target.value, '%', 0)">
          </div>

          <div class="slbl">WACC 參數</div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">無風險利率 Rf</span><span class="ctrl-val" id="lbl-rf">3.5%</span></div>
            <input type="range" id="sl-rf" min="0" max="10" step="0.5" value="3.5" @input="e => sync('rf', e.target.value, '%', 1)">
          </div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">大盤預期報酬 Rm</span><span class="ctrl-val" id="lbl-rm">9.0%</span></div>
            <input type="range" id="sl-rm" min="5" max="15" step="0.5" value="9" @input="e => sync('rm', e.target.value, '%', 1)">
          </div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">Beta β</span><span class="ctrl-val" id="lbl-beta">1.2</span></div>
            <input type="range" id="sl-beta" min="0.3" max="3" step="0.1" value="1.2" @input="e => sync('beta', e.target.value, '', 1)">
          </div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">負債比 D/V</span><span class="ctrl-val" id="lbl-dv">40%</span></div>
            <input type="range" id="sl-dv" min="0" max="80" step="5" value="40" @input="e => sync('dv', e.target.value, '%', 0)">
          </div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">信用利差</span><span class="ctrl-val" id="lbl-spread">2.0%</span></div>
            <input type="range" id="sl-spread" min="0.5" max="6" step="0.5" value="2" @input="e => sync('spread', e.target.value, '%', 1)">
          </div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">企業稅率 Tc</span><span class="ctrl-val" id="lbl-tc">21%</span></div>
            <input type="range" id="sl-tc" min="10" max="35" step="1" value="21" @input="e => sync('tc', e.target.value, '%', 0)">
          </div>

          <div class="slbl">技術面確認</div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">RSI（14日）</span><span class="ctrl-val" id="lbl-rsi">35</span></div>
            <input type="range" id="sl-rsi" min="0" max="100" step="1" value="35" @input="e => sync('rsi', e.target.value, '', 0)">
          </div>
          <div class="ctrl">
            <div class="ctrl-row"><span class="ctrl-name">股價 vs 月線</span><span class="ctrl-val" id="lbl-ma">-5%</span></div>
            <input type="range" id="sl-ma" min="-30" max="30" step="1" value="-5" @input="e => sync('ma', e.target.value, '%', 0)">
          </div>

        </div>
      </div>

      <!-- MAIN -->
      <div class="main">

        <!-- Metrics -->
        <div class="mrow">
          <div class="mc"><div class="mc-lbl">WACC</div><div class="mc-val" id="m-wacc" style="color:var(--purple)">—</div><div class="mc-sub" id="m-wacc-j">折現率</div></div>
          <div class="mc"><div class="mc-lbl">每股內在價值</div><div class="mc-val" id="m-iv" style="color:var(--blue)">—</div><div class="mc-sub" id="m-iv-cur">Fair Value</div></div>
          <div class="mc"><div class="mc-lbl">買入目標價</div><div class="mc-val" id="m-target" style="color:var(--teal)">—</div><div class="mc-sub" id="m-target-sub">含安全邊際</div></div>
          <div class="mc"><div class="mc-lbl">上漲空間</div><div class="mc-val" id="m-upside">—</div><div class="mc-sub">vs 當前股價</div></div>
          <div class="mc"><div class="mc-lbl">FCF Margin</div><div class="mc-val" id="m-fcfm" style="color:var(--amber)">—</div><div class="mc-sub" id="m-company">TTM</div></div>
        </div>

        <!-- API 財務速覽 -->
        <div class="card">
          <div class="ctitle">財務速覽（API 自動帶入）</div>
          <div class="api-grid">
            <div class="api-item">
              <span class="api-lbl">歸屬母公司淨利</span>
              <span class="api-val" id="ap-netincome">—</span>
            </div>
            <div class="api-item">
              <span class="api-lbl">EV/EBITDA 產現能力</span>
              <span class="api-val" id="ap-ev-ebitda">—</span>
            </div>
            <div class="api-item">
              <span class="api-lbl">Forward EPS</span>
              <span class="api-val" id="ap-feps">—</span>
            </div>
            <div class="api-item">
              <span class="api-lbl">機構持股比例</span>
              <span class="api-val" id="ap-inst">—</span>
            </div>
            <div class="api-item">
              <span class="api-lbl">淨現金（Cash − Debt）</span>
              <span class="api-val" id="ap-net-cash">—</span>
            </div>
            <div class="api-item">
              <span class="api-lbl">OCF 年加權平均</span>
              <span class="api-val" id="ap-ocf-avg">—</span>
            </div>
            <div class="api-item">
              <span class="api-lbl">折舊費用（維護型支出）</span>
              <span class="api-val" id="ap-depr">—</span>
            </div>
            <div class="api-item">
              <span class="api-lbl">營運資金變動</span>
              <span class="api-val" id="ap-wcc">—</span>
            </div>
            <div class="api-item">
              <span class="api-lbl">資本支出 CapEx</span>
              <span class="api-val" id="ap-capex-api">—</span>
            </div>
            <div class="api-item">
              <span class="api-lbl">利息費用</span>
              <span class="api-val" id="ap-interest">—</span>
            </div>
            <div class="api-item">
              <span class="api-lbl">債務成本 Rd（稅前）</span>
              <span class="api-val" id="ap-rd">—</span>
            </div>
          </div>
        </div>

        <!-- DCF Table -->
        <div class="card">
          <div class="ctitle">計算公式與 10 年現金流折現表</div>
          <div class="fbox">
            WACC = (E/V)×Re + (D/V)×Rd×(1−Tc) &nbsp;|&nbsp; Re = Rf + β×(Rm−Rf) &nbsp;|&nbsp; FCF = OCF − CapEx<br>
            FCF_n = FCF_0×(1+g)<sup>n</sup> &nbsp;|&nbsp; PV_n = FCF_n/(1+WACC)<sup>n</sup> &nbsp;|&nbsp; TV = FCF_10×(1+g∞)/(WACC−g∞)<br>
            <span>EV = ΣPV + TV_PV &nbsp;|&nbsp; Equity = EV + Cash − Debt &nbsp;|&nbsp; Fair Value = Equity / Shares</span>
          </div>
          <div style="overflow-x:auto">
            <table class="tbl">
              <thead><tr>
                <th style="text-align:left">年度</th><th>階段</th><th>成長率</th>
                <th>預期 FCF</th><th>折現因子</th><th>現值 PV</th><th>累計 PV</th><th>累計佔比</th>
              </tr></thead>
              <tbody id="dcf-tbody"></tbody>
            </table>
          </div>
        </div>

        <!-- EV + WACC chart -->
        <div class="two">
          <div class="card">
            <div class="ctitle">企業價值拆解</div>
            <table class="tbl">
              <tbody>
                <tr><td>Y1–5 現值</td><td id="ev-pv5">—</td></tr>
                <tr><td>Y6–10 現值</td><td id="ev-pv10">—</td></tr>
                <tr><td>終值折現 TV_PV</td><td id="ev-tv">—</td></tr>
                <tr class="ttl"><td>企業價值 EV</td><td id="ev-total">—</td></tr>
                <tr><td>+ 現金及投資</td><td id="ev-cash">—</td></tr>
                <tr><td>− 總負債</td><td id="ev-debt">—</td></tr>
                <tr class="ttl"><td>股東權益價值</td><td id="ev-equity">—</td></tr>
                <tr class="hl"><td>每股內在價值</td><td id="ev-iv" class="right good">—</td></tr>
                <tr class="hl"><td>買入目標價</td><td id="ev-target" class="right good">—</td></tr>
                <tr class="hl"><td>當前股價</td><td id="ev-price" class="right">—</td></tr>
                <tr class="hl"><td>上漲 / 下跌</td><td id="ev-upside" class="right">—</td></tr>
              </tbody>
            </table>
          </div>
          <div class="card">
            <div class="ctitle">WACC vs 利率曲線</div>
            <div class="chart-h180"><canvas id="waccChart"></canvas></div>
            <div style="display:flex;gap:12px;margin-top:7px;flex-wrap:wrap;">
              <span style="font-size:9px;color:var(--muted2);display:flex;align-items:center;gap:3px"><span style="width:10px;height:2px;background:#9b7fe8;display:inline-block"></span>WACC</span>
              <span style="font-size:9px;color:var(--muted2);display:flex;align-items:center;gap:3px"><span style="width:10px;height:2px;background:#4d9de0;display:inline-block"></span>Re</span>
              <span style="font-size:9px;color:var(--muted2);display:flex;align-items:center;gap:3px"><span style="width:10px;height:2px;background:#e8a838;display:inline-block"></span>Rd(稅後)</span>
            </div>
          </div>
        </div>

        <!-- Sensitivity -->
        <div class="card">
          <div class="ctitle">敏感度矩陣 — 買入目標價（WACC × Y1–5成長率）</div>
          <div class="stabs">
            <button class="stab conservative active" id="stab-c" @click="switchScenario('conservative')">保守（FCF × 0.75）</button>
            <button class="stab normal"              id="stab-n" @click="switchScenario('normal')">正常（FCF × 1.00）</button>
            <button class="stab optimistic"          id="stab-o" @click="switchScenario('optimistic')">樂觀（FCF × 1.25）</button>
          </div>
          <div class="scenario-note" id="sens-note">保守情境：基期 FCF 下調 25%，模擬景氣下行或毛利率壓縮。</div>
          <div class="sens-wrap"><table class="tbl" id="sens-tbl"></table></div>
        </div>

        <!-- Conclusion -->
        <div class="two">
          <div class="card">
            <div class="ctitle">FCF 趨勢圖</div>
            <div class="chart-h180"><canvas id="fcfChart"></canvas></div>
          </div>
          <div class="card">
            <div class="ctitle">綜合結論</div>
            <div class="conc" id="conc-wacc"><div class="conc-t" id="conc-wacc-t">WACC 環境</div><div class="conc-b" id="conc-wacc-b">—</div></div>
            <div class="conc" id="conc-dcf"><div class="conc-t" id="conc-dcf-t">DCF 估值</div><div class="conc-b" id="conc-dcf-b">—</div></div>
            <div class="conc" id="conc-tech"><div class="conc-t" id="conc-tech-t">技術面</div><div class="conc-b" id="conc-tech-b">—</div></div>
            <div class="sig-row" id="sig-row"></div>
            <div class="action-box"><div class="action-lbl">操作建議</div><div class="action-val" id="action-val">—</div></div>
          </div>
        </div>

        <!-- Cycle indicators -->
        <div class="card" id="cycle-card">
          <div class="ctitle" id="cycle-title">周期象限 — 滯脹期關鍵指標</div>
          <div id="cycle-body"></div>
        </div>

      </div>
    </div>
  </div>
</template>

<style>
:root {
  --bg: #0c0c0b; --s1: #141413; --s2: #1b1b19; --s3: #242420; --s4: #2c2c28;
  --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.13);
  --text: #e2e0d8; --muted: #6e6c64; --muted2: #9a9890;
  --blue: #4d9de0; --teal: #2ec4a0; --amber: #e8a838; --red: #e05c5c; --purple: #9b7fe8;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--bg); color: var(--text); font-family: 'Noto Sans TC', sans-serif; font-weight: 300; font-size: 13px; min-height: 100vh; overflow: hidden; }
.mono { font-family: 'DM Mono', monospace; }

.shell { display: grid; grid-template-rows: auto auto 1fr; height: 100vh; }
.topbar { display: flex; align-items: center; gap: 12px; padding: 10px 20px; border-bottom: 0.5px solid var(--border); background: var(--s1); flex-wrap: wrap; flex-shrink: 0; }
.topbar h1 { font-size: 14px; font-weight: 500; }
.topbar-sub { font-size: 10px; color: var(--muted); font-family: 'DM Mono', monospace; }
.rf-sep { width: 0.5px; height: 18px; background: var(--border2); }
.rf-quick { display: flex; align-items: center; gap: 5px; }
.rf-lbl { font-size: 10px; color: var(--amber); font-family: 'DM Mono', monospace; font-weight: 500; white-space: nowrap; }
.rf-quick input { width: 58px; padding: 3px 6px; font-size: 12px; }
.rf-unit { font-size: 11px; color: var(--muted2); font-family: 'DM Mono', monospace; }
.rf-hint { font-size: 9px; color: var(--muted); font-family: 'DM Mono', monospace; white-space: nowrap; }
.api-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
.api-item { background: var(--s2); border-radius: 7px; padding: 8px 10px; }
.api-lbl { display: block; font-size: 9px; color: var(--muted); font-family: 'DM Mono', monospace; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.api-val { display: block; font-size: 15px; font-weight: 500; font-family: 'DM Mono', monospace; color: var(--text); }
.phase-row { display: flex; gap: 4px; padding: 8px 20px; background: var(--s1); border-bottom: 0.5px solid var(--border); flex-wrap: wrap; align-items: center; flex-shrink: 0; }
.phase-lbl { font-size: 9px; color: var(--muted); font-family: 'DM Mono', monospace; letter-spacing: 1px; margin-right: 4px; }
.pbtn { font-size: 10px; font-family: 'DM Mono', monospace; padding: 3px 12px; border-radius: 20px; border: 0.5px solid var(--border2); background: transparent; color: var(--muted2); cursor: pointer; transition: all .15s; }
.pbtn:hover { color: var(--text); }

.body { display: grid; grid-template-columns: 360px 1fr; min-height: 0; overflow: hidden; }

.left-panel { display: flex; flex-direction: column; background: var(--s1); border-right: 0.5px solid var(--border); overflow: hidden; }
.tv-section { flex-shrink: 0; border-bottom: 0.5px solid var(--border); position: relative; }
.tv-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; background: var(--s2); }
.tv-title { font-size: 9px; color: var(--muted); font-family: 'DM Mono', monospace; letter-spacing: 1px; text-transform: uppercase; }
.tv-actions { display: flex; gap: 6px; }
.tv-btn { font-size: 10px; font-family: 'DM Mono', monospace; padding: 3px 10px; border-radius: 4px; border: 0.5px solid var(--border2); background: transparent; color: var(--blue); cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
.tv-btn:hover { background: var(--s3); }

.sidebar { flex: 1; padding: 12px 14px; overflow-y: auto; }
.slbl { font-size: 8px; letter-spacing: 2px; color: var(--muted); font-family: 'DM Mono', monospace; text-transform: uppercase; margin: 12px 0 7px; padding-bottom: 4px; border-bottom: 0.5px solid var(--border); }
.slbl:first-child { margin-top: 0; }
.ctrl { margin-bottom: 9px; }
.ctrl-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
.ctrl-name { font-size: 11px; color: var(--muted2); }
.ctrl-val { font-size: 11px; font-weight: 500; color: var(--text); font-family: 'DM Mono', monospace; }
input[type=range] { width: 100%; -webkit-appearance: none; height: 3px; border-radius: 2px; background: var(--s3); outline: none; cursor: pointer; }
input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: var(--text); cursor: pointer; }
.inp-row { display: flex; gap: 3px; align-items: center; }
.inp-row input { flex: 1; min-width: 0; }
select { background: var(--s2); border: 0.5px solid var(--border2); border-radius: 5px; padding: 4px 5px; color: var(--muted2); font-size: 10px; font-family: 'DM Mono', monospace; outline: none; cursor: pointer; }
input[type=number], input[type=text] { width: 100%; background: var(--s2); border: 0.5px solid var(--border2); border-radius: 5px; padding: 4px 7px; color: var(--text); font-size: 11px; font-family: 'DM Mono', monospace; outline: none; }
input:focus, select:focus { border-color: var(--blue); }

.fetch-row { display: flex; gap: 4px; margin-bottom: 9px; }
.fetch-row input { flex: 1; }
.fetch-btn { font-size: 10px; font-family: 'DM Mono', monospace; padding: 4px 10px; border-radius: 5px; border: 0.5px solid var(--blue); background: rgba(77,157,224,0.1); color: var(--blue); cursor: pointer; white-space: nowrap; transition: all .15s; }
.fetch-btn:hover { background: rgba(77,157,224,0.2); }
.fetch-status { font-size: 9px; font-family: 'DM Mono', monospace; padding: 3px 8px; border-radius: 4px; margin-bottom: 8px; display: none; }
.fetch-status.ok      { display: block; background: rgba(46,196,160,0.12); color: var(--teal); }
.fetch-status.err     { display: block; background: rgba(224,92,92,0.12);   color: var(--red); }
.fetch-status.loading { display: block; background: rgba(232,168,56,0.12);  color: var(--amber); }

.fcf-breakdown { background: var(--s2); border-radius: 6px; padding: 7px 10px; margin-bottom: 8px; font-size: 10px; font-family: 'DM Mono', monospace; }
.fcb-row { display: flex; justify-content: space-between; padding: 2px 0; }
.fcb-label { color: var(--muted); }
.fcb-val { color: var(--text); }
.fcb-divider { border-top: 0.5px solid var(--border); margin: 4px 0; }
.fcb-row.muted-note { color: var(--muted); font-size: 9px; gap: 4px; }
.fcf-mode-sel { width: 100%; background: var(--s2); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 4px 6px; font-size: 11px; margin-bottom: 6px; }

.main { padding: 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.card { background: var(--s1); border: 0.5px solid var(--border); border-radius: 11px; padding: 12px 14px; }
.ctitle { font-size: 9px; font-family: 'DM Mono', monospace; color: var(--muted); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px; }

.mrow { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; }
.mc { background: var(--s2); border-radius: 8px; padding: 9px 11px; }
.mc-lbl { font-size: 9px; color: var(--muted); font-family: 'DM Mono', monospace; margin-bottom: 2px; }
.mc-val { font-size: 18px; font-weight: 500; line-height: 1.2; }
.mc-sub { font-size: 9px; color: var(--muted); margin-top: 2px; }

.tbl { width: 100%; border-collapse: collapse; font-size: 11px; }
.tbl th { text-align: right; padding: 4px 7px; color: var(--muted); font-weight: 400; border-bottom: 0.5px solid var(--border); font-family: 'DM Mono', monospace; font-size: 9px; }
.tbl th:first-child { text-align: left; }
.tbl td { padding: 5px 7px; border-bottom: 0.5px solid var(--border); color: var(--text); text-align: right; font-family: 'DM Mono', monospace; }
.tbl td:first-child { text-align: left; color: var(--muted2); font-family: 'Noto Sans TC', sans-serif; font-size: 11px; }
.tbl tr:last-child td { border-bottom: none; }
.tbl tr.hl td { background: var(--s2); }
.tbl tr.ttl td { color: var(--text); font-weight: 500; border-top: 0.5px solid var(--border2); }
.good { color: var(--teal) !important; }
.bad  { color: var(--red)  !important; }
.warn { color: var(--amber) !important; }

.conc { border-radius: 7px; padding: 9px 12px; border-left: 3px solid var(--muted); margin-bottom: 7px; }
.conc.bull    { border-left-color: var(--teal); }
.conc.bear    { border-left-color: var(--red); }
.conc.neutral { border-left-color: var(--amber); }
.conc-t { font-size: 11px; font-weight: 500; margin-bottom: 3px; }
.conc-b { font-size: 11px; color: var(--muted2); line-height: 1.6; }

.fbox { background: var(--s2); border-radius: 7px; padding: 9px 12px; font-size: 10px; font-family: 'DM Mono', monospace; color: var(--muted2); line-height: 1.9; margin-bottom: 10px; }
.fbox span { color: var(--text); }

.two   { display: grid; grid-template-columns: 1fr 1fr;     gap: 10px; }
.three { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }

.chart-h180 { position: relative; width: 100%; height: 180px; }

.stabs { display: flex; gap: 3px; margin-bottom: 10px; }
.stab { font-size: 10px; font-family: 'DM Mono', monospace; padding: 4px 12px; border-radius: 5px; border: 0.5px solid var(--border2); background: transparent; color: var(--muted2); cursor: pointer; transition: all .15s; }
.stab:hover { color: var(--text); }
.stab.active { background: var(--s3); color: var(--text); border-color: var(--border2); }
.stab.conservative.active { background: rgba(224,92,92,0.15);  color: var(--red);   border-color: rgba(224,92,92,0.3); }
.stab.normal.active       { background: rgba(232,168,56,0.15); color: var(--amber); border-color: rgba(232,168,56,0.3); }
.stab.optimistic.active   { background: rgba(46,196,160,0.15); color: var(--teal);  border-color: rgba(46,196,160,0.3); }

.sens-wrap { overflow-x: auto; }
.scenario-note { font-size: 10px; font-family: 'DM Mono', monospace; color: var(--muted); margin-bottom: 8px; padding: 5px 9px; background: var(--s2); border-radius: 5px; }

.sig-row { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 7px; }
.sig { font-size: 9px; font-family: 'DM Mono', monospace; padding: 2px 7px; border-radius: 3px; }
.sig-bull    { background: rgba(46,196,160,0.12); color: var(--teal); }
.sig-bear    { background: rgba(224,92,92,0.12);  color: var(--red); }
.sig-neutral { background: rgba(232,168,56,0.12); color: var(--amber); }

.action-box { background: var(--s3); border-radius: 7px; padding: 9px 12px; margin-top: 7px; }
.action-lbl { font-size: 9px; color: var(--muted); font-family: 'DM Mono', monospace; margin-bottom: 3px; }
.action-val { font-size: 12px; font-weight: 500; }

.tag-pill { display: inline-block; font-size: 9px; font-family: 'DM Mono', monospace; padding: 2px 9px; border-radius: 10px; }
.ind-link { color: var(--blue); text-decoration: none; display: block; font-size: 11px; line-height: 2; }
.ind-link:hover { text-decoration: underline; }
.asset-tag { font-size: 9px; padding: 2px 7px; border-radius: 3px; display: inline-block; margin: 2px 2px 2px 0; }

@media (max-width: 1000px) {
  body { overflow: auto; }
  .shell { height: auto; }
  .body { grid-template-columns: 1fr; overflow: visible; }
  .left-panel { overflow: visible; }
  .mrow { grid-template-columns: repeat(3, 1fr); }
  .two, .three { grid-template-columns: 1fr; }
  .api-grid { grid-template-columns: repeat(2, 1fr); }
  .rf-hint { display: none; }
}
</style>

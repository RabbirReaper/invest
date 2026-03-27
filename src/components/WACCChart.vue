<script setup>
import { onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'
import { calcWACC } from '../utils/financial.js'

let chart = null

function update(beta, dv, spread, tc, rf, rm) {
  const labels = [], wd = [], red = [], rdd = []
  for (let r = 0; r <= 10; r += 0.5) {
    const { re, rdA, wacc } = calcWACC(r, beta, dv, spread, tc, rm)
    labels.push(r.toFixed(1) + '%')
    wd.push(+(wacc * 100).toFixed(3))
    red.push(+(re * 100).toFixed(3))
    rdd.push(+(rdA * 100).toFixed(3))
  }
  if (chart) chart.destroy()
  chart = new Chart(document.getElementById('waccChart'), {
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

onBeforeUnmount(() => {
  if (chart) { chart.destroy(); chart = null }
})

defineExpose({ update })
</script>

<template>
  <div class="card">
    <div class="ctitle">WACC vs 利率曲線</div>
    <div class="chart-h180"><canvas id="waccChart"></canvas></div>
    <div style="display:flex;gap:12px;margin-top:7px;flex-wrap:wrap;">
      <span style="font-size:9px;color:var(--muted2);display:flex;align-items:center;gap:3px"><span style="width:10px;height:2px;background:#9b7fe8;display:inline-block"></span>WACC = (E/V)·Re + (D/V)·Rd·(1−Tc)</span>
      <span style="font-size:9px;color:var(--muted2);display:flex;align-items:center;gap:3px"><span style="width:10px;height:2px;background:#4d9de0;display:inline-block"></span>Re = Rf + β·(Rm−Rf)</span>
      <span style="font-size:9px;color:var(--muted2);display:flex;align-items:center;gap:3px"><span style="width:10px;height:2px;background:#e8a838;display:inline-block"></span>Rd(稅後) = (Rf+Spread)·(1−Tc)</span>
    </div>
  </div>
</template>

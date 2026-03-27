<script setup>
import { onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'

let chart = null

function update(fcfs, pvs) {
  if (chart) chart.destroy()
  const labels = fcfs.map((_, i) => 'Y' + (i + 1))
  chart = new Chart(document.getElementById('fcfChart'), {
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

onBeforeUnmount(() => {
  if (chart) { chart.destroy(); chart = null }
})

defineExpose({ update })
</script>

<template>
  <div class="card">
    <div class="ctitle">FCF 趨勢圖</div>
    <div class="chart-h180"><canvas id="fcfChart"></canvas></div>
    <div style="display:flex;gap:12px;margin-top:7px;flex-wrap:wrap;">
      <span style="font-size:9px;color:var(--muted2);display:flex;align-items:center;gap:3px"><span style="width:10px;height:2px;background:#4d9de0;display:inline-block"></span>FCF (自由現金流 = OCF − CapEx)</span>
      <span style="font-size:9px;color:var(--muted2);display:flex;align-items:center;gap:3px"><span style="width:10px;height:2px;background:#2ec4a0;display:inline-block"></span>PV (現值 = FCF / (1+WACC)^n)</span>
    </div>
  </div>
</template>

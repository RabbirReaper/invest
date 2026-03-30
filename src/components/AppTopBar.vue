<script setup>
import { inject } from 'vue'
const syncRfTop    = inject('syncRfTop')
const copyAnalysis = inject('copyAnalysis')
</script>

<template>
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
    <button id="btn-copy-analysis" class="copy-btn" @click="copyAnalysis">複製分析報告</button>
    <div id="phase-pill" class="tag-pill" style="background:rgba(224,92,92,0.15);color:var(--red)">滯脹期</div>
  </div>
</template>

<style scoped>
.copy-btn {
  padding: 4px 12px;
  font-size: 11px;
  font-family: 'DM Mono', monospace;
  background: transparent;
  border: 1px solid var(--border2);
  color: var(--muted2);
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  letter-spacing: 0.3px;
  transition: border-color 0.15s, color 0.15s;
}
.copy-btn:hover {
  border-color: var(--blue);
  color: var(--blue);
}
</style>

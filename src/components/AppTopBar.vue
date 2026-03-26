<script setup>
import { inject } from 'vue'
const syncRfTop = inject('syncRfTop')
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
    <div id="phase-pill" class="tag-pill" style="background:rgba(224,92,92,0.15);color:var(--red)">滯脹期</div>
  </div>
</template>

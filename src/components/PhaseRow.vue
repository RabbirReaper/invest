<script setup>
import { inject } from 'vue'
const switchPhase = inject('switchPhase')
</script>

<template>
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
</template>

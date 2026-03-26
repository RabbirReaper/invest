<script setup>
import { inject } from 'vue'
const switchScenario = inject('switchScenario')
</script>

<template>
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
</template>

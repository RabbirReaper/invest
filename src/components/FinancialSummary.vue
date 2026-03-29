<script setup>
import { inject } from 'vue'
const recalc = inject('recalc')
</script>

<template>
  <div class="card">
    <div class="ctitle">財務速覽（API 自動帶入）</div>
    <div class="api-grid">
      <div class="api-item">
        <span class="api-lbl">歸屬母公司淨利</span>
        <span class="api-val" id="ap-netincome">—</span>
      </div>
      <div class="api-item api-item--calc">
        <span class="api-lbl">EV/EBITDA 產現能力</span>
        <input type="number" class="api-input" id="ap-ev-ebitda" placeholder="x" step="0.1" min="0" @input="recalc">
      </div>
      <div class="api-item api-item--calc">
        <span class="api-lbl">Forward EPS</span>
        <input type="number" class="api-input" id="ap-feps" placeholder="EPS" step="0.01" @input="recalc">
      </div>
      <div class="api-item api-item--calc">
        <span class="api-lbl">機構持股比例 %</span>
        <input type="number" class="api-input" id="ap-inst" placeholder="0~100" step="0.1" min="0" max="100" @input="recalc">
      </div>
      <div class="api-item">
        <span class="api-lbl">淨現金（Cash − Debt）</span>
        <span class="api-val" id="ap-net-cash">—</span>
      </div>
      <div class="api-item">
        <span class="api-lbl">OCF 年加權平均</span>
        <span class="api-val" id="ap-ocf-avg">—</span>
      </div>
      <div class="api-item api-item--calc">
        <span class="api-lbl">折舊費用（億）</span>
        <input type="number" class="api-input" id="ap-depr" placeholder="億" step="0.1" min="0" @input="recalc">
      </div>
      <div class="api-item api-item--calc">
        <span class="api-lbl">營運資金變動 △WC（億）</span>
        <input type="number" class="api-input" id="ap-wcc" placeholder="億（可負）" step="0.1" @input="recalc">
      </div>
      <div class="api-item api-item--calc">
        <span class="api-lbl">自由現金流 FCF</span>
        <span class="api-val" id="ap-fcf">—</span>
      </div>
      <div class="api-item api-item--calc">
        <span class="api-lbl">資本支出 CapEx</span>
        <span class="api-val" id="ap-capex-api">—</span>
      </div>
      <div class="api-item api-item--calc">
        <span class="api-lbl">利息費用（億）</span>
        <input type="number" class="api-input" id="ap-interest" placeholder="億" step="0.01" min="0" @input="recalc">
      </div>
      <div class="api-item">
        <span class="api-lbl">債務成本 Rd（稅前）</span>
        <span class="api-val" id="ap-rd">—</span>
      </div>
    </div>
    <div id="wcc-warning" class="wcc-warn" style="display:none"></div>
  </div>
</template>

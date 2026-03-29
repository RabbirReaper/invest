<template>
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
      <div class="api-item api-item--calc">
        <span class="api-lbl">自由現金流 FCF</span>
        <span class="api-val" id="ap-fcf">—</span>
      </div>
      <div class="api-item api-item--calc">
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
</template>

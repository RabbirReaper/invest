<template>
  <div class="mrow">
    <div class="mc">
      <div class="mc-lbl">WACC</div>
      <div class="mc-formula">= (E/V)·Re + (D/V)·Rd·(1−Tc)</div>
      <div class="mc-val" id="m-wacc" style="color:var(--purple)">—</div>
      <div class="mc-sub" id="m-wacc-j">折現率</div>
    </div>
    <div class="mc">
      <div class="mc-lbl">每股內在價值 <span class="mc-abbr">IV</span></div>
      <div class="mc-formula">= Equity / Shares</div>
      <div class="mc-val" id="m-iv" style="color:var(--blue)">—</div>
      <div class="mc-sub" id="m-iv-cur">Fair Value</div>
    </div>
    <div class="mc">
      <div class="mc-lbl">買入目標價 <span class="mc-abbr">TP</span></div>
      <div class="mc-formula">= IV × (1 − MOS)</div>
      <div class="mc-val" id="m-target" style="color:var(--teal)">—</div>
      <div class="mc-sub" id="m-target-sub">含安全邊際</div>
    </div>
    <div class="mc">
      <div class="mc-lbl">上漲空間 <span class="mc-abbr">Upside</span></div>
      <div class="mc-formula">= (IV − P) / P</div>
      <div class="mc-val" id="m-upside">—</div>
      <div class="mc-sub">vs 當前股價 P</div>
    </div>
    <div class="mc">
      <div class="mc-lbl">FCF Margin</div>
      <div class="mc-formula">= FCF / Revenue</div>
      <div class="mc-val" id="m-fcfm" style="color:var(--amber)">—</div>
      <div class="mc-sub" id="m-company">TTM</div>
    </div>
  </div>
</template>

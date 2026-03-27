<template>
  <div class="card">
    <div class="ctitle">企業價值拆解</div>
    <table class="tbl">
      <tbody>
        <tr><td>Y1–5 現值 <span class="tbl-abbr">ΣPV(1–5)</span></td><td id="ev-pv5">—</td></tr>
        <tr><td>Y6–10 現值 <span class="tbl-abbr">ΣPV(6–10)</span></td><td id="ev-pv10">—</td></tr>
        <tr><td>終值折現 <span class="tbl-abbr">TV_PV = FCF₁₀·(1+g∞)/(WACC−g∞)/(1+WACC)¹⁰</span></td><td id="ev-tv">—</td></tr>
        <tr class="ttl"><td>企業價值 <span class="tbl-abbr">EV = ΣPV + TV_PV</span></td><td id="ev-total">—</td></tr>
        <tr><td>+ 現金及投資 <span class="tbl-abbr">Cash</span></td><td id="ev-cash">—</td></tr>
        <tr><td>− 總負債 <span class="tbl-abbr">Debt</span></td><td id="ev-debt">—</td></tr>
        <tr class="ttl"><td>股東權益價值 <span class="tbl-abbr">Equity = EV + Cash − Debt</span></td><td id="ev-equity">—</td></tr>
        <tr class="hl"><td>每股內在價值 <span class="tbl-abbr">IV = Equity / Shares</span></td><td id="ev-iv" class="right good">—</td></tr>
        <tr class="hl"><td>買入目標價 <span class="tbl-abbr">TP = IV × (1−MOS)</span></td><td id="ev-target" class="right good">—</td></tr>
        <tr class="hl"><td>當前股價 <span class="tbl-abbr">P</span></td><td id="ev-price" class="right">—</td></tr>
        <tr class="hl"><td>上漲 / 下跌 <span class="tbl-abbr">= (IV−P)/P</span></td><td id="ev-upside" class="right">—</td></tr>
      </tbody>
    </table>
  </div>
</template>

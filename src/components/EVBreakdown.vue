<template>
  <div class="card">
    <div class="ctitle">企業價值拆解</div>
    <table class="tbl">
      <tbody>
        <tr><td>Y1–5 現值</td><td id="ev-pv5">—</td></tr>
        <tr><td>Y6–10 現值</td><td id="ev-pv10">—</td></tr>
        <tr><td>終值折現 TV_PV</td><td id="ev-tv">—</td></tr>
        <tr class="ttl"><td>企業價值 EV</td><td id="ev-total">—</td></tr>
        <tr><td>+ 現金及投資</td><td id="ev-cash">—</td></tr>
        <tr><td>− 總負債</td><td id="ev-debt">—</td></tr>
        <tr class="ttl"><td>股東權益價值</td><td id="ev-equity">—</td></tr>
        <tr class="hl"><td>每股內在價值</td><td id="ev-iv" class="right good">—</td></tr>
        <tr class="hl"><td>買入目標價</td><td id="ev-target" class="right good">—</td></tr>
        <tr class="hl"><td>當前股價</td><td id="ev-price" class="right">—</td></tr>
        <tr class="hl"><td>上漲 / 下跌</td><td id="ev-upside" class="right">—</td></tr>
      </tbody>
    </table>
  </div>
</template>

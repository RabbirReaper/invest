<template>
  <div class="card">
    <div class="ctitle">計算公式與 10 年現金流折現表</div>
    <div class="fbox">
      WACC = (E/V)×Re + (D/V)×Rd×(1−Tc) &nbsp;|&nbsp; Re = Rf + β×(Rm−Rf) &nbsp;|&nbsp; FCF = OCF − CapEx<br>
      FCF_n = FCF_0×(1+g)<sup>n</sup> &nbsp;|&nbsp; PV_n = FCF_n/(1+WACC)<sup>n</sup> &nbsp;|&nbsp; TV = FCF_10×(1+g∞)/(WACC−g∞) &nbsp;|&nbsp; TV_PV = TV/(1+WACC)<sup>10</sup><br>
      <span>EV = ΣPV + TV_PV &nbsp;|&nbsp; Equity = EV + Cash − Debt &nbsp;|&nbsp; Fair Value = Equity / Shares</span><br>
      <span style="color:var(--amber)">維護 FCF = OCF − min(CapEx, 折舊)（以折舊估計維護性資本支出，保守評估持續經營價值）</span><br>
      <span style="color:var(--blue)">P/E 估值 = Forward EPS × 20x &nbsp;|&nbsp; EV/EBITDA 估值：EBITDA ≈ 淨利 + 利息 + 折舊，IV = (倍數 × EBITDA + Cash − Debt) / Shares</span><br>
      <span style="color:var(--purple)">機構持股 &gt; 70% → MOS −5%（流動性佳）&nbsp;|&nbsp; 機構持股 &lt; 30% → MOS +5%（波動風險高）</span>
    </div>
    <div style="overflow-x:auto">
      <table class="tbl">
        <thead><tr>
          <th style="text-align:left">年度</th><th>階段</th><th>成長率</th>
          <th>預期 FCF</th><th>折現因子</th><th>現值 PV</th><th>累計 PV</th><th>累計佔比</th>
        </tr></thead>
        <tbody id="dcf-tbody"></tbody>
      </table>
    </div>
  </div>
</template>

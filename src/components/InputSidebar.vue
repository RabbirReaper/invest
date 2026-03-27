<script setup>
import { inject } from 'vue'
const recalc           = inject('recalc')
const sync             = inject('sync')
const fcfModeChange    = inject('fcfModeChange')
const fcfFromComponents = inject('fcfFromComponents')
const autoFetch        = inject('autoFetch')
</script>

<template>
  <div class="sidebar">

    <div class="slbl">自動帶入資料</div>
    <div class="ctrl-row" style="margin-bottom:4px">
      <span class="ctrl-name">股票代碼</span>
      <span style="font-size:9px;color:var(--muted)">輸入後點帶入</span>
    </div>
    <div class="fetch-row">
      <input type="text" id="inp-ticker" placeholder="e.g. AAPL / 2330.TW" @keydown.enter="autoFetch">
      <button class="fetch-btn" id="btn-fetch" @click="autoFetch">⬇ 帶入</button>
    </div>
    <div id="fetch-status" class="fetch-status"></div>

    <div class="slbl">公司資料</div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">公司名稱</span></div>
      <input type="text" id="inp-name" placeholder="公司名稱" @input="recalc">
    </div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">當前股價</span></div>
      <div class="inp-row">
        <input type="number" id="inp-price" value="180" step="0.01" @input="recalc">
        <select id="sel-price-cur" @change="recalc"><option>USD</option><option>TWD</option><option>HKD</option></select>
      </div>
    </div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">流通股數</span></div>
      <div class="inp-row">
        <input type="number" id="inp-shares" value="1000" step="1" @input="recalc">
        <select id="sel-shares-u" @change="recalc"><option value="1e6">百萬股</option><option value="1e8">億股</option></select>
      </div>
    </div>

    <div class="slbl">損益 / 自由現金流</div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">TTM 營收</span></div>
      <div class="inp-row">
        <input type="number" id="inp-rev" value="3000" step="1" @input="recalc">
        <select id="sel-rev-u" @change="recalc"><option value="1e8">億</option><option value="1e6">百萬</option></select>
      </div>
    </div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">FCF 模式</span></div>
      <select id="sel-fcf-mode" class="fcf-mode-sel" @change="fcfModeChange">
        <option value="actual">實際 FCF (OCF - CapEx)</option>
        <option value="norm">正常化 FCF (% 營收)</option>
      </select>
    </div>

    <div id="fcf-actual-block">
      <div class="ctrl">
        <div class="ctrl-row"><span class="ctrl-name">營業現金流 OCF</span></div>
        <div class="inp-row">
          <input type="number" id="inp-ocf" value="400" step="1" @input="fcfFromComponents">
          <select id="sel-ocf-u" @change="fcfFromComponents"><option value="1e8">億</option><option value="1e6">百萬</option></select>
        </div>
      </div>
      <div class="ctrl">
        <div class="ctrl-row"><span class="ctrl-name">資本支出 CapEx</span></div>
        <div class="inp-row">
          <input type="number" id="inp-capex" value="100" step="1" @input="fcfFromComponents">
          <select id="sel-capex-u" @change="fcfFromComponents"><option value="1e8">億</option><option value="1e6">百萬</option></select>
        </div>
      </div>
      <div class="fcf-breakdown">
        <div class="fcb-row"><span class="fcb-label">OCF</span><span class="fcb-val" id="fcb-ocf">400億</span></div>
        <div class="fcb-row"><span class="fcb-label">− CapEx</span><span class="fcb-val bad" id="fcb-capex">−100億</span></div>
        <div class="fcb-divider"></div>
        <div class="fcb-row"><span class="fcb-label">= FCF (TTM)</span><span class="fcb-val good" id="fcb-fcf">300億</span></div>
        <div class="fcb-row"><span class="fcb-label">FCF Margin</span><span class="fcb-val" id="fcb-margin">10.0%</span></div>
      </div>
    </div>

    <div id="fcf-norm-block" style="display:none">
      <div class="ctrl">
        <div class="ctrl-row"><span class="ctrl-name">正常化 FCF Margin</span><span class="ctrl-val" id="lbl-fcfnorm">8%</span></div>
        <input type="range" id="sl-fcfnorm" min="1" max="40" step="1" value="8" @input="e => sync('fcfnorm', e.target.value, '%', 0)">
      </div>
      <div class="fcf-breakdown">
        <div class="fcb-row"><span class="fcb-label">TTM 營收</span><span class="fcb-val" id="fcb-norm-rev">—</span></div>
        <div class="fcb-row"><span class="fcb-label">× Margin</span><span class="fcb-val" id="lbl-fcfnorm-pct">8%</span></div>
        <div class="fcb-divider"></div>
        <div class="fcb-row"><span class="fcb-label">= 正常化 FCF</span><span class="fcb-val good" id="fcb-norm-val">—</span></div>
        <div class="fcb-row muted-note">實際 TTM FCF: <span id="fcb-actual-fcf-ref">—</span></div>
      </div>
    </div>

    <!-- hidden FCF input used by JS -->
    <div style="display:none">
      <input type="number" id="inp-fcf" value="300">
      <select id="sel-fcf-u"><option value="1e8">億</option><option value="1e6">百萬</option></select>
    </div>

    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">現金及短期投資</span></div>
      <div class="inp-row">
        <input type="number" id="inp-cash" value="100" step="1" @input="recalc">
        <select id="sel-cash-u" @change="recalc"><option value="1e8">億</option><option value="1e6">百萬</option></select>
      </div>
    </div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">總負債</span></div>
      <div class="inp-row">
        <input type="number" id="inp-debt" value="200" step="1" @input="recalc">
        <select id="sel-debt-u" @change="recalc"><option value="1e8">億</option><option value="1e6">百萬</option></select>
      </div>
    </div>

    <div class="slbl">DCF 成長假設</div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">Y1–5 成長率 <span class="ctrl-abbr">g1</span></span><span class="ctrl-val" id="lbl-g1">12%</span></div>
      <input type="range" id="sl-g1" min="-10" max="50" step="1" value="12" @input="e => sync('g1', e.target.value, '%', 0)">
    </div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">Y6–10 成長率 <span class="ctrl-abbr">g2</span></span><span class="ctrl-val" id="lbl-g2">8%</span></div>
      <input type="range" id="sl-g2" min="-10" max="30" step="1" value="8" @input="e => sync('g2', e.target.value, '%', 0)">
    </div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">永久成長率 <span class="ctrl-abbr">g∞ (Terminal Growth)</span></span><span class="ctrl-val" id="lbl-gp">3%</span></div>
      <input type="range" id="sl-gp" min="0" max="5" step="0.5" value="3" @input="e => sync('gp', e.target.value, '%', 1)">
    </div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">安全邊際 <span class="ctrl-abbr">MOS (Margin of Safety)</span></span><span class="ctrl-val" id="lbl-margin">25%</span></div>
      <input type="range" id="sl-margin" min="10" max="50" step="5" value="25" @input="e => sync('margin', e.target.value, '%', 0)">
    </div>

    <div class="slbl">WACC 參數</div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">無風險利率 <span class="ctrl-abbr">Rf</span></span><span class="ctrl-val" id="lbl-rf">3.5%</span></div>
      <input type="range" id="sl-rf" min="0" max="10" step="0.5" value="3.5" @input="e => sync('rf', e.target.value, '%', 1)">
    </div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">大盤預期報酬 <span class="ctrl-abbr">Rm</span></span><span class="ctrl-val" id="lbl-rm">9.0%</span></div>
      <input type="range" id="sl-rm" min="5" max="15" step="0.5" value="9" @input="e => sync('rm', e.target.value, '%', 1)">
    </div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">Beta <span class="ctrl-abbr">β — 系統性風險</span></span><span class="ctrl-val" id="lbl-beta">1.2</span></div>
      <input type="range" id="sl-beta" min="0.3" max="3" step="0.1" value="1.2" @input="e => sync('beta', e.target.value, '', 1)">
    </div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">負債比 <span class="ctrl-abbr">D/V = Debt/(Debt+Equity)</span></span><span class="ctrl-val" id="lbl-dv">40%</span></div>
      <input type="range" id="sl-dv" min="0" max="80" step="5" value="40" @input="e => sync('dv', e.target.value, '%', 0)">
    </div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">信用利差 <span class="ctrl-abbr">Spread = Rd − Rf</span></span><span class="ctrl-val" id="lbl-spread">2.0%</span></div>
      <input type="range" id="sl-spread" min="0.5" max="6" step="0.5" value="2" @input="e => sync('spread', e.target.value, '%', 1)">
    </div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-name">企業稅率 <span class="ctrl-abbr">Tc</span></span><span class="ctrl-val" id="lbl-tc">21%</span></div>
      <input type="range" id="sl-tc" min="10" max="35" step="1" value="21" @input="e => sync('tc', e.target.value, '%', 0)">
    </div>


  </div>
</template>

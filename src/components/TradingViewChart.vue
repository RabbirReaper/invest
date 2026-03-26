<script setup>
import { onMounted } from 'vue'

function toggleTV() {
  const c = document.getElementById('tv-container')
  c.style.display = c.style.display === 'none' ? 'block' : 'none'
}

onMounted(() => {
  try {
    new window.TradingView.widget({
      container_id: 'tradingview_adv',
      width: '100%', height: 300,
      symbol: 'TWSE:2317',
      interval: 'D',
      timezone: 'Asia/Taipei',
      theme: 'dark',
      style: '1',
      locale: 'zh_TW',
      toolbar_bg: '#141413',
      hide_side_toolbar: true,
      allow_symbol_change: true,
      save_image: false,
      withdateranges: true,
      details: false,
      hotlist: false,
      calendar: false,
    })
  } catch (e) {
    const el = document.getElementById('tradingview_adv')
    if (el) el.innerHTML = '<div style="padding:20px;font-size:11px;color:#6e6c64;text-align:center">TradingView 圖表載入中...<br><a href="https://tw.tradingview.com/chart/ZaZMsB37/?symbol=TWSE%3A2317" target="_blank" style="color:#4d9de0">點此開啟策略圖</a></div>'
  }
})
</script>

<template>
  <div class="tv-section">
    <div class="tv-header">
      <span class="tv-title">策略圖表</span>
      <div class="tv-actions">
        <a class="tv-btn" href="https://tw.tradingview.com/chart/ZaZMsB37/?symbol=TWSE%3A2317" target="_blank">↗ 開啟策略圖</a>
        <button class="tv-btn" @click="toggleTV">收合</button>
      </div>
    </div>
    <div id="tv-container">
      <div class="tradingview-widget-container" style="height:300px;width:100%">
        <div id="tradingview_adv"></div>
      </div>
    </div>
  </div>
</template>

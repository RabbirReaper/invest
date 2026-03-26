export const PHASES = {
  recovery: {
    label: '復甦期', color: '#2ec4a0', bg: 'rgba(46,196,160,0.15)', rf: 1.5, beta: 1.2, dv: 30, spread: 1.5, tc: 21,
    assets: ['成長股', '小型股', '銅/工業金屬'], avoid: ['現金', '短債'],
    cols: [
      { l: '進攻信號', c: '#2ec4a0', lk: [['PMI突破50', 'https://www.ismworld.org'], ['殖利率曲線轉正', 'https://fred.stlouisfed.org/series/T10Y2Y'], ['銅價回升', 'https://finance.yahoo.com/quote/HG=F/'], ['AAII看空>50%', 'https://www.aaii.com/sentimentsurvey']] },
      { l: '資金流向', c: '#4d9de0', lk: [['VIX由高回落', 'https://finance.yahoo.com/quote/%5EVIX/'], ['HY利差收窄', 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2'], ['LEI連三月正', 'https://www.conference-board.org/topics/us-leading-indicators'], ['FCF季趨勢上升', 'https://www.gurufocus.com']] },
      { l: '技術確認', c: '#9b7fe8', lk: [['RSI底背離', 'https://finance.yahoo.com'], ['帶量突破月線', 'https://finance.yahoo.com'], ['恐慌貪婪<20', 'https://edition.cnn.com/markets/fear-and-greed'], ['ROIC.ai', 'https://roic.ai']] },
    ],
  },
  overheat: {
    label: '過熱期', color: '#e8a838', bg: 'rgba(232,168,56,0.15)', rf: 4.5, beta: 1.0, dv: 35, spread: 1.5, tc: 21,
    assets: ['原物料/能源', '金融股', 'REITs'], avoid: ['長天期債', '高本益比科技'],
    cols: [
      { l: '通膨信號', c: '#e8a838', lk: [['CPI MoM>0.3%', 'https://www.bls.gov/cpi/'], ['PPI走高', 'https://www.bls.gov/ppi/'], ['油價走強', 'https://finance.yahoo.com/quote/BZ=F/'], ['5Y盈虧平衡', 'https://fred.stlouisfed.org/series/T5YIE']] },
      { l: '景氣確認', c: '#2ec4a0', lk: [['PMI>55', 'https://www.ismworld.org'], ['LEI持續上升', 'https://www.conference-board.org/topics/us-leading-indicators'], ['融資餘額高位', 'https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics'], ['EPS修正上調', 'https://www.factset.com/insight/earnings-insight']] },
      { l: '轉換觀察', c: '#e05c5c', lk: [['Fed升息信號', 'https://fred.stlouisfed.org/series/DFII10'], ['HY利差變化', 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2'], ['殖利率平坦化', 'https://fred.stlouisfed.org/series/T10Y2Y'], ['ROIC vs WACC', 'https://roic.ai']] },
    ],
  },
  stagflation: {
    label: '滯脹期', color: '#e05c5c', bg: 'rgba(224,92,92,0.15)', rf: 3.5, beta: 1.2, dv: 40, spread: 2.0, tc: 21,
    assets: ['黃金/實體黃金', '大宗商品', '防禦股'], avoid: ['成長股', '高本益比科技', '高負債企業'],
    cols: [
      { l: '必看指標', c: '#e05c5c', lk: [['實質利率TIPS', 'https://fred.stlouisfed.org/series/DFII10'], ['殖利率曲線', 'https://fred.stlouisfed.org/series/T10Y2Y'], ['核心PCE', 'https://fred.stlouisfed.org/series/PCEPI'], ['PMI製造業', 'https://www.ismworld.org']] },
      { l: '滯脹確認', c: '#e8a838', lk: [['HY信用利差', 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2'], ['5Y盈虧平衡', 'https://fred.stlouisfed.org/series/T5YIE'], ['初領失業金', 'https://fred.stlouisfed.org/series/ICSA'], ['恐慌貪婪指數', 'https://edition.cnn.com/markets/fear-and-greed']] },
      { l: '企業基本面', c: '#2ec4a0', lk: [['EPS修正率', 'https://www.factset.com/insight/earnings-insight'], ['ROIC vs WACC', 'https://www.gurufocus.com'], ['ROIC.ai', 'https://roic.ai'], ['AAII情緒', 'https://www.aaii.com/sentimentsurvey']] },
    ],
  },
  recession: {
    label: '衰退期', color: '#9b7fe8', bg: 'rgba(155,127,232,0.15)', rf: 2.0, beta: 0.8, dv: 25, spread: 4.0, tc: 21,
    assets: ['長天期國債', '防禦股（公用事業）', '現金'], avoid: ['原物料', '循環消費', '高負債'],
    cols: [
      { l: '衰退確認', c: '#9b7fe8', lk: [['PMI<45', 'https://www.ismworld.org'], ['殖利率再陡化', 'https://fred.stlouisfed.org/series/T10Y2Y'], ['失業金飆升', 'https://fred.stlouisfed.org/series/ICSA'], ['LEI連三月負', 'https://www.conference-board.org/topics/us-leading-indicators']] },
      { l: '信用市場', c: '#e05c5c', lk: [['HY利差>500bps', 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2'], ['IG信用利差', 'https://fred.stlouisfed.org/series/BAMLC0A0CM'], ['NFCI金融情況', 'https://fred.stlouisfed.org/series/NFCI'], ['融資餘額急降', 'https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics']] },
      { l: '播種機會', c: '#2ec4a0', lk: [['AAII看空極值', 'https://www.aaii.com/sentimentsurvey'], ['VIX>40', 'https://finance.yahoo.com/quote/%5EVIX/'], ['FCF正且低負債', 'https://roic.ai'], ['RSI底背離', 'https://finance.yahoo.com']] },
    ],
  },
}

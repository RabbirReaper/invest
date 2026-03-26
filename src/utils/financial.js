export function fmtB(v) {
  const a = Math.abs(v)
  if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T'
  if (a >= 1e9)  return (v / 1e9).toFixed(1) + 'B'
  if (a >= 1e8)  return (v / 1e8).toFixed(1) + '億'
  if (a >= 1e6)  return (v / 1e6).toFixed(1) + 'M'
  return v.toFixed(0)
}

export function calcWACC(rf, beta, dv, spread, tc, rm) {
  const rm_r = (rm ?? 9) / 100
  const d = dv / 100, e = 1 - d
  const re  = rf / 100 + beta * (rm_r - rf / 100)
  const rdA = (rf / 100 + spread / 100) * (1 - tc / 100)
  return { re, rdA, wacc: e * re + d * rdA, e, d }
}

export function runDCF(fcf0, g1, g2, gp, wacc) {
  const fcfs = [], pvs = []
  let cf = fcf0, pv5 = 0, pv10 = 0
  for (let i = 1; i <= 10; i++) {
    const g = i <= 5 ? g1 / 100 : g2 / 100
    cf *= (1 + g)
    const pv = cf / Math.pow(1 + wacc, i)
    if (i <= 5) pv5 += pv; else pv10 += pv
    fcfs.push(cf); pvs.push(pv)
  }
  if (wacc <= gp / 100 + 0.001) return null
  const tv   = cf * (1 + gp / 100) / (wacc - gp / 100)
  const tvPV = tv / Math.pow(1 + wacc, 10)
  return { fcfs, pvs, pv5, pv10, tvPV, total: pv5 + pv10 + tvPV }
}

export const SCENARIO_MULT = { conservative: 0.75, normal: 1.0, optimistic: 1.25 }
export const SCENARIO_NOTE = {
  conservative: '保守情境：基期 FCF × 0.75，模擬景氣下行、毛利率壓縮或停滯性通膨侵蝕獲利。',
  normal:       '正常情境：基期 FCF × 1.00，使用當前 TTM FCF 作為基準。',
  optimistic:   '樂觀情境：基期 FCF × 1.25，模擬業務擴張、新產品線放量或降本增效。',
}

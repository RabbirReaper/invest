import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || /^http:\/\/localhost:\d+$/,
    credentials: true,
  }),
)

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ limit: '2mb', extended: true }))

// Trust proxy (for reverse proxy / Cloud Run)
app.set('trust proxy', 1)

// Yahoo Finance proxy - requires cookie + crumb handshake
let yahooSession = { crumb: null, cookie: null, expires: 0 }

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (r) => {
      let body = ''
      r.on('data', c => { body += c })
      r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, body }))
    }).on('error', reject)
  })
}

async function refreshYahooSession() {
  // Step 1: get cookie from fc.yahoo.com
  const fcRes = await httpsGet('https://fc.yahoo.com', { 'User-Agent': UA, 'Accept': '*/*' })
  const rawCookies = fcRes.headers['set-cookie'] || []
  const cookie = rawCookies.map(c => c.split(';')[0]).join('; ')

  // Step 2: get crumb using that cookie
  const crumbRes = await httpsGet('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    'User-Agent': UA,
    'Accept': '*/*',
    'Cookie': cookie,
  })
  const crumb = crumbRes.body.trim()
  if (!crumb || crumb.startsWith('<')) throw new Error('crumb fetch failed')

  yahooSession = { crumb, cookie, expires: Date.now() + 3600_000 }
  return yahooSession
}

async function getYahooSession() {
  if (yahooSession.crumb && Date.now() < yahooSession.expires) return yahooSession
  return refreshYahooSession()
}

app.get('/api/yahoo/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase()
  try {
    let session = await getYahooSession()

    const makeUrl = (crumb) =>
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}` +
      `?modules=price,financialData,defaultKeyStatistics,cashflowStatementHistory,incomeStatementHistory&crumb=${encodeURIComponent(crumb)}`

    const makeFtsUrl = (crumb) => {
      const types = [
        'annualCapitalExpenditure',
        'annualOperatingCashFlow',
        'annualFreeCashFlow',
        'annualDepreciationAmortizationDepletion',
        'annualChangeInWorkingCapital',
        'annualInterestExpense',
      ].join(',')
      const period2 = Math.floor(Date.now() / 1000)
      return `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${ticker}` +
        `?type=${types}&period1=1483228800&period2=${period2}&crumb=${encodeURIComponent(crumb)}`
    }

    let result = await httpsGet(makeUrl(session.crumb), {
      'User-Agent': UA,
      'Accept': 'application/json',
      'Cookie': session.cookie,
    })

    // on 401, refresh session once and retry
    if (result.status === 401) {
      session = await refreshYahooSession()
      result = await httpsGet(makeUrl(session.crumb), {
        'User-Agent': UA,
        'Accept': 'application/json',
        'Cookie': session.cookie,
      })
    }

    // fetch fundamentalsTimeSeries in parallel for detailed cashflow fields
    let ftsData = null
    try {
      const ftsResult = await httpsGet(makeFtsUrl(session.crumb), {
        'User-Agent': UA,
        'Accept': 'application/json',
        'Cookie': session.cookie,
      })
      if (ftsResult.status === 200) {
        ftsData = JSON.parse(ftsResult.body)
      }
    } catch (e) {
      // non-fatal: ftsData stays null
    }

    // merge ftsData into quoteSummary result
    if (ftsData && result.status === 200) {
      try {
        const qs = JSON.parse(result.body)
        if (qs?.quoteSummary?.result?.[0]) {
          qs.quoteSummary.result[0].fundamentalsTimeSeries = ftsData
        }
        res.set('Content-Type', 'application/json')
        res.status(200).json(qs)
        return
      } catch (e) {
        // merge failed, fall through to send original
      }
    }

    res.set('Content-Type', 'application/json')
    res.status(result.status).send(result.body)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
})

app.get('/api/market-params', async (req, res) => {
  try {
    let session = await getYahooSession()

    const makeSummaryUrl = (ticker, crumb) =>
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}` +
      `?modules=price&crumb=${encodeURIComponent(crumb)}`

    const makeChartUrl = (crumb) =>
      `https://query1.finance.yahoo.com/v8/finance/chart/%5ESP500TR` +
      `?interval=1mo&range=5y&crumb=${encodeURIComponent(crumb)}`

    const hdrs = { 'User-Agent': UA, 'Accept': 'application/json', 'Cookie': session.cookie }

    let [tnxR, sp5R, crdR] = await Promise.allSettled([
      httpsGet(makeSummaryUrl('%5ETNX', session.crumb), hdrs),
      httpsGet(makeChartUrl(session.crumb), hdrs),
      httpsGet(makeSummaryUrl('BAMLC0A0CMEY', session.crumb), hdrs),
    ])

    const has401 = [tnxR, sp5R, crdR].some(r =>
      r.status === 'fulfilled' && r.value.status === 401
    )
    if (has401) {
      session = await refreshYahooSession()
      const hdrs2 = { 'User-Agent': UA, 'Accept': 'application/json', 'Cookie': session.cookie };
      [tnxR, sp5R, crdR] = await Promise.allSettled([
        httpsGet(makeSummaryUrl('%5ETNX', session.crumb), hdrs2),
        httpsGet(makeChartUrl(session.crumb), hdrs2),
        httpsGet(makeSummaryUrl('BAMLC0A0CMEY', session.crumb), hdrs2),
      ])
    }

    let rf = null
    if (tnxR.status === 'fulfilled' && tnxR.value.status === 200) {
      try { rf = JSON.parse(tnxR.value.body)?.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw ?? null } catch (_) {}
    }

    let rm = null
    if (sp5R.status === 'fulfilled' && sp5R.value.status === 200) {
      try {
        const closes = JSON.parse(sp5R.value.body)?.chart?.result?.[0]?.indicators?.adjclose?.[0]?.adjclose
        if (closes && closes.length >= 12) {
          const first = closes[0], last = closes[closes.length - 1]
          if (first > 0 && last > 0)
            rm = (Math.pow(last / first, 1 / (closes.length / 12)) - 1) * 100
        }
      } catch (_) {}
    }

    let spread = null
    if (crdR.status === 'fulfilled' && crdR.value.status === 200) {
      try { spread = JSON.parse(crdR.value.body)?.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw ?? null } catch (_) {}
    }

    console.log('[market-params]', { rf, rm, spread })
    res.json({ rf, rm, spread })
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
})

// Static files
app.use(express.static(path.resolve(__dirname, 'dist')))

// Static assets - return 404 explicitly to avoid MIME type errors
app.use('/assets', (req, res) => {
  res.status(404).send('Asset not found')
})

// SPA fallback - all non-API routes serve index.html
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'))
})

const httpServer = createServer(app)

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on 0.0.0.0:${port}`)
})

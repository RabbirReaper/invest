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
      `?modules=price,financialData,defaultKeyStatistics&crumb=${encodeURIComponent(crumb)}`

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

    res.set('Content-Type', 'application/json')
    res.status(result.status).send(result.body)
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

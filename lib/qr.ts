import { createHmac, timingSafeEqual } from 'crypto'
import QRCode from 'qrcode'

const SECRET = process.env.QR_HMAC_SECRET ?? 'default-qr-secret'

export interface QRPayload {
  appId: string
  tier: string
  name: string
  event: string
  issuedAt: number
  sig: string
}

function buildMessage(p: Omit<QRPayload, 'sig'>): string {
  return `${p.appId}|${p.tier}|${p.event}|${p.issuedAt}`
}

export function signQRPayload(p: Omit<QRPayload, 'sig'>): QRPayload {
  const sig = createHmac('sha256', SECRET).update(buildMessage(p)).digest('hex')
  return { ...p, sig }
}

export function verifyQRPayload(p: QRPayload): boolean {
  try {
    const expected = createHmac('sha256', SECRET)
      .update(buildMessage(p))
      .digest('hex')
    const expBuf = Buffer.from(expected, 'hex')
    const sigBuf = Buffer.from(p.sig, 'hex')
    if (expBuf.length !== sigBuf.length) return false
    return timingSafeEqual(expBuf, sigBuf)
  } catch {
    return false
  }
}

export async function generateQRDataURL(
  appId: string,
  tier: string,
  name: string
): Promise<string> {
  const payload = signQRPayload({
    appId,
    tier,
    name,
    event: 'MISSNELLORE-2025',
    issuedAt: Math.floor(Date.now() / 1000),
  })

  return QRCode.toDataURL(JSON.stringify(payload), {
    errorCorrectionLevel: 'H',
    width: 400,
    margin: 2,
    color: {
      dark: tier === 'elite' ? '#78350f' : '#713f12',
      light: '#ffffff',
    },
  })
}

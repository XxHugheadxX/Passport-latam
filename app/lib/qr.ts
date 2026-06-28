import QRCode from 'qrcode'

export async function generatePassportQR(passportId: string): Promise<string> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/verify/${passportId}`
  return QRCode.toDataURL(url, { margin: 2, width: 256 })
}

export async function generatePassportQRSvg(passportId: string): Promise<string> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/verify/${passportId}`
  return QRCode.toString(url, { type: 'svg', margin: 2, width: 256 })
}

export function getVerifyUrl(passportId: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/verify/${passportId}`
}
// Gera ícones PNG simples (gota de água sobre fundo azul) para o manifest da PWA,
// já que alguns browsers não reconhecem ícones SVG para efeitos de instalação.
// Corre uma vez com: node scripts/generate-png-icons.cjs
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function crc32(buf) {
  let c
  const table = crc32.table || (crc32.table = (() => {
    const t = []
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    return t
  })())
  c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

// Desenha um "droplet" simples: fundo azul (#0369a1) com uma gota branca centrada.
function drawIcon(size, { maskableSafe = false } = {}) {
  const bg = [3, 105, 161]
  const fg = [255, 255, 255]
  const cx = size / 2
  const cy = size / 2
  // Para ícones "maskable", mantém o conteúdo dentro da zona segura central (~80%).
  const scale = maskableSafe ? 0.62 : 0.72
  const r = (size * scale) / 2

  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(size * 4)
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dyTop = y - (cy - r * 0.25)
      // Forma de gota: círculo inferior + ponta triangular no topo.
      const distCircle = Math.sqrt(dx * dx + dyTop * dyTop)
      const inCircle = distCircle <= r * 0.62
      const topT = (y - (cy - r)) / (r * 0.9)
      const triHalfWidth = Math.abs(dx) <= r * 0.62 * Math.max(0, 1 - topT) * 1.05
      const inTriangle = topT >= 0 && topT <= 1 && triHalfWidth
      const isDrop = inCircle || inTriangle
      const [rr, gg, bb] = isDrop ? fg : bg
      const o = x * 4
      row[o] = rr
      row[o + 1] = gg
      row[o + 2] = bb
      row[o + 3] = 255
    }
    rows.push(Buffer.concat([Buffer.from([0]), row]))
  }
  return Buffer.concat(rows)
}

function buildPng(size, opts) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const raw = drawIcon(size, opts)
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const outDir = path.join(__dirname, '..', 'public', 'icons')
fs.writeFileSync(path.join(outDir, 'icon-192.png'), buildPng(192, {}))
fs.writeFileSync(path.join(outDir, 'icon-512.png'), buildPng(512, {}))
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), buildPng(512, { maskableSafe: true }))
console.log('Ícones PNG gerados em public/icons/')

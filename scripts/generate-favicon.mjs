#!/usr/bin/env node
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function generateFavicon() {
  const svgPath = join(__dirname, '../public/infinity.svg')
  const icoPath = join(__dirname, '../public/favicon.ico')

  console.log('Generando favicon desde SVG...')

  // Leer SVG
  const svgBuffer = readFileSync(svgPath)

  // Generar ICO de 32x32 con fondo transparente
  const pngBuffer = await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toBuffer()

  // Sharp no soporta ICO directamente, así que guardamos como PNG
  // y luego lo renombramos a .ico (los navegadores modernos aceptan PNG como .ico)
  writeFileSync(icoPath, pngBuffer)

  console.log('✅ Favicon generado exitosamente en:', icoPath)
}

generateFavicon().catch(console.error)

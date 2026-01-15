# Guía: Actualizar OCR para Soporte de PDF

**Fecha:** 2026-01-14  
**Proyecto destino:** maxeva (erplozada)  
**Cambio:** Agregar soporte de PDF al OCR existente que solo funcionaba con fotos

---

## 📋 Resumen

El OCR actual solo acepta imágenes (JPEG, PNG, WebP). Esta actualización permite que también procese archivos PDF, extrayendo automáticamente la imagen embebida del documento escaneado.

---

## 🔧 Cambios Requeridos

### 1. Instalar dependencia

```bash
npm install pdf-lib
```

> `pdf-lib` es una librería pura de JavaScript que funciona en Vercel serverless (a diferencia de otras como `pdfjs-dist` + `canvas` que NO funcionan).

---

### 2. Actualizar el archivo `/api/documents/ocr-only/route.ts`

#### A. Agregar import de pdf-lib

```typescript
// ANTES (solo tenías esto)
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import OpenAI from "openai"

// DESPUÉS (agregar pdf-lib)
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import OpenAI from "openai"
import { PDFDocument } from "pdf-lib"  // ← NUEVO
```

#### B. Actualizar tipos de archivo permitidos

```typescript
// ANTES
const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

// DESPUÉS
const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]
```

#### C. Aumentar tamaño máximo (opcional, para PDFs grandes)

```typescript
// ANTES
const maxSize = 10 * 1024 * 1024  // 10MB

// DESPUÉS
const maxSize = 15 * 1024 * 1024  // 15MB
```

#### D. Agregar lógica de procesamiento de PDF

Después de obtener el `fileBuffer`, agregar esta lógica:

```typescript
// Convertir a base64
const fileBuffer = await file.arrayBuffer()
let base64Image: string
let mimeType = "image/jpeg"

// ============================================
// NUEVO: Si es PDF, extraer la imagen embebida
// ============================================
if (file.type === "application/pdf") {
  console.log("📄 Procesando PDF...")
  try {
    const extractedImage = await extractImageFromPdf(Buffer.from(fileBuffer))
    if (!extractedImage) {
      return NextResponse.json(
        { error: "No se pudo extraer la imagen del PDF. Asegurate de que el PDF contenga una imagen escaneada del documento." },
        { status: 400 }
      )
    }
    base64Image = extractedImage.base64
    mimeType = extractedImage.mimeType
    console.log(`✅ Imagen extraída del PDF: ${mimeType}, ${Math.round(base64Image.length / 1024)}KB`)
  } catch (error) {
    console.error("❌ Error procesando PDF:", error)
    return NextResponse.json(
      { error: "Error al procesar el PDF. Intentá subir una imagen directamente (JPG, PNG)." },
      { status: 400 }
    )
  }
} else {
  // Imagen normal
  base64Image = Buffer.from(fileBuffer).toString("base64")
  mimeType = file.type
}
```

#### E. Agregar las funciones de extracción de imagen al final del archivo

```typescript
/**
 * Extrae la imagen más grande embebida en un PDF
 * La mayoría de los PDFs de documentos escaneados contienen una imagen JPG o PNG
 */
async function extractImageFromPdf(pdfBuffer: Buffer): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { 
      ignoreEncryption: true,
      updateMetadata: false 
    })
    
    const pages = pdfDoc.getPages()
    if (pages.length === 0) {
      console.log("❌ PDF sin páginas")
      return null
    }

    // Buscar imágenes en todas las páginas (priorizando la primera)
    let largestImage: { base64: string; mimeType: string; size: number } | null = null

    for (const page of pages) {
      // @ts-ignore - Acceder a recursos internos del PDF
      const resources = page.node.Resources()
      if (!resources) continue

      // @ts-ignore
      const xObjects = resources.lookup(PDFDocument.prototype.context?.obj?.('XObject') as any)
      if (!xObjects) continue

      // Iterar sobre los XObjects buscando imágenes
      // @ts-ignore
      const xObjectDict = resources.get(pdfDoc.context.obj('XObject'))
      if (!xObjectDict) continue

      // @ts-ignore
      const keys = xObjectDict.keys()
      for (const key of keys) {
        try {
          // @ts-ignore
          const xObject = xObjectDict.get(key)
          if (!xObject) continue

          // @ts-ignore
          const subtype = xObject.get(pdfDoc.context.obj('Subtype'))
          // @ts-ignore
          if (subtype?.toString() !== '/Image') continue

          // Extraer datos de la imagen
          // @ts-ignore
          const stream = xObject.getContents?.() || xObject.contents
          if (!stream) continue

          // Determinar tipo de imagen
          // @ts-ignore
          const filter = xObject.get(pdfDoc.context.obj('Filter'))
          let mimeType = 'image/jpeg' // Default
          
          if (filter) {
            const filterStr = filter.toString()
            if (filterStr.includes('DCTDecode')) {
              mimeType = 'image/jpeg'
            } else if (filterStr.includes('FlateDecode')) {
              mimeType = 'image/png'
            }
          }

          const imageData = Buffer.from(stream)
          const base64 = imageData.toString('base64')
          const size = imageData.length

          // Guardar si es la más grande
          if (!largestImage || size > largestImage.size) {
            largestImage = { base64, mimeType, size }
          }
        } catch (e) {
          // Continuar con el siguiente objeto
          continue
        }
      }

      // Si encontramos una imagen en la primera página, usarla
      if (largestImage && pages.indexOf(page) === 0) {
        break
      }
    }

    if (largestImage) {
      return { base64: largestImage.base64, mimeType: largestImage.mimeType }
    }

    // Fallback: Si no encontramos imágenes con el método anterior,
    // intentar obtener los bytes raw del PDF y buscar marcadores JPEG/PNG
    console.log("⚠️ No se encontraron imágenes con XObject, intentando extracción directa...")
    
    const extractedImage = extractImageFromRawPdf(pdfBuffer)
    if (extractedImage) {
      return extractedImage
    }

    console.log("❌ No se encontraron imágenes en el PDF")
    return null

  } catch (error) {
    console.error("Error extracting image from PDF:", error)
    
    // Último intento: extracción directa de bytes
    const extractedImage = extractImageFromRawPdf(pdfBuffer)
    if (extractedImage) {
      return extractedImage
    }
    
    return null
  }
}

/**
 * Extrae imágenes directamente de los bytes del PDF buscando marcadores JPEG/PNG
 * Este es un fallback cuando pdf-lib no puede extraer las imágenes con XObject
 */
function extractImageFromRawPdf(pdfBuffer: Buffer): { base64: string; mimeType: string } | null {
  const bytes = pdfBuffer

  // Buscar imágenes JPEG (marcadores SOI y EOI)
  const jpegStart = Buffer.from([0xFF, 0xD8, 0xFF])
  const jpegEnd = Buffer.from([0xFF, 0xD9])

  let startIdx = bytes.indexOf(jpegStart)
  let endIdx = -1
  
  // Encontrar todas las imágenes JPEG y quedarnos con la más grande
  let largestJpeg: Buffer | null = null
  
  while (startIdx !== -1) {
    // Buscar el final de esta imagen JPEG
    endIdx = bytes.indexOf(jpegEnd, startIdx + 3)
    
    if (endIdx !== -1) {
      const jpegData = bytes.slice(startIdx, endIdx + 2)
      
      // Solo considerar imágenes de tamaño razonable (> 10KB)
      if (jpegData.length > 10000 && (!largestJpeg || jpegData.length > largestJpeg.length)) {
        largestJpeg = jpegData
      }
    }
    
    // Buscar la siguiente imagen JPEG
    startIdx = bytes.indexOf(jpegStart, startIdx + 3)
  }

  if (largestJpeg) {
    console.log(`✅ Imagen JPEG encontrada: ${Math.round(largestJpeg.length / 1024)}KB`)
    return {
      base64: largestJpeg.toString('base64'),
      mimeType: 'image/jpeg'
    }
  }

  // Buscar imágenes PNG
  const pngStart = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  const pngEnd = Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82])
  
  startIdx = bytes.indexOf(pngStart)
  if (startIdx !== -1) {
    endIdx = bytes.indexOf(pngEnd, startIdx)
    if (endIdx !== -1) {
      const pngData = bytes.slice(startIdx, endIdx + 8)
      if (pngData.length > 10000) {
        console.log(`✅ Imagen PNG encontrada: ${Math.round(pngData.length / 1024)}KB`)
        return {
          base64: pngData.toString('base64'),
          mimeType: 'image/png'
        }
      }
    }
  }

  return null
}
```

---

### 3. Actualizar el componente `new-customer-dialog.tsx`

#### A. Actualizar el input de archivos

```typescript
// ANTES
<input
  ref={fileInputRef}
  type="file"
  accept="image/jpeg,image/jpg,image/png,image/webp"
  onChange={handleFileUpload}
  className="hidden"
/>

// DESPUÉS
<input
  ref={fileInputRef}
  type="file"
  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
  onChange={handleFileUpload}
  className="hidden"
/>
```

#### B. Actualizar texto descriptivo (opcional)

```typescript
// ANTES
<p className="text-xs text-muted-foreground">
  Subí una foto del DNI o Pasaporte para autocompletar los datos
</p>

// DESPUÉS
<p className="text-xs text-muted-foreground">
  Subí una foto o PDF del DNI o Pasaporte para autocompletar los datos
</p>
```

---

## 📁 Archivo Completo de Referencia

Si preferís reemplazar el archivo completo, copiá el contenido de:

```
maxeva-saas/app/api/documents/ocr-only/route.ts
```

---

## ✅ Checklist de Implementación

- [ ] `npm install pdf-lib`
- [ ] Agregar import de `PDFDocument` de `pdf-lib`
- [ ] Actualizar `allowedTypes` para incluir `"application/pdf"`
- [ ] (Opcional) Aumentar `maxSize` a 15MB
- [ ] Agregar lógica de detección y procesamiento de PDF
- [ ] Agregar función `extractImageFromPdf`
- [ ] Agregar función `extractImageFromRawPdf`
- [ ] Actualizar `accept` del input en el frontend
- [ ] Actualizar texto descriptivo en el frontend
- [ ] Probar con un PDF de DNI/Pasaporte escaneado

---

## 🔍 Cómo Funciona

1. **Usuario sube PDF** → El endpoint detecta que es `application/pdf`
2. **Extracción XObject** → Usa `pdf-lib` para buscar imágenes embebidas en el PDF
3. **Fallback raw bytes** → Si no encuentra con XObject, busca marcadores JPEG/PNG directamente en los bytes
4. **La imagen más grande gana** → Si hay múltiples imágenes, usa la más grande (que generalmente es el documento)
5. **Se envía a OpenAI Vision** → Igual que con una foto normal

---

## ⚠️ Notas Importantes

1. **`pdf-lib` es obligatorio** - Es la única librería que funciona en Vercel serverless
2. **NO usar `pdfjs-dist` + `canvas`** - No son compatibles con Vercel
3. **El PDF debe contener una imagen** - Si el PDF fue generado digitalmente (no escaneado), puede no tener imagen embebida
4. **Los `@ts-ignore` son necesarios** - Para acceder a las estructuras internas del PDF

---

**Fin de la guía**

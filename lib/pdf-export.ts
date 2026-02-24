"use client"

import html2canvas from "html2canvas-pro"
import { jsPDF } from "jspdf"

/**
 * Captura un elemento HTML y lo exporta como PDF multi-página.
 * Usa html2canvas para renderizar el DOM como imagen y jsPDF para generar el PDF.
 */
export async function exportElementToPDF(
  element: HTMLElement,
  filename: string,
  options?: {
    title?: string
    subtitle?: string
  }
) {
  // Clonar el elemento para manipular sin afectar la UI
  const clone = element.cloneNode(true) as HTMLElement

  // Preparar el clone para captura
  clone.style.width = "1100px"
  clone.style.position = "absolute"
  clone.style.left = "-9999px"
  clone.style.top = "0"
  clone.style.backgroundColor = "#ffffff"
  clone.style.padding = "40px"
  clone.style.color = "#0F172A"

  document.body.appendChild(clone)

  try {
    // Esperar a que las imágenes carguen
    await new Promise((resolve) => setTimeout(resolve, 500))

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: 1100,
      windowWidth: 1100,
    })

    // Configurar PDF A4
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10
    const contentWidth = pageWidth - margin * 2

    // Calcular dimensiones de la imagen
    const imgWidth = contentWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // Header en primera página
    const headerHeight = 20
    let yOffset = 0
    const usableHeight = pageHeight - margin * 2

    // Agregar header
    if (options?.title) {
      pdf.setFontSize(20)
      pdf.setFont("helvetica", "bold")
      pdf.text(options.title, margin, margin + 8)

      if (options.subtitle) {
        pdf.setFontSize(10)
        pdf.setFont("helvetica", "normal")
        pdf.setTextColor(100, 116, 139)
        pdf.text(options.subtitle, margin, margin + 15)
        pdf.setTextColor(0, 0, 0)
      }

      // Línea separadora
      pdf.setDrawColor(226, 232, 240)
      pdf.setLineWidth(0.5)
      pdf.line(margin, margin + headerHeight, pageWidth - margin, margin + headerHeight)
    }

    // Convertir canvas a imagen
    const imgData = canvas.toDataURL("image/jpeg", 0.95)

    // Calcular cuántas páginas necesitamos
    const firstPageUsable = usableHeight - (options?.title ? headerHeight + 5 : 0)
    const startY = margin + (options?.title ? headerHeight + 5 : 0)

    // Dividir la imagen en páginas
    const totalImgHeightMM = imgHeight
    let remainingHeight = totalImgHeightMM
    let sourceY = 0 // en mm de la imagen

    // Primera página
    const firstSliceHeight = Math.min(firstPageUsable, remainingHeight)
    const firstSliceRatio = firstSliceHeight / totalImgHeightMM

    // Crop de la imagen para primera página
    const tempCanvas1 = document.createElement("canvas")
    tempCanvas1.width = canvas.width
    tempCanvas1.height = Math.ceil(canvas.height * firstSliceRatio)
    const ctx1 = tempCanvas1.getContext("2d")!
    ctx1.drawImage(
      canvas,
      0, 0, canvas.width, tempCanvas1.height,
      0, 0, canvas.width, tempCanvas1.height
    )

    pdf.addImage(tempCanvas1.toDataURL("image/jpeg", 0.95), "JPEG", margin, startY, imgWidth, firstSliceHeight)

    remainingHeight -= firstSliceHeight
    sourceY = tempCanvas1.height

    // Páginas adicionales
    while (remainingHeight > 1) {
      pdf.addPage()
      const sliceHeight = Math.min(usableHeight, remainingHeight)
      const sliceRatio = sliceHeight / totalImgHeightMM
      const pixelSliceHeight = Math.ceil(canvas.height * sliceRatio)

      const tempCanvas = document.createElement("canvas")
      tempCanvas.width = canvas.width
      tempCanvas.height = Math.min(pixelSliceHeight, canvas.height - sourceY)
      const ctx = tempCanvas.getContext("2d")!
      ctx.drawImage(
        canvas,
        0, sourceY, canvas.width, tempCanvas.height,
        0, 0, canvas.width, tempCanvas.height
      )

      const actualSliceHeight = (tempCanvas.height * imgWidth) / canvas.width
      pdf.addImage(tempCanvas.toDataURL("image/jpeg", 0.95), "JPEG", margin, margin, imgWidth, actualSliceHeight)

      remainingHeight -= sliceHeight
      sourceY += tempCanvas.height
    }

    // Footer en cada página
    const totalPages = pdf.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(148, 163, 184)
      pdf.text(
        `Vibook — ${options?.title || filename} — Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: "center" }
      )
      pdf.text(
        new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" }),
        pageWidth - margin,
        pageHeight - 5,
        { align: "right" }
      )
    }

    pdf.save(`${filename}.pdf`)
  } finally {
    document.body.removeChild(clone)
  }
}

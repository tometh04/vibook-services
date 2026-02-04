import { test, expect } from "@playwright/test"

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD

test.describe("Branding Settings E2E", () => {
  test("full branding flow", async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")

    const timestamp = Date.now()
    const appName = `QA Branding ${timestamp}`
    const senderName = `QA Sender ${timestamp}`
    const companyName = `QA Company ${timestamp}`

    await page.goto("/login")
    await page.getByLabel("Email").fill(adminEmail!)
    await page.getByLabel("Contraseña").fill(adminPassword!)
    await page.getByRole("button", { name: "Iniciar Sesión" }).click()
    await page.waitForURL("**/dashboard", { timeout: 60000 })

    await page.goto("/settings")
    await page.getByRole("tab", { name: "Branding" }).click()
    await expect(page.getByText("Configuración de Branding")).toBeVisible()

    // General tab
    await page.getByLabel("Nombre de la Aplicación").fill(appName)

    // Upload logo / logo oscuro / favicon
    const fileInputs = page.locator('input[type="file"]')
    await fileInputs.nth(0).setInputFiles("e2e/fixtures/logo.png")
    await expect(page.getByText("Archivo subido correctamente")).toBeVisible()

    await fileInputs.nth(1).setInputFiles("e2e/fixtures/logo-dark.png")
    await expect(page.getByText("Archivo subido correctamente")).toBeVisible()

    await fileInputs.nth(2).setInputFiles("e2e/fixtures/favicon.png")
    await expect(page.getByText("Archivo subido correctamente")).toBeVisible()

    // Palette tab
    await page.getByRole("tab", { name: "Paletas" }).click()
    await page.getByRole("button", { name: /Sunset/i }).click()
    await expect(page.locator('input[type="color"]').nth(0)).toHaveValue("#f97316")
    await expect(page.locator('input[type="color"]').nth(1)).toHaveValue("#ef4444")
    await expect(page.locator('input[type="color"]').nth(2)).toHaveValue("#f59e0b")

    // Custom colors
    const setColor = async (index: number, value: string) => {
      const input = page.locator('input[type="color"]').nth(index)
      await input.evaluate((el, val) => {
        const inputEl = el as HTMLInputElement
        inputEl.value = val as string
        inputEl.dispatchEvent(new Event("input", { bubbles: true }))
        inputEl.dispatchEvent(new Event("change", { bubbles: true }))
      }, value)
    }
    await setColor(0, "#112233")
    await setColor(1, "#445566")
    await setColor(2, "#778899")

    // Contact tab
    await page.getByRole("tab", { name: "Contacto" }).click()
    await page.getByLabel("Nombre del Remitente").fill(senderName)
    await page.getByLabel("Email del Remitente").fill(`qa.sender.${timestamp}@vibook.ai`)
    await page.getByLabel("Email de Soporte").fill(`soporte.${timestamp}@vibook.ai`)
    await page.getByLabel("Teléfono de Soporte").fill("+54 11 5555-1111")
    await page.getByLabel("WhatsApp de Soporte").fill("+5491155551111")
    await page.getByLabel("Sitio Web").fill("https://qa.vibook.ai")
    await page.getByLabel("Instagram").fill("https://instagram.com/vibookqa")
    await page.getByLabel("Facebook").fill("https://facebook.com/vibookqa")

    // Receipts tab
    await page.getByRole("tab", { name: "Recibos" }).click()
    await page.getByLabel("Razón Social").fill(companyName)
    await page.getByLabel("CUIT / Tax ID").fill("30-12345678-9")
    await page.getByLabel("Dirección").fill("Av. Libertador 1234")
    await page.getByLabel("Dirección (opcional)").fill("Piso 4, Oficina 12")
    await page.getByLabel("Ciudad").fill("Buenos Aires")
    await page.getByLabel("Provincia / Estado").fill("Buenos Aires")
    await page.getByLabel("Código Postal").fill("C1428")
    await page.getByLabel("País").fill("Argentina")
    await page.getByLabel("Teléfono Comercial").fill("+54 11 5555-2222")
    await page.getByLabel("Email Comercial").fill(`admin.${timestamp}@vibook.ai`)

    // Save
    await page.getByRole("button", { name: "Guardar Cambios" }).click()
    await expect(page.getByText("Branding guardado correctamente")).toBeVisible()

    // Reload and verify persistence
    await page.reload()
    await page.getByRole("tab", { name: "Branding" }).click()
    await expect(page.getByLabel("Nombre de la Aplicación")).toHaveValue(appName)

    await page.getByRole("tab", { name: "Paletas" }).click()
    await expect(page.locator('input[type="color"]').nth(0)).toHaveValue("#112233")
    await expect(page.locator('input[type="color"]').nth(1)).toHaveValue("#445566")
    await expect(page.locator('input[type="color"]').nth(2)).toHaveValue("#778899")

    await page.getByRole("tab", { name: "Contacto" }).click()
    await expect(page.getByLabel("Nombre del Remitente")).toHaveValue(senderName)

    await page.getByRole("tab", { name: "Recibos" }).click()
    await expect(page.getByLabel("Razón Social")).toHaveValue(companyName)
  })
})

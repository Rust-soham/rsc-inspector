import { expect, test } from "@playwright/test"

test("renders server/client boundary overlays from the live React tree", async ({
  page,
}) => {
  const errors: Array<string> = []
  page.on("pageerror", (error) => errors.push(error.message))

  await page.goto("/")
  await page.waitForFunction(() => window.__RSC_INSPECTOR_RUNTIME__ !== undefined)
  await page.keyboard.press("Alt+Shift+R")

  const labels = page.locator(
    "[data-rsc-inspector-root] .rsc-inspector-label",
  )
  const diagnostics = await page.evaluate(() => {
    const host = document.querySelector<HTMLElement>("[data-rsc-inspector-root]")
    return {
      hasHost: host !== null,
      shadowText: host?.shadowRoot?.textContent ?? null,
    }
  })
  await expect(labels.first(), {
    message: JSON.stringify({ diagnostics, errors }, null, 2),
  }).toBeVisible()

  const text = await labels.allTextContents()
  expect(text.some((label) => label.includes("client-boundary"))).toBe(true)
  expect(text.some((label) => label.includes("server"))).toBe(true)
  expect(errors).toEqual([])
})

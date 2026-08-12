import { chromium } from "@playwright/test"

const targets = [
  ["next16-commerce", "http://127.0.0.1:3201/"],
  ["next16-social-media", "http://127.0.0.1:3202/"],
  ["next-beats", "http://127.0.0.1:3203/"],
]

const browser = await chromium.launch({ headless: true })

for (const [name, url] of targets) {
  const page = await browser.newPage()
  const pageErrors = []
  page.on("pageerror", (error) => pageErrors.push(error.message))

  let response = null
  let navigationError = null
  try {
    response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page
      .waitForFunction(() => window.__RSC_INSPECTOR_RUNTIME__ !== undefined, null, {
        timeout: 30_000,
      })
      .catch(() => undefined)
    await page.keyboard.press("Alt+Shift+X")
    await page.waitForTimeout(1_000)
  } catch (error) {
    navigationError = String(error)
  }

  const result = await page.evaluate(() => {
    const host = document.querySelector("[data-rsc-inspector-root]")
    const labels = Array.from(
      host?.shadowRoot?.querySelectorAll(".rsc-inspector-label") ?? [],
      (element) => ({
        text: element.textContent ?? "",
        kind:
          element instanceof HTMLElement
            ? element.dataset.rscBoundaryKind
            : undefined,
      }),
    )
    return {
      title: document.title,
      inspectorInstalled: host !== null,
      labelCount: labels.length,
      boundaryKinds: Array.from(
        new Set(labels.map((label) => label.kind)),
      ).sort(),
      sampleLabels: labels.slice(0, 8).map((label) => label.text),
    }
  })

  console.log(
    JSON.stringify({
      name,
      url,
      status: response?.status() ?? null,
      navigationError,
      pageErrors,
      ...result,
    }),
  )
  await page.close()
}

await browser.close()

import { chromium } from "@playwright/test"

const allTargets = [
  {
    name: "next16-social-media",
    url: "http://127.0.0.1:3202/",
    navigate: async (page) => {
      const search = page.locator('[data-navlink-href="/search"]').first()
      if (await search.isVisible()) {
        await search.click()
        await page.waitForURL(/\/search(?:\?|$)/)
      }
    },
  },
  {
    name: "next-beats",
    url: "http://localhost:3203/login",
    navigate: async (page) => {
      const email = page.getByLabel("Demo email")
      if (await email.isVisible()) {
        await email.fill("nested-test@example.com")
        await page.getByRole("button", { name: "Sign in" }).click()
        await page.waitForURL((url) => url.pathname === "/")
      }
    },
    interact: async (page) => {
      const search = page.locator('aside a[aria-label="Search"]').first()
      if (await search.isVisible()) {
        await search.click()
        await page.waitForURL(/\/search(?:\?|$)/)
      }
    },
  },
]

const requestedTarget = process.argv[2]
const targets = requestedTarget
  ? allTargets.filter((target) => target.name === requestedTarget)
  : allTargets

if (targets.length === 0) {
  throw new Error(`Unknown stress target: ${requestedTarget}`)
}

const browser = await chromium.launch({ headless: true })

const applicationGeometry = (page) =>
  page.evaluate(() => {
    const root = document.querySelector("main") ?? document.body
    const rect = root.getBoundingClientRect()
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    }
  })

const inspectorMetrics = (page) =>
  page.evaluate(() => {
    const host = document.querySelector("[data-rsc-inspector-root]")
    const root = host?.shadowRoot
    const regions = Array.from(
      root?.querySelectorAll(".rsc-inspector-region") ?? [],
    ).map((region) => {
      const rect = region.getBoundingClientRect()
      return {
        name:
          region instanceof HTMLElement
            ? region.dataset.rscComponentName ?? ""
            : "",
        kind:
          region instanceof HTMLElement
            ? region.dataset.rscBoundaryKind ?? ""
            : "",
        compact:
          region instanceof HTMLElement && region.dataset.compact === "true",
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }
    })
    const keys = regions.map(
      (region) =>
        `${region.kind}:${region.x}:${region.y}:${region.width}:${region.height}`,
    )
    const viewportArea = window.innerWidth * window.innerHeight
    return {
      installed: host !== null,
      togglePressed:
        root
          ?.querySelector("#rsc-inspector-toggle")
          ?.getAttribute("aria-pressed") ?? null,
      count: regions.length,
      kinds: Array.from(new Set(regions.map((region) => region.kind))).sort(),
      duplicateCount: keys.length - new Set(keys).size,
      zeroAreaCount: regions.filter(
        (region) => region.width <= 0 || region.height <= 0,
      ).length,
      compactCount: regions.filter((region) => region.compact).length,
      viewportScaleCount: regions.filter(
        (region) => region.width * region.height >= viewportArea * 0.9,
      ).length,
      frameworkNames: regions
        .map((region) => region.name)
        .filter((name) =>
          [
            "AppRouter",
            "HeadManagerContext",
            "OuterLayoutRouter",
            "RootLayout",
            "Router",
          ].includes(name),
        ),
      sampleNames: regions.slice(0, 20).map((region) => region.name),
    }
  })

for (const target of targets) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const pageErrors = []
  page.on("pageerror", (error) => pageErrors.push(error.message))

  const response = await page.goto(target.url, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  })
  await page.waitForFunction(
    () => document.querySelector("[data-rsc-inspector-root]") !== null,
    null,
    { timeout: 30_000 },
  )

  const geometryOff = await applicationGeometry(page)
  await page.keyboard.press("Alt+Shift+X")
  const enabledAt = Date.now()
  await page.waitForFunction(() => {
    const host = document.querySelector("[data-rsc-inspector-root]")
    return (
      (host?.shadowRoot?.querySelectorAll(".rsc-inspector-region").length ?? 0) >
      0
    )
  })
  const firstRegionsAfterMs = Date.now() - enabledAt
  const initial = await inspectorMetrics(page)
  const geometryOn = await applicationGeometry(page)

  await target.navigate(page)
  await page.waitForTimeout(500)
  const afterNavigation = await inspectorMetrics(page)

  await target.interact?.(page)
  await page.waitForTimeout(500)
  const afterInteraction = await inspectorMetrics(page)
  await page.screenshot({
    path: `/tmp/rsc-inspector-${target.name}-desktop.png`,
    fullPage: true,
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(300)
  const afterResize = await inspectorMetrics(page)
  await page.screenshot({
    path: `/tmp/rsc-inspector-${target.name}-mobile.png`,
    fullPage: true,
  })

  await page.keyboard.press("Alt+Shift+X")
  await page.waitForTimeout(100)
  const afterDisable = await inspectorMetrics(page)

  console.log(
    JSON.stringify({
      name: target.name,
      status: response?.status() ?? null,
      finalUrl: page.url(),
      geometryStable: JSON.stringify(geometryOff) === JSON.stringify(geometryOn),
      firstRegionsAfterMs,
      initial,
      afterNavigation,
      afterInteraction,
      afterResize,
      afterDisable,
      pageErrors,
    }),
  )

  await page.close()
}

await browser.close()

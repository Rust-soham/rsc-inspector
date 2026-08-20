import { expect, test } from "@playwright/test"

test("renders server/client boundary overlays from the live React tree", async ({
  page,
}) => {
  const errors: Array<string> = []
  page.on("pageerror", (error) => errors.push(error.message))

  await page.goto("/")
  await page.waitForFunction(
    () => document.querySelector("[data-rsc-inspector-root]") !== null,
  )

  const toggle = page.locator("[data-rsc-inspector-root] #rsc-inspector-toggle")
  await expect(toggle).toHaveAttribute(
    "title",
    "Toggle server/client boundaries (Alt + Shift + X)",
  )
  await page.keyboard.press("Alt+Shift+X")
  await expect(toggle).toHaveAttribute("aria-pressed", "true")

  const regions = page.locator(
    "[data-rsc-inspector-root] .rsc-inspector-region",
  )
  const diagnostics = await page.evaluate(() => {
    const host = document.querySelector<HTMLElement>("[data-rsc-inspector-root]")
    return {
      hasHost: host !== null,
      hasNodeProcess: Reflect.get(globalThis, "process") !== undefined,
      shadowText: host?.shadowRoot?.textContent ?? null,
    }
  })
  await expect(regions, {
    message: JSON.stringify({ diagnostics, errors }, null, 2),
  }).not.toHaveCount(0)
  await expect(
    page.locator(
      '[data-rsc-inspector-root] [data-presentation="card"] > .rsc-inspector-label',
    ),
  ).not.toHaveCount(0)
  await expect(
    page.locator(
      '[data-rsc-inspector-root] [data-presentation="compact"] .rsc-inspector-label',
    ),
  ).toHaveCount(0)
  const kinds = await regions.evaluateAll((elements) =>
    elements.map((element) =>
      element instanceof HTMLElement
        ? element.dataset.rscBoundaryKind
        : undefined,
    ),
  )
  expect(kinds).toContain("client-boundary")
  expect(kinds).toContain("server-slot")
  expect(kinds).not.toContain("server-subtree")
  expect(kinds).not.toContain("client-subtree")
  expect(
    kinds.every(
      (kind) => kind === "client-boundary" || kind === "server-slot",
    ),
  ).toBe(true)
  const geometryKeys = await regions.evaluateAll((elements) =>
    elements.map((element) => {
      const rectangle = element.getBoundingClientRect()
      return `${rectangle.x}:${rectangle.y}:${rectangle.width}:${rectangle.height}`
    }),
  )
  expect(new Set(geometryKeys).size).toBe(geometryKeys.length)
  const componentNames = await regions.evaluateAll((elements) =>
    elements.map((element) =>
      element instanceof HTMLElement
        ? element.dataset.rscComponentName
        : undefined,
    ),
  )
  expect(componentNames).not.toContain("RootLayout")
  expect(componentNames).not.toContain("OuterLayoutRouter")
  expect(diagnostics.hasNodeProcess).toBe(false)
  expect(errors).toEqual([])
})

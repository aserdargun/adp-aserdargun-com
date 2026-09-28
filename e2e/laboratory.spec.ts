import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Expected strings come from the lab's own canonical sources, never from prose
// invented here: the manifest owns routes, titles and the evidence policy.
const manifest = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../lab.manifest.json", import.meta.url)),
    "utf8",
  ),
) as {
  tagline: Record<string, string>;
  experiments: { id: string; title: Record<string, string>; route: string }[];
  lessons: { id: string; route: string }[];
  evidencePolicy: { allowedKinds: string[] };
  evidence: { kind: string }[];
};

const experiment = (id: string) => {
  const found = manifest.experiments.find((x) => x.id === id);
  if (!found) throw new Error(`Unknown manifest experiment: ${id}`);
  return found;
};

/** Presses Tab until the target control holds focus, proving tab order reaches it. */
async function tabTo(page: Page, selector: string) {
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    if (
      await page
        .locator(selector)
        .evaluate((el) => el === document.activeElement)
        .catch(() => false)
    )
      return;
  }
  throw new Error(`Tab order never reached ${selector}`);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // The page heading is app copy rather than a manifest string, so the contract
  // asserted here is structural: exactly one visible level-1 heading.
  await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
});

test("every manifest scenario route selects its own experiment and heading", async ({
  page,
}) => {
  for (const declared of manifest.experiments) {
    await page.goto(declared.route);
    await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
    // The experiment select is the routing surface; both its value and its
    // option label must follow the manifest, not a second hardcoded list.
    const select = page.getByLabel("Experiment scenario");
    await expect(select).toHaveValue(declared.id);
    await expect(select.locator(`option[value="${declared.id}"]`)).toHaveText(
      declared.title.en,
    );
    await expect(page.locator("nav.tabs button[aria-current]")).toHaveCount(1);
  }
});

test("the guided lesson route opens the Adaptation 101 surface", async ({
  page,
}) => {
  const lesson = manifest.lessons[0];
  await page.goto(lesson.route);
  const panel = page.getByRole("region", { name: "Adaptation 101" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { level: 2 })).not.toBeEmpty();
  await expect(
    panel.getByRole("button", { name: "Next chapter" }),
  ).toBeVisible();
});

test("the language controls change the rendered locale in both directions", async ({
  page,
}) => {
  const heading = page.getByRole("heading", { level: 1 });
  const english = await heading.innerText();
  await page.getByRole("button", { name: "TR", exact: true }).click();
  await expect(heading).not.toHaveText(english);
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  await expect(page).toHaveURL(/[?&]lang=tr(&|$)/);
  // A localized control label, not just a heading swap.
  await expect(page.getByLabel("Deney senaryosu")).toBeVisible();

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(heading).toHaveText(english);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.goto("/?lang=tr");
  await expect(heading).not.toHaveText(english);
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
});

test("the primary simulation controls are reachable and operable by keyboard alone", async ({
  page,
}) => {
  await page.goto(experiment("domain").route);
  const status = page.locator(".run-status");
  await expect(status).not.toContainText("t0");

  // Step is the control that advances a run under the reduced-motion setting
  // this suite runs with, so it is the keyboard contract worth asserting.
  await tabTo(page, '[data-ils-action="step"]');
  await page.keyboard.press("Enter");
  await expect(status).toContainText("t0");
  await page.keyboard.press("Enter");
  await expect(status).toContainText("t1");

  // Reset is the paired control and must be equally keyboard-operable.
  await tabTo(page, '[data-ils-action="reset"]');
  await page.keyboard.press("Enter");
  await expect(status).not.toContainText("t1");
});

test("playback is not silently started when reduced motion is requested", async ({
  page,
}) => {
  await page.goto(experiment("domain").route);
  // The lab refuses autoplay under reduced motion and says so, rather than
  // running a training animation the user did not ask for.
  await page.locator('[data-ils-action="play"]').click();
  await expect(page.locator('p.notice[role="status"]').first()).not.toBeEmpty();
  await expect(page.locator('[data-ils-action="pause"]')).toHaveCount(0);
});

test("the mode tabs are operable by keyboard alone", async ({ page }) => {
  const memory = page.getByRole("button", { name: "Memory", exact: true });
  await tabTo(page, 'nav.tabs button:has-text("Memory")');
  await page.keyboard.press("Enter");
  await expect(memory).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("memory-total")).toBeVisible();
});

test("rendered evidence never claims a kind the evidence policy forbids", async ({
  page,
}) => {
  await page.goto(experiment("memory").route);
  await page.getByRole("button", { name: "Memory", exact: true }).click();
  // The shared shell exposes each evidence record's kind as a data attribute,
  // so this checks the shipped contract instead of any numeric result.
  const kinds = await page
    .locator("[data-evidence-kind]")
    .evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-evidence-kind")),
    );
  expect(kinds.length).toBeGreaterThan(0);
  for (const kind of kinds) {
    expect(manifest.evidencePolicy.allowedKinds).toContain(kind);
    expect(kind).not.toBe("measured");
  }
  for (const record of manifest.evidence) {
    expect(manifest.evidencePolicy.allowedKinds).toContain(record.kind);
    expect(record.kind).not.toBe("measured");
  }
  await expect(page.locator(".ils-policy")).not.toBeEmpty();
});

test("desktop and mobile viewports render without horizontal overflow", async ({
  page,
}) => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await page.goto(experiment("overfit").route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel("Experiment scenario")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(size.width);
  }
});

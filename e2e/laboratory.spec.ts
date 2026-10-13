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

/* README.md:42 promises "up to three immutable session snapshots, preserved on
   reload; full reproducible JSON export", and README.md:46 lists the five
   decision dimensions the comparison includes. CompareLab is the lab's actual
   product - it is titled "Compare decisions, not just scores" - yet the whole
   save -> compare -> export journey had no coverage at all: grepping e2e/ for
   compare|save|export returned nothing, and no unit test reaches App.tsx.

   The cap matters most because it is written twice, differently: App.tsx:216
   refuses with `runs.length === 3` while core/session.ts:31 drops the overflow
   with `runs.length >= 3`, and only the codec copy was tested (against the codec
   directly, so it masked the divergence). Raising the UI copy to >= 5 would let
   a fourth run be saved and shown, then silently dropped on the next reload. */
async function evaluateAndSave(page: Page) {
  await page.getByRole("button", { name: "Complete training" }).click();
  await page.getByRole("button", { name: "Evaluate checkpoint" }).click();
  // EvaluationLab also carries "Save run for comparison", so the exact name is
  // what selects the toolbar control.
  await page.getByRole("button", { name: "Save run", exact: true }).click();
}

test("a saved run becomes a durable compare entry with a reproducible export", async ({
  page,
}) => {
  await page.goto(experiment("domain").route);

  // Empty state before anything is saved.
  await page.locator('nav.tabs button:has-text("Compare")').click();
  await expect(
    page.getByRole("heading", { name: "Your experiment notebook is empty" }),
  ).toBeVisible();

  await evaluateAndSave(page);
  await expect(page.locator("p.notice[role=status]")).toContainText(
    "ADP-RUN-001 saved",
  );
  await expect(
    page.getByRole("heading", { name: "Compare decisions, not just scores" }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: /ADP-RUN-001/ }),
  ).toBeVisible();

  // The five decision dimensions README.md:46 claims the comparison includes.
  for (const row of [
    "Learning rate",
    "Data preparation",
    "Train / test integrity",
    "Device / memory fit",
    "Gradient checkpointing",
  ])
    await expect(page.getByRole("rowheader", { name: row })).toBeVisible();

  // Export contract, read from the accessible fallback the UI provides rather
  // than from a download event.
  await page.getByRole("button", { name: "Export reproducible JSON" }).click();
  const exported = JSON.parse(
    await page.getByLabel("Reproducible experiment JSON").inputValue(),
  );
  expect(exported.kind).toBe("ADP synthetic educational experiments");
  expect(exported.version).toBe("adp-core-1");
  expect(exported.runs).toHaveLength(1);
  expect(exported.runs[0].id).toBe("ADP-RUN-001");

  // "preserved on reload": the snapshot survives a real browser reload.
  await page.reload();
  await expect(
    page.getByRole("columnheader", { name: /ADP-RUN-001/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("rowheader", { name: "Learning rate" }),
  ).toBeVisible();
});

test("the notebook refuses a fourth snapshot, so the UI cap and the codec agree", async ({
  page,
}) => {
  await page.goto(experiment("domain").route);
  await evaluateAndSave(page); // ADP-RUN-001
  for (const id of ["quality", "overfit", "memory"]) {
    await page.getByLabel("Experiment scenario").selectOption(id);
    await evaluateAndSave(page);
  }
  await expect(
    page.locator('nav.tabs button:has-text("Compare")'),
  ).toContainText("3");
  await expect(
    page.getByRole("columnheader", { name: /ADP-RUN-003/ }),
  ).toBeVisible();

  // A fourth save is refused in the UI and never reaches storage.
  await page.getByLabel("Experiment scenario").selectOption("rank");
  await evaluateAndSave(page);
  await expect(page.locator("p.notice[role=status]")).toContainText(
    "Three runs saved. Remove one to save another.",
  );
  await expect(
    page.getByRole("columnheader", { name: /ADP-RUN-004/ }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("columnheader", { name: /ADP-RUN-003/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: /ADP-RUN-004/ }),
  ).toHaveCount(0);
});

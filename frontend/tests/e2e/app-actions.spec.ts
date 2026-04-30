import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL ?? "demo@example.com";
const password = process.env.E2E_PASSWORD ?? "Password123!";

test.describe("AgriConto Pro actionable UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Accedi" }).click();
    await expect(page.getByText("Cruscotto aziendale")).toBeVisible();
  });

  test("quick add expense opens a real form with validation", async ({ page }) => {
    await page.getByRole("button", { name: "Nuova spesa" }).first().click();
    await expect(page).toHaveURL(/spese/);
    await expect(page.getByRole("heading", { name: "Nuova spesa" })).toBeVisible();
    await page.getByLabel("Categoria").fill("");
    await page.getByRole("button", { name: "Salva" }).click();
    await expect(page.getByText("Controlla i dati")).toBeVisible();
  });

  test("reports preview and analytics saved view actions respond", async ({ page }) => {
    await page.goto("/report");
    await expect(page.getByRole("button", { name: "Anteprima" }).first()).toBeVisible();

    await page.goto("/statistiche");
    await page.getByRole("button", { name: "Salva vista" }).click();
    await expect(page.getByText("Vista salvata")).toBeVisible();
  });
});

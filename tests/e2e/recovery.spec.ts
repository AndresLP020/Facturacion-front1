import { expect, test } from "@playwright/test";

test("recovered frontend renders the sandbox login", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Bienvenido" }),
  ).toBeVisible();
  await expect(page.getByText("SANDBOX · timbrado ficticio", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
});

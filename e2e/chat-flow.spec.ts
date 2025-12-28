import { test, expect } from '@playwright/test';

test.describe('Adaptive Learning Chat Flow', () => {
  test('User can send a message and receive a structured response', async ({ page }) => {
    // 1. Landing
    await page.goto('/');
    console.log('Navigated');
    // await expect(page).toHaveTitle(/Active Learning System/);
    await expect(page.getByText('内部状態投影装置')).toBeVisible();
    
    // 2. Interaction
    const input = page.getByPlaceholder('現在の迷いや学習意図を入力してください...');
    await expect(input).toBeVisible();
    await input.fill('Python学習');
    console.log('Filled input');
    
    // Button text is '投影開始'
    await page.getByRole('button', { name: '投影開始' }).click();
    console.log('Clicked send');

    // 3. Verify User Input (Note: There is no user message bubble in the new UI, only the projection result)
    // The previous test expected a chat bubble. The new UI projects a 'ProjectionPage'.
    // We should wait for the Loading state to disappear or the Projection to appear.
    
    // 4. Wait for AI Response (Projection)
    console.log('Waiting for AI response...');
    // Only checking if the projection map (Layer 1) appears, or the system state indicator
    await expect(page.getByText('System State:')).toBeVisible({ timeout: 30000 });
    console.log('Verified AI response');
    
    // Check for some projection content
    // Layer 1 is Layer1_Map.
    const container = page.locator('section').first();
    await expect(container).toBeVisible();
  });
});

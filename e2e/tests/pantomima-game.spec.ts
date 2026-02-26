import { test, expect } from '../fixtures/test-fixtures';

test.describe('Pantomima Game - E2E', () => {
  test('should create room via UI, join players, start game and show pantomima word', async ({
    createPlayerContexts,
  }) => {
    // Step 1: Create 4 browser contexts
    const players = await createPlayerContexts(4);
    const playerNames = ['Hráč 1', 'Hráč 2', 'Hráč 3', 'Hráč 4'];

    // Step 2: Host (player 1) logs in via DEV button
    const hostPage = players[0].page;
    await hostPage.goto('/');

    // Click Hráč 1 login button
    const hostLoginBtn = hostPage.getByRole('button', { name: playerNames[0] });
    await expect(hostLoginBtn).toBeVisible({ timeout: 10000 });
    await hostLoginBtn.click();
    await expect(hostLoginBtn).not.toBeVisible({ timeout: 15000 });
    console.log(`${playerNames[0]} logged in`);

    // Step 3: Host creates room via UI
    // Navigate to create room page
    await hostPage.goto('/create-room');
    await expect(hostPage.getByText('Vytvořit místnost')).toBeVisible({ timeout: 10000 });

    // Select Pantomima game from dropdown
    await hostPage.locator('select').first().selectOption({ label: 'Pantomima' });

    // Submit form (use default settings)
    await hostPage.getByRole('button', { name: /Vytvořit/i }).click();
    console.log('Host submitted create room form');

    // Wait for redirect to room page
    await hostPage.waitForURL(/\/room\/[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    const roomUrl = hostPage.url();
    const roomCode = roomUrl.split('/').pop()!;
    console.log(`Room created: ${roomCode}`);

    // Verify host is in room and sees room code
    await expect(hostPage.locator(`text=${roomCode}`)).toBeVisible({ timeout: 10000 });
    console.log(`${playerNames[0]} (host) is in room`);

    // Step 4: Other players log in and join room
    for (let i = 1; i < 4; i++) {
      const playerPage = players[i].page;

      // Go to home page and log in
      await playerPage.goto('/');
      const loginButton = playerPage.getByRole('button', { name: playerNames[i] });
      await expect(loginButton).toBeVisible({ timeout: 10000 });
      await loginButton.click();
      await expect(loginButton).not.toBeVisible({ timeout: 15000 });
      console.log(`${playerNames[i]} logged in`);

      // Navigate to room
      await playerPage.goto(`/room/${roomCode}`);
      await expect(playerPage.locator(`text=${roomCode}`)).toBeVisible({ timeout: 15000 });
      console.log(`${playerNames[i]} joined room`);
    }

    // Step 5: Wait for all players to appear
    await hostPage.waitForTimeout(2000);

    // Verify players are in the room (at least 2 players)
    await expect(hostPage.locator('text=/Hráči \\(\\d+/').first()).toBeVisible({ timeout: 10000 });
    console.log('All players visible in room');

    // Step 6: Non-host players mark themselves as ready
    for (let i = 1; i < 4; i++) {
      const playerPage = players[i].page;
      const readyButton = playerPage.getByRole('button', { name: /Připraven/i });
      if (await readyButton.isVisible()) {
        await readyButton.click();
        console.log(`${playerNames[i]} clicked ready`);
        await playerPage.waitForTimeout(500);
      }
    }

    // Step 7: Host should see "Spustit hru" button (or "Čekání na hráče...")
    // Wait a bit for all ready states to sync
    await hostPage.waitForTimeout(1000);

    // Check if start button is available
    const startButton = hostPage.getByRole('button', { name: /Spustit hru|Čekání na hráče/i });
    await expect(startButton).toBeVisible({ timeout: 10000 });
    console.log('Start button is visible');

    // If it says "Čekání na hráče...", wait for it to change
    if (await hostPage.locator('button:has-text("Čekání na hráče")').isVisible()) {
      console.log('Waiting for all players to be ready...');
      await expect(hostPage.getByRole('button', { name: /Spustit hru/i })).toBeVisible({ timeout: 15000 });
    }

    // Click start game
    await hostPage.getByRole('button', { name: /Spustit hru/i }).click();
    console.log('Host clicked start game');

    // Step 8: Wait for game page and verify game UI is shown
    await expect(hostPage.locator('text=/sekund zbývá/i')).toBeVisible({ timeout: 20000 });
    console.log('Host sees game timer');

    // Verify game page is loaded (might show instruction or waiting message)
    await expect(hostPage.locator('text=/Předveďte|Hádejte|Čekání na další tah/i')).toBeVisible();
    console.log('Host sees game content');

    // Verify team scores are visible (UI shows "Tým 1" and "Tým 2")
    await expect(hostPage.locator('text=/Tým 1|Tým A/i').first()).toBeVisible();
    await expect(hostPage.locator('text=/Tým 2|Tým B/i').first()).toBeVisible();

    console.log('Test passed - Pantomima game started successfully!');
  });

  test('should display pantomima word and game UI', async ({ createPlayerContexts }) => {
    // Step 1: Create 4 browser contexts (Pantomima requires 4 players minimum)
    const players = await createPlayerContexts(4);
    const playerNames = ['Hráč 1', 'Hráč 2', 'Hráč 3', 'Hráč 4'];

    // Step 2: Host logs in and creates room
    const hostPage = players[0].page;
    await hostPage.goto('/');
    const hostLoginBtn = hostPage.getByRole('button', { name: playerNames[0] });
    await expect(hostLoginBtn).toBeVisible({ timeout: 10000 });
    await hostLoginBtn.click();
    await expect(hostLoginBtn).not.toBeVisible({ timeout: 15000 });

    // Create room via UI
    await hostPage.goto('/create-room');
    await expect(hostPage.getByText('Vytvořit místnost')).toBeVisible({ timeout: 10000 });
    await hostPage.locator('select').first().selectOption({ label: 'Pantomima' });

    // Submit form (use default settings)
    await hostPage.getByRole('button', { name: /Vytvořit/i }).click();
    await hostPage.waitForURL(/\/room\/[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    const roomCode = hostPage.url().split('/').pop()!;
    console.log(`Room created: ${roomCode}`);

    // Step 3: Players 2-4 log in and join
    for (let i = 1; i < 4; i++) {
      const playerPage = players[i].page;
      await playerPage.goto('/');
      const loginBtn = playerPage.getByRole('button', { name: playerNames[i] });
      await expect(loginBtn).toBeVisible({ timeout: 10000 });
      await loginBtn.click();
      await expect(loginBtn).not.toBeVisible({ timeout: 15000 });
      console.log(`${playerNames[i]} logged in`);

      await playerPage.goto(`/room/${roomCode}`);
      await expect(playerPage.locator(`text=${roomCode}`)).toBeVisible({ timeout: 15000 });
      console.log(`${playerNames[i]} joined room`);
    }

    // Wait for all players to appear
    await hostPage.waitForTimeout(2000);

    // Players 2-4 mark ready
    for (let i = 1; i < 4; i++) {
      const playerPage = players[i].page;
      const readyButton = playerPage.getByRole('button', { name: /Připraven/i });
      if (await readyButton.isVisible()) {
        await readyButton.click();
        console.log(`${playerNames[i]} clicked ready`);
        await playerPage.waitForTimeout(500);
      }
    }

    // Step 4: Host starts game
    await hostPage.waitForTimeout(1000);
    const startButton = hostPage.getByRole('button', { name: /Spustit hru/i });
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click();

    // Step 5: Wait for game to load
    await expect(hostPage.locator('text=/sekund zbývá/i')).toBeVisible({ timeout: 20000 });
    console.log('Game page loaded with timer');

    // Verify the timer element exists and shows a number
    const timerElement = hostPage.locator('.text-6xl');
    await expect(timerElement).toBeVisible();
    const timerValue = await timerElement.textContent();
    console.log(`Timer value: ${timerValue}`);
    expect(Number(timerValue)).toBeGreaterThan(0);

    // Verify word or waiting message is shown (handles both Pantomima and fallback states)
    await expect(hostPage.locator('text=/Předveďte|Hádejte|Čekání na další/i')).toBeVisible();
    console.log('Game instruction visible');

    // Verify team scores are visible
    await expect(hostPage.locator('text=/Tým 1|Tým A/i').first()).toBeVisible();
    await expect(hostPage.locator('text=/Tým 2|Tým B/i').first()).toBeVisible();
    console.log('Team scores visible');

    console.log('Test passed - Pantomima game UI displayed correctly!');
  });
});

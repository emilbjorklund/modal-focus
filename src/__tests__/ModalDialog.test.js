describe('ModalDialog', () => {
    beforeAll(async () => {
        await page.goto('http://localhost:4033');
    })

    it('shows modal 1 when clicking button', async () => {
        await expect(page).toClick('button', 'Activate Modal');
        await expect(page).toMatchElement('modal-dialog#my-modal', {
            visible: true
        });
    });

    it('shows modal 1, then modal 2 when clicking button sequence', async () => {
        await expect(page).toClick('button', 'Activate Modal');
        await expect(page).toMatchElement('modal-dialog#my-modal', {
            visible: true
        });
        await expect(page).toClick('[data-modal-replace="my-other-modal"]');
        await expect(page).toMatchElement('modal-dialog#my-modal', {
            visible: false
        });
        await expect(page).toMatchElement('modal-dialog#my-other-modal', {
            visible: true
        });
    });

    it('focuses opener button after closing first modal using ESC key', async () => {
        await expect(page).toClick('button', 'Activate Modal');
        await page.keyboard.up('Escape');
        await expect(page).toMatchElement('button#activate:focus', {
            polling: 'raf'
        });
    });

    it('focuses opener button after closing first modal using button', async () => {
        await expect(page).toClick('button#activate');
        await expect(page).toMatchElement('button[data-modal-dismiss]');
        await page.waitForTimeout(500);
        await page.click('button[data-modal-dismiss]');
        await expect(page).toMatchElement('button#activate:focus', {
            polling: 'raf'
        });
    });
})
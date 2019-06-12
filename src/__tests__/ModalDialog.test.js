describe('ModalDialog', () => {
    beforeAll(async () => {
        await page.goto('http://localhost:4033');
    })

    it('show modal 1 when clicking button', async () => {
        await expect(page).toClick('button', 'Activate Modal');
        await expect(page).toMatchElement('modal-dialog#my-modal', {
            visible: true
        });
    });

    it('show modal 1, then modal 2 when clicking button sequence', async () => {
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

    it('focus opener button after closing first modal', async () => {
        await expect(page).toClick('button', 'Activate Modal');
        await expect(page).toClick('button[data-dismiss-modal]');
        await expect(page).toMatchElement('button[data-modal-trigger="my-modal"]:focus');
    });
})
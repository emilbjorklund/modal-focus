import ModalDialogFactory from './ModalDialog.js';
import ModalControllerFactory from './ModalController.js';

const ModalDialog = ModalDialogFactory();
const ModalController = ModalControllerFactory();

window.customElements.define('modal-dialog', ModalDialog);
window.customElements.define('modal-controller', ModalController);
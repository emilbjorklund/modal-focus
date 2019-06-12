export default function ModalControllerFactory({
    classNames = {
        dialogOpenClass: '{localName}-is-open'
    },
    localClass = function (className) {
        // This function needs to be bound inside the constructor
        // to the `this` of the element.
        return className.replace('{localName}', this.localName);
    },
} = {}) {
    return class ModalController extends HTMLElement {

        constructor() {
            const self = super();
            self._openDialogList = [];
            self._ariaHidden = [];
            self._localClass = localClass.bind(self);
            self._handleEscape = self._handleEscape.bind(self);
            self.replace = self.replace.bind(self);
            return self;
        }

        connectedCallback() {
            document.addEventListener('keyup', this._handleEscape);
        }

        open(dialogId, focusAfter, focusFirst) {
            const current = this.getCurrent();
            if (current) {
                current.removeListeners();
            } else {
                document.body.classList.add(this._localClass(classNames.dialogOpenClass));
            }
            this._ariaUnhideOthers();
            const dialog = document.getElementById(dialogId);
            if (!dialog) {
                throw new Error(`No element found with id="${dialogId}".`);
            }
            this._openDialogList.push(dialog);
            this._ariaHideOthers(dialog);
            // TODO: check the clear()-method - might be needed to reset form fields...?

            dialog.activate(focusFirst, focusAfter);
        }

        replace(dialogId, focusAfter, focusFirst) {
            const current = this.getCurrent();
            const _focusAfter = focusAfter || current.focusAfter;
            this._ariaUnhideOthers();
            
            if (current) {
                this._openDialogList.pop();
                current.deactivate();
            }

            this.open(dialogId, _focusAfter, focusFirst);
        }

        close() {
            const dialog = this.getCurrent();
            if (!dialog) {
                return;
            }
            // Deactivate current
            dialog.deactivate();

            // Unhide aria-hidden elements
            this._ariaUnhideOthers();

            // Stop tracking latest dialog as open:
            this._openDialogList.pop();
            // If a dialog was open underneath this one, restore it.
            if (this._openDialogList.length > 0) {
                let current = this.getCurrent();
                this._ariaUnhideOthers();
                this._ariaHideOthers(current);
                current.activate(dialog.focusAfter);
            }
            else {
                document.body.classList.remove(this._localClass(classNames.dialogOpenClass));
                if (dialog.focusAfter) {
                    dialog.focusAfter.focus();
                }
            }
        }

        closeCurrent() {
            const current = this.getCurrent();
            if (current) {
              this.close();
              return true;
            }
            return false;
        }

        getCurrent() {
            if (this._openDialogList && this._openDialogList.length) {
              return this._openDialogList[this._openDialogList.length - 1];
            }
        }

        _handleEscape(event) {
            const key = event.which || event.keyCode;
            const ESC_KEYCODE = 27;
            if (key === ESC_KEYCODE && this.closeCurrent()) {
              event.stopPropagation();
            }
        }

        _ariaHideOthers(target = this) {
            if (target === document.body) {
                return;
            }
            this._siblings(target).forEach((el) => {
                // Ignore already hidden elements and "meta stuff", so we don’t
                // mess with other people’s DOM unnecessarily.
                if (el.hasAttribute('aria-hidden') || el.matches('script,link,meta,noscript,template')) {
                    return;
                }
                // Hide the element
                el.setAttribute('aria-hidden', 'true');
                // ...and track it:
                this._ariaHidden.push(el);
            });
            this._ariaHideOthers(target.parentElement);
        }
        _ariaUnhideOthers() {
            this._ariaHidden.forEach((el) => el.removeAttribute('aria-hidden'));
            this._ariaHidden = [];
        }

        _siblings(element) {
            let node = element.parentNode.firstElementChild;
            const siblings = [];

            while (node) {
                if (node !== element) {
                    siblings.push(node);
                }
                node = node.nextElementSibling
            }
            return siblings;
        }
    }
}
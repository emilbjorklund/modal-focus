/**
 * This module exports a function which acts as a factory for a custom 
 * element class. Since custom element constructors are never called
 * directly, this pattern is used where external dependencies can
 * be passed in to then be available inside the "factory" closure.
 * 
 * @param {Object} options  An object containing the dependencies 
 *                          for the ModalFocus class.
 */
export default function ModalDialogFactory({
    hasBackdrop = () => false, // If truthy, this needs to return an ElementNode.
    localClass = function(className) {
        // This function needs to be bound inside the constructor
        // to the `this` of the element.
        return className.replace('{localName}', this.localName);
    },
    classNames = {
        backDrop: '{localName}-backdrop',
        backDropActive: '{localName}-backdrop--active',
        backDropShown: '{localName}-backdrop--shown',
    }
} = {}) {
    return class ModalDialog extends HTMLElement {

        constructor() {
            super();
            this.ignoreFocusChanges = false;
            this.focusAfter;
            this._lastFocus = null;
            this._isInitialized = false;
            this._madeBackdrop = false;
            this._ignoreFocusChanges = false;

            // Bind methods
            this.activate = this.activate.bind(this);
            this.deactivate = this.deactivate.bind(this);
            this.addListeners = this.addListeners.bind(this);
            this.removeListeners = this.removeListeners.bind(this);
            this._localClass = localClass.bind(this);
            this._trapFocus = this._trapFocus.bind(this);
            this._focusFirst = this._focusFirst.bind(this);
            this._focusLast = this._focusLast.bind(this);
        }

        static _isFocusable(element) {
            if (element.disabled) {
                return false;
            }
            // Yes, the 'tabIndex' _property_ is camelCase and the attribute is 
            // (normally) all lowercase 'tabindex' - but SVG attribute is 'tabIndex',
            // and HTML normalizes the case. So 'tabIndex' it is.
            if (
                element.tabIndex > 0 || element.isContentEditable ||
                (element.tabIndex === 0 && element.getAttribute('tabIndex') !== null)
            ) {
                return true;
            }
            switch (element.nodeName) {
                case 'A':
                    return !!element.href;
                case 'INPUT':
                    return element.type != 'hidden' && element.type != 'file';
                case 'BUTTON':
                case 'SELECT':
                case 'TEXTAREA':
                    return true;
                default:
                    return false;
            }
        }

        connectedCallback() {
            /**
             * To avoid unnecessary work when the element is
             * (potentially) moved in the dom, set a flag when the
             * element is properly initialized and check it here.
             */
            if (this._isInitialized) {
                return;
            }
            this._init();
        }

        get _needsBackdrop() {
            return !(hasBackdrop() || this._madeBackdrop);
        }

        get _backdropElement() {
            if (this._madeBackdrop) {
                return this._backdrop;
            } else {
                let backdrop = hasBackdrop();
                if (Object(backdrop).nodeType === Node.ELEMENT_NODE) {
                    return backdrop;
                }
                throw new Error(`hasBackdrop() must return an element node when returning a truthy value`);
            }
        }

        _init() {
            // Set up backdrop - will cause another connectedCallback
            // if needed - so we check some flags etc.
            if (this._needsBackdrop) {
                return this._makeBackdrop();
            }
            // Right, so we have some sort of backdrop. Carry on.

            // Make sure the element has a valid role
            this._checkValidRole();
            
            // Make focus trap checkers:
            this.preEl = this._makeFocusableDiv();
            this.postEl = this._makeFocusableDiv();
            this.parentNode.insertBefore(this.preEl, this);
            this.parentNode.insertBefore(this.postEl, this.nextSibling);
            // Set the initialized flag:
            this._isInitialized = true;
        }

        /**
         * Runs when the element is activated - the modal
         * does not activate itself, but relies on a modal controller
         * to activate it e.g. on click.
         */
        activate(focusFirst, focusAfter) {
            this.setAttribute('active', '');
            this._backdropElement.classList.add(this._localClass(classNames.backDropActive));
            this.addListeners();
            this.focusAfter = focusAfter || this.focusAfter;
            this._setFocus(focusFirst);  
        }

        addListeners() {
            document.addEventListener('focus', this._trapFocus, true);
        }

        removeListeners() {
            document.removeEventListener('focus', this._trapFocus, true);
        }

        _setFocus(focusFirst) {
            let focusFirstElement = null;
            if (typeof focusFirst === 'string') {
              focusFirstElement = document.getElementById(focusFirst);
            }
            else if (focusFirst instanceof HTMLElement) {
                focusFirstElement = focusFirst;
            }
            if (focusFirstElement) {
                focusFirstElement.focus();
            } else if (this.hasAttribute('aria-labelledby')) {
                try {
                    const labelingElement = document.getElementById(
                        this.getAttribute('aria-labelledby').split(' ')[0]
                        );
                    if (labelingElement && labelingElement.tabIndex !== 'undefined') {
                        labelingElement.focus();
                    }
                } catch(e) {
                    this._focusFirst();
                }
            } else {
                this._focusFirst();
            }
        }

        /**
        * Runs when the element is deactivated - either via controller or 
        * e.g. ESC press or close button click.
        */
        deactivate() {
            this.removeListeners();
            this._backdropElement.classList.remove(this._localClass(classNames.backDropActive));
            this.removeAttribute('active');
        }


        /**
         * Helper to make sure the DOM element has necessary role(s).
         */
        _checkValidRole() {
            var validRoles = ['dialog', 'alertdialog'];
            var roles = (this.getAttribute('role') || '').trim().split(/\s+/g);
            var isDialog = roles.some(token => validRoles.some(role => token === role));
            if (!isDialog) {
                throw new Error(
                    `<${this.localName}> requires its root element to have an ARIA role of dialog or alertdialog.`
                    );
            }
        }
        /**
         * Constructs a backdrop node, unless told one is already present
         * in the injected hasBackdrop function.
         */
        _makeBackdrop() {
            this._madeBackdrop = true;
            this._backdrop = document.createElement('div');
            this._backdrop.classList.add(this._localClass(classNames.backDrop));
            this.parentNode.insertBefore(this._backdrop, this);
            // Careful: this will trigger another connectedCallback.
            this._backdrop.appendChild(this);
        }

        /**
         * Helper to make tab-trap divs
         */
        _makeFocusableDiv() {
            var div = document.createElement('div');
            div.setAttribute('aria-hidden', 'false');
            div.tabIndex = 0;
            return div;
        }

        /**
         * This is the bulk of the functionality that keeps track of
         * and traps focus.
         * @param {Event} event the focus event we're hooking into.
         */
        _trapFocus(event) {
            if (this._ignoreFocusChanges) {
              return;
            }
            if (this.contains(event.target)) {
              this._lastFocus = event.target;
            } else {
              this._focusFirst();
              if (this._lastFocus == document.activeElement) {
                this._focusLast();
              }
              this._lastFocus = document.activeElement;
            }
        }
        _focusFirst(el = this) {
            for (var i = 0; i < el.childNodes.length; i++) {
              var child = el.childNodes[i];
              if (this._attemptFocus(child) ||
                  this._focusFirst(child)) {
                return true;
              }
            }
            return false;
        }
        _focusLast(el = this) {
            for (var i = el.childNodes.length - 1; i >= 0; i--) {
                var child = el.childNodes[i];
                if (this._attemptFocus(child) ||
                    this._focusLast(child)) {
                    return true;
                }
            }
            return false;
        }
        _attemptFocus(element) {
            if (!this.constructor._isFocusable(element)) {
                return false;
            }

            this._ignoreFocusChanges = true;
            try {
                element.focus();
            }
            catch (e) {
            }
            this._ignoreFocusChanges = false;
            return (document.activeElement === element);
        }
    }
}


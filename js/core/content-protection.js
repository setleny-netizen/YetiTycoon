// Discourage casual copying and drag-saving; browser screenshots and developer tools cannot be blocked.
(function () {
    const isEditable = target => target instanceof Element && !!target.closest('input, textarea, [contenteditable="true"]');
    ['contextmenu', 'dragstart', 'selectstart', 'copy', 'cut'].forEach(type => {
        document.addEventListener(type, event => {
            if (!isEditable(event.target)) event.preventDefault();
        }, true);
    });
    document.addEventListener('keydown', event => {
        if (isEditable(event.target)) return;
        if ((event.ctrlKey || event.metaKey) && ['c', 's', 'u', 'p'].includes(event.key.toLowerCase())) event.preventDefault();
    }, true);
})();

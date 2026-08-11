document.addEventListener('click', function (event) {
    const button = event.target.closest('.floating-menu-button');
    if (!button) return;

    const menu = button.closest('.floating-menu-wrapper');
    if (!menu) return;

    menu.classList.toggle('active');
});

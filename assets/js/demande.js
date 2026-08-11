document.addEventListener('click', function (event) {
    const addButton = event.target.closest('[data-add-product-line]');
    if (!addButton) return;

    const lines = document.querySelector('[data-product-lines]');
    const template = document.querySelector('#product-line-template');
    if (!lines || !template) return;

    const lineNumber = lines.querySelectorAll('.product-line').length + 1;
    const line = template.innerHTML.replace(/__INDEX__/g, lineNumber);
    lines.insertAdjacentHTML('beforeend', line);
});

document.addEventListener('click', function (event) {
    const removeButton = event.target.closest('[data-remove-product-line]');
    if (!removeButton) return;

    const line = removeButton.closest('.product-line');
    const lines = removeButton.closest('[data-product-lines]');
    if (!line || !lines || lines.querySelectorAll('.product-line').length <= 1) return;

    line.remove();
});

document.addEventListener('change', function (event) {
    if (!event.target.matches('input[name="product-return[]"]')) return;

    const line = event.target.closest('.product-line');
    const dateInput = line ? line.querySelector('.return-date-input') : null;
    if (!dateInput) return;

    dateInput.classList.toggle('is-visible', event.target.checked);
    dateInput.required = event.target.checked;
    if (!event.target.checked) dateInput.value = '';
});

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

/* ============================================================
   BÉNÉFICIAIRE — recherche du personnel (création d'un BS)
   On sélectionne d'abord le magasin de destination ; la saisie
   du nom propose ensuite les personnels de CE magasin, avec
   matricule et magasin, pour distinguer les homonymes.
   ============================================================ */
(function () {
    'use strict';

    /* Données de démo — dans la version réelle, le personnel
       viendra de la base (filtrée par le magasin sélectionné).
       Plusieurs entrées portent le même nom : c'est le cas
       d'usage qui motive la recherche avec suggestions. */
    const PERSONNEL = [
        { nom: 'Rakotobe Hery',        matricule: 'MAT-0041', magasin: 'Magasin central',           role: 'Magasinier' },
        { nom: 'Rakotobe Hery',        matricule: 'MAT-0045', magasin: 'Entrepôt S2M',              role: 'Magasinier' },
        { nom: 'Herilala Rabe',        matricule: 'MAT-0042', magasin: 'Magasin central',           role: 'Magasinier' },
        { nom: 'Razafindratsima Vola', matricule: 'MAT-0072', magasin: 'Magasin central',           role: 'Responsable magasin' },
        { nom: 'Rabeharisoa Andry',    matricule: 'MAT-0073', magasin: 'Entrepôt S2M',              role: 'Responsable entrepôt' },
        { nom: 'Ranarivelo Tsiky',     matricule: 'MAT-0081', magasin: 'Entrepôt S2M',              role: 'Magasinier' },
        { nom: 'Rasolofoniaina Fanja', matricule: 'MAT-0083', magasin: 'Entrepôt S2M',              role: 'Gestionnaire' },
        { nom: 'Razafindrakoto Lova',  matricule: 'MAT-0082', magasin: 'Magasin central',           role: 'Magasinier' },
        { nom: 'Andrianarivo Tovo',    matricule: 'MAT-0115', magasin: 'Poste de contrôle',         role: 'Sécurité' },
        { nom: 'Rabemananjara Solo',   matricule: 'MAT-0068', magasin: 'Plateforme logistique',     role: 'Transit' },
        { nom: 'Rasoarimalala Njaka',  matricule: 'MAT-0069', magasin: 'Barrière de sortie',        role: 'Transit' },
        { nom: 'Randria Jean',         matricule: 'MAT-0093', magasin: 'Siège - Administration S2M', role: 'Réception' },
        { nom: 'Randria Jean',         matricule: 'MAT-0094', magasin: 'Siège - Administration S2M', role: 'Chef de service' },
        { nom: 'Rasoanirina Miora',    matricule: 'MAT-0030', magasin: 'Siège - Administration S2M', role: 'Chef de service' },
        { nom: 'Rasoanirina Miora',    matricule: 'MAT-0031', magasin: 'Entrepôt S2M',              role: 'Comptable' },
        { nom: 'Automat SI',           matricule: 'MAT-0001', magasin: 'Siège - Administration S2M', role: 'Administrateur' }
    ];

    const HINT_DEFAULT = "Saisissez le nom d'un personnel du magasin sélectionné — plusieurs personnes peuvent porter le même nom.";

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function normalize(s) {
        return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function boot() {
        const root = document.querySelector('[data-personnel-search]');
        const storeSelect = document.getElementById('bs-magasin-destination');
        if (!root || !storeSelect) return false;

        const input = root.querySelector('[data-personnel-input]');
        const list = root.querySelector('[data-personnel-list]');
        const hint = document.querySelector('[data-personnel-hint]');
        if (!input || !list || !hint) return false;

        let results = [];

        function peopleOfStore() {
            return PERSONNEL.filter(p => p.magasin === storeSelect.value);
        }

        function render(query) {
            const q = normalize(query);
            results = peopleOfStore().filter(p => {
                return !q || normalize(p.nom + ' ' + p.matricule + ' ' + p.role).indexOf(q) !== -1;
            });

            if (!results.length) {
                list.innerHTML = '<li class="personnel-search__empty">' +
                    'Aucun personnel trouvé pour <strong>' + escapeHtml(storeSelect.value) + '</strong>.' +
                    '</li>';
                list.hidden = false;
                return;
            }

            list.innerHTML = results.map(p => {
                return '<li class="personnel-search__item" role="option" tabindex="-1">' +
                    '<span><strong>' + escapeHtml(p.nom) + '</strong> <span class="text-muted2">· ' + escapeHtml(p.role) + '</span></span>' +
                    '<span class="text-muted2" style="white-space:nowrap;">' + escapeHtml(p.matricule) + ' · ' + escapeHtml(p.magasin) + '</span>' +
                    '</li>';
            }).join('');
            list.hidden = false;
        }

        function choose(p) {
            input.value = p.nom;
            list.hidden = true;
            hint.innerHTML = '<i class="fa-solid fa-circle-check text-teal"></i> ' +
                escapeHtml(p.nom) + ' — ' + escapeHtml(p.matricule) + ' · ' + escapeHtml(p.role) + ' · ' + escapeHtml(p.magasin);
        }

        function resetSelection() {
            input.value = '';
            hint.textContent = HINT_DEFAULT;
            list.hidden = true;
        }

        storeSelect.addEventListener('change', resetSelection);
        input.addEventListener('focus', () => render(input.value));
        input.addEventListener('input', () => render(input.value));

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                list.hidden = true;
                return;
            }
            const items = list.querySelectorAll('.personnel-search__item');
            if (!items.length) return;
            const idx = Array.prototype.indexOf.call(items, document.activeElement);
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                items[(idx + 1) % items.length].focus();
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                items[(idx - 1 + items.length) % items.length].focus();
            } else if (event.key === 'Enter') {
                event.preventDefault();
                const active = document.activeElement;
                if (active && active.classList.contains('personnel-search__item')) {
                    choose(results[Array.prototype.indexOf.call(items, active)]);
                }
            }
        });

        list.addEventListener('click', (event) => {
            const item = event.target.closest('.personnel-search__item');
            if (!item) return;
            const idx = Array.prototype.indexOf.call(list.querySelectorAll('.personnel-search__item'), item);
            choose(results[idx]);
        });

        document.addEventListener('click', (event) => {
            if (list.hidden) return;
            if (!event.target.closest('[data-personnel-search]')) list.hidden = true;
        });

        return true;
    }

    if (!boot()) {
        const timer = setInterval(function () {
            if (boot()) clearInterval(timer);
        }, 100);
        setTimeout(function () { clearInterval(timer); }, 4000);
    }

    /* Export pour les autres pages (ex. transit) */
    window.S2M = window.S2M || {};
    window.S2M.personnel = PERSONNEL;
})();

/* ============================================================
   MAGASIN D'ORIGINE — logo du magasin affiché dans le formulaire
   Le sélecteur « Changer de magasin » (en haut de page, comme
   dans la v1) détermine le magasin d'origine du BS ; à chaque
   changement, le logo du magasin affiché dans le formulaire
   (comme dans la v1 : logo + magasin + date) est mis à jour.
   Le logo de l'application (en-tête) reste inchangé.
   ============================================================ */
(function () {
    'use strict';

    /* Logo par magasin — à ajuster selon les visuels disponibles
       dans assets/img/. */
    const ORIGIN_LOGOS = {
        'Magasin central': 'assets/img/Jumbo.svg',
        'Entrepôt S2M': 'assets/img/Score.jpg',
        'Siège - Administration S2M': 'assets/img/supermaki.jpg',
    };

    function formatDate(d) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return dd + '/' + mm + '/' + d.getFullYear();
    }

    function applyLogo(store) {
        const img = document.querySelector('[data-origin-logo-img]');
        if (!img) return;
        img.src = ORIGIN_LOGOS[store] || 'assets/img/s2mweb_v3_1.png';
        img.alt = 'Logo ' + store;
        const storeEl = document.querySelector('[data-origin-logo-store]');
        if (storeEl) storeEl.textContent = store;
        const dateEl = document.querySelector('[data-origin-logo-date]');
        if (dateEl) dateEl.textContent = formatDate(new Date());
    }

    function boot() {
        const select = document.getElementById('bs-magasin-origine');
        if (!select) return false;

        /* marque la page pour le CSS spécifique (sélecteur collé
           en haut du cadre blanc, bouton hamburger en absolu) */
        const contenu = document.getElementById('contenu');
        if (contenu) contenu.classList.add('page-bs-create');

        select.addEventListener('change', () => applyLogo(select.value));
        applyLogo(select.value);
        return true;
    }

    if (!boot()) {
        const timer = setInterval(function () {
            if (boot()) clearInterval(timer);
        }, 100);
        setTimeout(function () { clearInterval(timer); }, 4000);
    }
})();

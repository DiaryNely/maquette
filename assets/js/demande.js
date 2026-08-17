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
            .replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function normalize(s) {
        return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function boot() {
        const root = document.querySelector('[data-personnel-search]');
        const storeSelect = document.getElementById('bs-magasin-destination');
        if (!root || !storeSelect) return true;

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
   MOYEN D'ACHEMINEMENT — accompagnement du bon de sortie
   Recherche avec suggestions : on saisit un nom, un contact ou
   un moyen de transport, et les moyens enregistrés dans le
   système sont proposés. Le bouton « Ajouter » ouvre un panneau
   pour créer un nouveau moyen (nom complet, contact, moyen de
   transport), qui s'ajoute ensuite aux suggestions.
   (Non lié à une autre page : le moyen sélectionné apparaît
   dans la création et le détail du bon de sortie.)
   ============================================================ */
(function () {
    'use strict';

    /* Moyens de démo — dans la version réelle, ils viendront de
       la base de données (gérés côté administration). */
    const ACH = [
        { nom: 'Rakoto Andry',        contact: '034 12 345 67', transport: 'Camion S2M' },
        { nom: 'Trans Express SARL',  contact: '020 22 33 44',  transport: 'Camion frigorifique' },
        { nom: 'Rabemananjara Solo',  contact: '032 55 44 33',  transport: 'Moto' },
        { nom: 'Rasoarimalala Njaka', contact: '033 98 76 54',  transport: 'Fourgonnette' }
    ];

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function normalize(s) {
        return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function labelOf(a) {
        return a.nom + ' — ' + a.transport + ' · ' + a.contact;
    }

    function boot() {
        const root = document.querySelector('[data-ach-search]');
        const fresh = document.querySelector('[data-ach-new]');
        if (!root || !fresh) return false;

        const input = root.querySelector('[data-ach-input]');
        const list = root.querySelector('[data-ach-list]');
        const hint = document.querySelector('[data-ach-hint]');
        if (!input || !list || !hint) return false;

        const addBtn = document.querySelector('[data-ach-add]');
        const saveBtn = document.querySelector('[data-ach-save]');
        const cancelBtn = document.querySelector('[data-ach-cancel]');

        let results = [];

        function render(query) {
            const q = normalize(query);
            results = ACH.filter(function (a) {
                return !q || normalize(a.nom + ' ' + a.contact + ' ' + a.transport).indexOf(q) !== -1;
            });
            if (!results.length) {
                list.innerHTML = '<li class="personnel-search__empty">' +
                    'Aucun moyen ne correspond — cliquez sur « Ajouter » pour en créer un nouveau.</li>';
                list.hidden = false;
                return;
            }
            list.innerHTML = results.map(function (a) {
                return '<li class="personnel-search__item" role="option" tabindex="-1">' +
                    '<span><strong>' + escapeHtml(a.nom) + '</strong> <span class="text-muted2">· ' + escapeHtml(a.transport) + '</span></span>' +
                    '<span class="text-muted2" style="white-space:nowrap;">' + escapeHtml(a.contact) + '</span>' +
                    '</li>';
            }).join('');
            list.hidden = false;
        }

        function choose(a) {
            input.value = labelOf(a);
            list.hidden = true;
            hint.innerHTML = '<i class="fa-solid fa-circle-check text-teal"></i> ' +
                escapeHtml(a.nom) + ' — ' + escapeHtml(a.transport) + ' · ' + escapeHtml(a.contact);
        }

        input.addEventListener('focus', function () { render(input.value); });
        input.addEventListener('input', function () { render(input.value); });
        input.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') { list.hidden = true; return; }
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
        list.addEventListener('click', function (event) {
            const item = event.target.closest('.personnel-search__item');
            if (!item) return;
            choose(results[Array.prototype.indexOf.call(list.querySelectorAll('.personnel-search__item'), item)]);
        });
        document.addEventListener('click', function (event) {
            if (list.hidden) return;
            if (!event.target.closest('[data-ach-search]')) list.hidden = true;
        });

        /* Panneau « nouveau moyen » : ouverture, enregistrement, annulation */
        if (addBtn) {
            addBtn.addEventListener('click', function () {
                fresh.hidden = false;
                fresh.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function () { fresh.hidden = true; });
        }
        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                const nom = document.getElementById('ach-nom-complet');
                const contact = document.getElementById('ach-contact');
                const transport = document.getElementById('ach-transport');
                if (!nom || !contact || !transport) return;
                if (!nom.value.trim() || !contact.value.trim()) {
                    hint.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ' +
                        'Renseignez au minimum le nom complet et le contact du nouveau moyen.';
                    return;
                }
                const created = {
                    nom: nom.value.trim(),
                    contact: contact.value.trim(),
                    transport: transport.value
                };
                ACH.unshift(created);
                choose(created);
                nom.value = '';
                contact.value = '';
                fresh.hidden = true;
            });
        }
        return true;
    }

    if (!boot()) {
        const timer = setInterval(function () {
            if (boot()) clearInterval(timer);
        }, 100);
        setTimeout(function () { clearInterval(timer); }, 4000);
    }
})();

/* ============================================================
   DESTINATION PAR LIGNE — chaque ligne d'article peut avoir
   son propre magasin destinataire ET son propre personnel
   destinataire (bénéficiaire). Le bon ne porte pas de destination
   principale : chaque ligne est autonome. Le champ bénéficiaire
   est une recherche avec suggestions (composant personnel-search)
   filtrée par le magasin choisi sur la ligne ; la valeur retenue
   est le simple nom de la personne, jamais une concaténation.
   Un bandeau récapitule la répartition pour la validation.
   ============================================================ */
(function () {
    'use strict';

    function boot() {
        const root = document.querySelector('[data-product-lines]');
        const banner = document.querySelector('[data-multi-dest-banner]');
        const text = banner ? banner.querySelector('[data-multi-dest-text]') : null;
        if (!root || !banner || !text) return false;

        const PERSONNEL = (window.S2M && window.S2M.personnel) || [];

        function escapeHtml(s) {
            return String(s == null ? '' : s)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
        }

        function normalize(s) {
            return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }

        function storeOf(line) {
            const sel = line.querySelector('select[name="product-destination[]"]');
            return sel && sel.value ? sel.value : '';
        }

        function placeholderFor(line) {
            const store = storeOf(line);
            return store ? 'Personnel de « ' + store + ' »' : 'Choisissez d\'abord un magasin';
        }

        function peopleOf(store, query) {
            const q = normalize(query);
            return PERSONNEL.filter(function (p) {
                if (store && p.magasin !== store) return false;
                return !q || normalize(p.nom + ' ' + p.matricule + ' ' + p.role).indexOf(q) !== -1;
            });
        }

        /* Affiche les suggestions de la ligne sous le champ, au-dessus
           de tout conteneur défilant (position fixe par rapport au
           viewport). La valeur sélectionnée reste le simple nom. */
        function renderList(input, query) {
            const line = input.closest('.product-line');
            const list = line.querySelector('[data-personnel-list]');
            const store = storeOf(line);

            if (!store) {
                list.innerHTML = '<li class="personnel-search__empty">' +
                    'Choisissez d\'abord un magasin de destination.</li>';
                list.hidden = false;
                return;
            }

            const results = peopleOf(store, query);
            list._results = results;

            if (!results.length) {
                list.innerHTML = '<li class="personnel-search__empty">' +
                    'Aucun personnel trouvé pour <strong>' + escapeHtml(store) + '</strong>.</li>';
            } else {
                list.innerHTML = results.map(function (p) {
                    return '<li class="personnel-search__item" role="option" tabindex="-1">' +
                        '<span><strong>' + escapeHtml(p.nom) + '</strong> <span class="text-muted2">· ' + escapeHtml(p.role) + '</span></span>' +
                        '<span class="text-muted2" style="white-space:nowrap;">' + escapeHtml(p.matricule) + ' · ' + escapeHtml(p.magasin) + '</span>' +
                        '</li>';
                }).join('');
            }

            const rect = input.getBoundingClientRect();
            list.style.position = 'fixed';
            list.style.top = (rect.bottom + 4) + 'px';
            list.style.left = rect.left + 'px';
            list.style.right = 'auto';
            list.hidden = false;
        }

        function choose(input, p) {
            input.value = p.nom;
            const list = input.closest('.personnel-search').querySelector('[data-personnel-list]');
            list.hidden = true;
            refresh();
        }

        function refresh() {
            const byDest = {};
            let assigned = 0;
            let beneficiaries = 0;
            root.querySelectorAll('.product-line').forEach(function (line) {
                const sel = line.querySelector('select[name="product-destination[]"]');
                const ben = line.querySelector('input[name="product-beneficiary[]"]');
                const dest = sel && sel.value;
                if (dest) {
                    assigned += 1;
                    byDest[dest] = (byDest[dest] || 0) + 1;
                }
                const custom = ben && ben.value.trim();
                if (custom) beneficiaries += 1;
            });

            const parts = [];
            if (assigned > 0) {
                const list = Object.keys(byDest)
                    .map(function (d) { return byDest[d] + ' × ' + d; })
                    .join(', ');
                parts.push(assigned + ' article' + (assigned > 1 ? 's' : '') +
                    ' réparti' + (assigned > 1 ? 's' : '') + ' entre : ' + list);
            }
            if (beneficiaries > 0) {
                parts.push(beneficiaries + ' bénéficiaire' + (beneficiaries > 1 ? 's' : '') + ' renseigné' + (beneficiaries > 1 ? 's' : ''));
            }

            if (parts.length) {
                text.textContent = parts.join('. ') + '.';
                banner.hidden = false;
            } else {
                banner.hidden = true;
            }
        }

        /* Délégation sur l'ensemble des lignes, y compris les nouvelles */
        root.addEventListener('focusin', function (event) {
            if (!event.target.matches('input[name="product-beneficiary[]"]')) return;
            event.target.placeholder = placeholderFor(event.target.closest('.product-line'));
            renderList(event.target, '');
        });

        root.addEventListener('input', function (event) {
            if (!event.target.matches('input[name="product-beneficiary[]"]')) return;
            renderList(event.target, event.target.value);
            refresh();
        });

        root.addEventListener('keydown', function (event) {
            const input = event.target.closest('input[name="product-beneficiary[]"]');
            const item = event.target.closest('.personnel-search__item');
            if (!input && !item) return;
            const line = (input || item).closest('.product-line');
            const list = line.querySelector('[data-personnel-list]');
            if (event.key === 'Escape') {
                list.hidden = true;
                return;
            }
            const items = list.querySelectorAll('.personnel-search__item');
            if (!items.length) return;
            const results = list._results || [];
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const idx = Array.prototype.indexOf.call(items, document.activeElement);
                const next = event.key === 'ArrowDown'
                    ? (idx + 1) % items.length
                    : (idx - 1 + items.length) % items.length;
                items[next].focus();
            } else if (event.key === 'Enter') {
                const active = document.activeElement;
                if (active && active.classList.contains('personnel-search__item')) {
                    event.preventDefault();
                    const idx = Array.prototype.indexOf.call(items, active);
                    choose(input || line.querySelector('input[name="product-beneficiary[]"]'), results[idx]);
                }
            }
        });

        root.addEventListener('click', function (event) {
            const item = event.target.closest('.personnel-search__item');
            if (!item) return;
            const line = item.closest('.product-line');
            const list = line.querySelector('[data-personnel-list]');
            const results = list._results || [];
            const idx = Array.prototype.indexOf.call(list.querySelectorAll('.personnel-search__item'), item);
            choose(line.querySelector('input[name="product-beneficiary[]"]'), results[idx]);
        });

        /* Changement de magasin sur une ligne : le bénéficiaire est
           réinitialisé (les suggestions dépendent du magasin) */
        root.addEventListener('change', function (event) {
            if (!event.target.matches('select[name="product-destination[]"]')) return;
            const line = event.target.closest('.product-line');
            const ben = line.querySelector('input[name="product-beneficiary[]"]');
            if (ben) {
                ben.value = '';
                ben.placeholder = placeholderFor(line);
                const list = line.querySelector('[data-personnel-list]');
                if (list) list.hidden = true;
            }
            refresh();
        });

        document.addEventListener('click', function (event) {
            if (event.target.closest('[data-personnel-input]')) return;
            root.querySelectorAll('[data-personnel-list]').forEach(function (list) {
                if (!list.hidden) list.hidden = true;
            });
        });

        /* Après ajout / suppression d'une ligne (gérés ailleurs dans ce fichier) */
        document.addEventListener('click', function (event) {
            if (event.target.closest('[data-add-product-line]') ||
                event.target.closest('[data-remove-product-line]')) {
                setTimeout(refresh, 0);
            }
        });

        refresh();
        return true;
    }

    if (!boot()) {
        const timer = setInterval(function () {
            if (boot()) clearInterval(timer);
        }, 100);
        setTimeout(function () { clearInterval(timer); }, 4000);
    }
})();

/* ============================================================
   ADMIN — espace administrateur (mockup S2M-WEB)

   Deux configurations uniquement :
     1. Gestion des menus : matrice des accès (qui voit quelle
        partie de l'application), par fonction ou par matricule ;
     2. Distribution des notifications : types d'événement × rôles
        destinataires, avec activation / désactivation par type
        (pas de canal configurable par notification).
   ============================================================ */
(function () {
    'use strict';

    var MENU_COLS = [
        { key: 'bons',      label: 'Bons de sortie' },
        { key: 'creation',  label: 'Création d\'un BS' },
        { key: 'scan',      label: 'QR Code & scan' },
        { key: 'transit',   label: 'Transit' },
        { key: 'anomalies', label: 'Anomalies' },
        { key: 'notifs',    label: 'Notifications' },
        { key: 'rapports',  label: 'Rapports' },
        { key: 'admin',     label: 'Administration' },
        { key: 'trace',     label: 'Traçabilité' }
    ];

    var FONCTIONS = [
        { key: 'initiateur',    label: 'Initiateur' },
        { key: 'responsable',   label: 'Responsable' },
        { key: 'securite',      label: 'Sécurité' },
        { key: 'transit',       label: 'Transit' },
        { key: 'reception',     label: 'Réception' },
        { key: 'destinataire',  label: 'Destinataire' },
        { key: 'admin',         label: 'Administrateur' }
    ];

    var DEFAULT_GRANTS = {
        initiateur:   ['bons', 'creation', 'scan', 'transit', 'trace'],
        responsable:  ['bons', 'creation', 'scan', 'transit', 'anomalies', 'rapports', 'trace'],
        securite:     ['scan', 'transit', 'anomalies'],
        transit:      ['scan', 'transit', 'anomalies', 'trace'],
        reception:    ['bons', 'scan', 'transit', 'anomalies', 'trace'],
        destinataire: ['bons', 'scan'],
        admin:        MENU_COLS.map(function (c) { return c.key; })
    };

    var ROWS = [
        { matricule: 'MAT-0041', personne: 'Rakotobe Hery',        fonction: 'initiateur',   entite: 'Magasin central' },
        { matricule: 'MAT-0042', personne: 'Herilala Rabe',        fonction: 'initiateur',   entite: 'Magasin central' },
        { matricule: 'MAT-0072', personne: 'Razafindratsima Vola', fonction: 'responsable',   entite: 'Magasin central' },
        { matricule: 'MAT-0073', personne: 'Rabeharisoa Andry',    fonction: 'responsable',   entite: 'Entrepôt S2M' },
        { matricule: 'MAT-0115', personne: 'Andrianarivo Tovo',    fonction: 'securite',      entite: 'Poste de contrôle' },
        { matricule: 'MAT-0068', personne: 'Rabemananjara Solo',   fonction: 'transit',       entite: 'Plateforme logistique' },
        { matricule: 'MAT-0069', personne: 'Rasoarimalala Njaka',  fonction: 'transit',       entite: 'Barrière de sortie' },
        { matricule: 'MAT-0093', personne: 'Randria Jean',         fonction: 'reception',     entite: 'Siège - Administration S2M' },
        { matricule: 'MAT-0030', personne: 'Rasoanirina Miora',    fonction: 'destinataire',  entite: 'Siège - Administration S2M' },
        { matricule: 'MAT-0001', personne: 'Automat SI',           fonction: 'admin',         entite: 'Siège - Administration S2M' }
    ];

    function fonctionOrder(key) {
        for (var i = 0; i < FONCTIONS.length; i++) {
            if (FONCTIONS[i].key === key) return i;
        }
        return 99;
    }

    var ROLE_KEYS = ['initiateur', 'responsable', 'securite', 'transit', 'reception', 'destinataire', 'admin'];

    var NOTIF_TYPES = [
        { key: 'anom-declaree',   label: 'Anomalie déclarée',                    desc: 'alerte immédiate quand une anomalie est ouverte',              roles: ['responsable', 'transit', 'admin'] },
        { key: 'anom-resolue',    label: 'Anomalie résolue',                     desc: 'retour à la normale après résolution',                        roles: ['initiateur', 'securite', 'admin'] },
        { key: 'envoi',           label: 'Envoi d\'un BS',                       desc: 'bon de sortie soumis ou parti d\'un magasin',                 roles: ['initiateur', 'admin'] },
        { key: 'reception',       label: 'Réception d\'un BS',                   desc: 'bon arrivé et contrôlé chez le destinataire',                 roles: ['initiateur', 'destinataire', 'admin'] },
        { key: 'transit-passage', label: 'Passage en transit enregistré',        desc: 'scan du QR dans un magasin, nouveau passage du parcours',     roles: ['transit', 'responsable'] },
        { key: 'retard',          label: 'Retard (anomalie / retour)',           desc: 'dépassement de délai de validation ou de retour',             roles: ['responsable', 'admin'] },
        { key: 'rapport',         label: 'Rapport périodique',                   desc: 'rapports & statistiques envoyés à échéance',                  roles: ['responsable', 'admin'] }
    ];

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function fonctionLabel(key) {
        for (var i = 0; i < FONCTIONS.length; i++) {
            if (FONCTIONS[i].key === key) return FONCTIONS[i].label;
        }
        return key;
    }

    function roleLabel(key) {
        return fonctionLabel(key);
    }

    /* --- État ---
       Deux matrices indépendantes :
         - fonctionState : accès par FONCTION (vue « Par fonction ») ;
         - personState   : accès par PERSONNE (vue « Par matricule »). */

    function initCols(grants) {
        var cols = {};
        MENU_COLS.forEach(function (c) { cols[c.key] = false; });
        (grants || []).forEach(function (k) { cols[k] = true; });
        return cols;
    }

    function buildFonctionState() {
        return FONCTIONS.map(function (f) {
            return { key: f.key, label: f.label, cols: initCols(DEFAULT_GRANTS[f.key]) };
        });
    }

    function buildPersonState() {
        return ROWS.map(function (r) {
            return {
                matricule: r.matricule,
                personne: r.personne,
                fonction: r.fonction,
                fonctionLabel: fonctionLabel(r.fonction),
                entite: r.entite,
                cols: initCols(DEFAULT_GRANTS[r.fonction])
            };
        });
    }

    function buildNotifState() {
        return NOTIF_TYPES.map(function (t) {
            var roles = {};
            ROLE_KEYS.forEach(function (k) { roles[k] = false; });
            (t.roles || []).forEach(function (k) { roles[k] = true; });
            return { key: t.key, label: t.label, desc: t.desc, roles: roles, active: true };
        });
    }

    var fonctionState = buildFonctionState();
    var personState = buildPersonState();
    var notifState = buildNotifState();
    var menuMode = 'fonction';

    var savedMenu = '';
    var savedNotif = '';
    var root = null;

    /* --- Rendu : matrice des menus --- */

    function renderMenu() {
        var table = root.querySelector('[data-menu-table]');
        var thead = table.querySelector('thead');
        var tbody = table.querySelector('[data-menu-body]');

        var colAllCells = MENU_COLS.map(function (c) {
            return '<th class="matrix-cb">' +
                '<input type="checkbox" data-col-all="' + c.key + '" title="Tout sélectionner">' +
                '<br><span class="col-group-name">' + esc(c.label) + '</span></th>';
        }).join('');

        if (menuMode === 'matricule') {
            /* vue « Par matricule » : une ligne par personne */
            thead.innerHTML = '<tr><th>MATRICULE</th><th>PERSONNE</th><th>FONCTION</th><th>ENTITÉ / MAGASIN</th>' + colAllCells + '</tr>';
            var order = personState.map(function (_, i) { return i; });
            order.sort(function (a, b) {
                return personState[a].matricule.localeCompare(personState[b].matricule);
            });
            tbody.innerHTML = order.map(function (i) {
                var r = personState[i];
                return '<tr data-prow="' + i + '">' +
                    '<td class="cell-muted">' + esc(r.matricule) + '</td>' +
                    '<td>' + esc(r.personne) + '</td>' +
                    '<td class="fonction-cell">' + esc(r.fonctionLabel) + '</td>' +
                    '<td class="cell-muted">' + esc(r.entite) + '</td>' +
                    MENU_COLS.map(function (c) {
                        return '<td class="matrix-cb"><input type="checkbox" data-pcb data-prow="' + i +
                            '" data-col="' + c.key + '"' + (r.cols[c.key] ? ' checked' : '') + '></td>';
                    }).join('') +
                    '</tr>';
            }).join('');
        } else {
            /* vue « Par fonction » : une ligne par fonction, sans colonne personne */
            thead.innerHTML = '<tr><th>FONCTION</th>' + colAllCells + '</tr>';
            tbody.innerHTML = fonctionState.map(function (f, i) {
                return '<tr data-frow="' + i + '">' +
                    '<td class="fonction-cell">' + esc(f.label) + '</td>' +
                    MENU_COLS.map(function (c) {
                        return '<td class="matrix-cb"><input type="checkbox" data-fcb data-frow="' + i +
                            '" data-col="' + c.key + '"' + (f.cols[c.key] ? ' checked' : '') + '></td>';
                    }).join('') +
                    '</tr>';
            }).join('');
        }

        /* les filtres personne/entité/recherche ne concernent que la vue « Par matricule » */
        var personFilters = root.querySelector('[data-menu-person-filters]');
        if (personFilters) personFilters.hidden = menuMode !== 'matricule';

        applyMenuFilters();
        updateMenuTag();
    }

    function applyMenuFilters() {
        var f = root.querySelector('[data-menu-fonction]').value;
        var p = root.querySelector('[data-menu-personne]').value;
        var e = root.querySelector('[data-menu-entite]').value;
        var q = (root.querySelector('[data-menu-search]').value || '').trim().toLowerCase();
        var rows = root.querySelectorAll('[data-menu-body] tr');
        for (var i = 0; i < rows.length; i++) {
            var tr = rows[i];
            var show = true;
            if (tr.hasAttribute('data-frow')) {
                var fr = fonctionState[+tr.getAttribute('data-frow')];
                show = !f || fr.label === f;
            } else if (tr.hasAttribute('data-prow')) {
                var pr = personState[+tr.getAttribute('data-prow')];
                show = (!f || pr.fonctionLabel === f) &&
                       (!p || pr.personne === p) &&
                       (!e || pr.entite === e) &&
                       (!q || (pr.personne + ' ' + pr.matricule + ' ' + pr.entite).toLowerCase().indexOf(q) !== -1);
            }
            tr.hidden = !show;
        }
    }

    /* --- Rendu : distribution des notifications --- */

    function renderNotif() {
        var table = root.querySelector('[data-notif-table]');
        var thead = table.querySelector('thead');
        var tbody = table.querySelector('[data-notif-body]');

        thead.innerHTML = '<tr>' +
            '<th>Type d\'événement</th>' +
            ROLE_KEYS.map(function (k) {
                return '<th class="matrix-cb">' +
                    '<input type="checkbox" data-ncol-all="' + k + '" title="Tout sélectionner">' +
                    '<br><span class="col-group-name">' + esc(roleLabel(k)) + '</span></th>';
            }).join('') +
            '<th class="text-center">Activé</th>' +
            '</tr>';

        tbody.innerHTML = notifState.map(function (t, i) {
            return '<tr data-row="' + i + '">' +
                '<td><strong>' + esc(t.label) + '</strong><br><span class="cell-muted" style="font-size:0.78rem;">' + esc(t.desc) + '</span></td>' +
                ROLE_KEYS.map(function (k) {
                    return '<td class="matrix-cb"><input type="checkbox" data-nrole data-row="' + i +
                        '" data-role="' + k + '"' + (t.roles[k] ? ' checked' : '') + '></td>';
                }).join('') +
                '<td class="text-center"><label class="switch mb-0">' +
                    '<input type="checkbox" data-nactive data-row="' + i + '"' + (t.active ? ' checked' : '') + '>' +
                    '<span class="switch__slider"></span></label></td>' +
                '</tr>';
        }).join('');

        updateNotifTag();
    }

    /* --- Snapshots & compteurs --- */

    function menuSnapshot() {
        var s = '';
        fonctionState.forEach(function (f) {
            MENU_COLS.forEach(function (c) { s += f.cols[c.key] ? '1' : '0'; });
        });
        personState.forEach(function (r) {
            MENU_COLS.forEach(function (c) { s += r.cols[c.key] ? '1' : '0'; });
        });
        return s;
    }

    function notifSnapshot() {
        return Array.prototype.map.call(
            root.querySelectorAll('[data-notif-body] input[type="checkbox"]'),
            function (cb) { return cb.checked ? '1' : '0'; }
        ).join('');
    }

    function countDiff(cur, saved) {
        var n = Math.min(cur.length, saved.length);
        var d = 0;
        for (var i = 0; i < n; i++) {
            if (cur[i] !== saved[i]) d++;
        }
        return d;
    }

    function plural(n) {
        return n > 1 ? n + ' modifications non enregistrées' : n + ' modification non enregistrée';
    }

    function updateMenuTag() {
        var el = root.querySelector('[data-menu-tag]');
        if (el) el.textContent = plural(countDiff(menuSnapshot(), savedMenu));
    }

    function updateNotifTag() {
        var el = root.querySelector('[data-notif-tag]');
        if (el) el.textContent = plural(countDiff(notifSnapshot(), savedNotif));
    }

    /* --- Alertes --- */

    function showAlert(panel, msg) {
        var alert = document.createElement('div');
        alert.className = 'alert-mock alert-mock--success mb-3';
        alert.innerHTML = '<i class="fa-solid fa-circle-check"></i><span>' + esc(msg) + '</span>';
        panel.insertBefore(alert, panel.firstChild);
        setTimeout(function () { if (alert.parentNode) alert.parentNode.removeChild(alert); }, 3200);
    }

    /* --- Écouteurs --- */

    function wireMenu() {
        var table = root.querySelector('[data-menu-table]');
        var tbody = root.querySelector('[data-menu-body]');

        /* tout sélectionner par colonne (sur la vue active) */
        table.addEventListener('change', function (e) {
            var cb = e.target;
            if (cb.hasAttribute('data-col-all')) {
                var key = cb.getAttribute('data-col-all');
                var target = menuMode === 'matricule' ? personState : fonctionState;
                target.forEach(function (r) { r.cols[key] = cb.checked; });
                renderMenu();
            }
        });

        /* cases individuelles : fonction ou personne selon la vue */
        tbody.addEventListener('change', function (e) {
            var cb = e.target;
            if (cb.hasAttribute('data-fcb')) {
                fonctionState[+cb.getAttribute('data-frow')].cols[cb.getAttribute('data-col')] = cb.checked;
                updateMenuTag();
            } else if (cb.hasAttribute('data-pcb')) {
                personState[+cb.getAttribute('data-prow')].cols[cb.getAttribute('data-col')] = cb.checked;
                updateMenuTag();
            }
        });

        /* filtres */
        ['[data-menu-fonction]', '[data-menu-personne]', '[data-menu-entite]'].forEach(function (sel) {
            root.querySelector(sel).addEventListener('change', applyMenuFilters);
        });
        root.querySelector('[data-menu-search]').addEventListener('input', applyMenuFilters);

        /* mode fonction / matricule : les filtres personne/entité/recherche
           ne concernent que la vue « Par matricule » */
        var personFilters = root.querySelector('[data-menu-person-filters]');
        root.querySelectorAll('[data-menu-mode-tab]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                menuMode = btn.getAttribute('data-menu-mode-tab');
                root.querySelectorAll('[data-menu-mode-tab]').forEach(function (b) {
                    b.classList.toggle('active', b === btn);
                });
                if (personFilters) personFilters.hidden = menuMode !== 'matricule';
                renderMenu();
            });
        });

        /* enregistrer / rétablir */
        root.querySelector('[data-menu-save]').addEventListener('click', function () {
            savedMenu = menuSnapshot();
            updateMenuTag();
            showAlert(root.querySelector('[data-mock-panel="menus"]'), 'Configuration des menus enregistrée.');
        });
        root.querySelector('[data-menu-reset]').addEventListener('click', function () {
            fonctionState = buildFonctionState();
            personState = buildPersonState();
            renderMenu();
            showAlert(root.querySelector('[data-mock-panel="menus"]'), 'Accès des menus rétablis aux valeurs par défaut.');
        });
    }

    function wireNotif() {
        var table = root.querySelector('[data-notif-table]');
        var tbody = root.querySelector('[data-notif-body]');

        table.addEventListener('change', function (e) {
            var cb = e.target;
            if (cb.hasAttribute('data-ncol-all')) {
                var key = cb.getAttribute('data-ncol-all');
                notifState.forEach(function (t) { t.roles[key] = cb.checked; });
                renderNotif();
                return;
            }
            if (cb.hasAttribute('data-nrole')) {
                var t1 = notifState[+cb.getAttribute('data-row')];
                t1.roles[cb.getAttribute('data-role')] = cb.checked;
                updateNotifTag();
            }
        });

        tbody.addEventListener('change', function (e) {
            var cb = e.target;
            var t = notifState[+cb.getAttribute('data-row')];
            if (cb.hasAttribute('data-nactive')) {
                t.active = cb.checked;
                updateNotifTag();
            }
        });

        root.querySelector('[data-notif-save]').addEventListener('click', function () {
            savedNotif = notifSnapshot();
            updateNotifTag();
            showAlert(root.querySelector('[data-mock-panel="notifs"]'), 'Distribution des notifications enregistrée.');
        });
        root.querySelector('[data-notif-reset]').addEventListener('click', function () {
            notifState = buildNotifState();
            renderNotif();
            showAlert(root.querySelector('[data-mock-panel="notifs"]'), 'Distribution des notifications rétablie aux valeurs par défaut.');
        });
    }

    /* --- Boot --- */

    function boot() {
        root = document.querySelector('[data-admin]');
        if (!root) return false;
        if (root.getAttribute('data-bound')) return true;
        root.setAttribute('data-bound', '1');

        var personSel = root.querySelector('[data-menu-personne]');
        personSel.innerHTML = '<option value="" selected>Toutes les personnes</option>' +
            ROWS.map(function (r) { return '<option>' + esc(r.personne) + '</option>'; }).join('');

        renderMenu();
        renderNotif();
        savedMenu = menuSnapshot();
        savedNotif = notifSnapshot();
        updateMenuTag();
        updateNotifTag();
        wireMenu();
        wireNotif();
        return true;
    }

    if (!boot()) {
        var timer = setInterval(function () {
            if (boot()) clearInterval(timer);
        }, 100);
        setTimeout(function () { clearInterval(timer); }, 4000);
    }
})();

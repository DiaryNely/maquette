/* ============================================================
   RETOURS — suivi des retours de matériel (mockup S2M-WEB)
   ============================================================ */
(function () {
    'use strict';

    // Données de démo pour le suivi des retours d'articles
    var RETOURS = [
        { bs: 'BS-2026-0142', code: 'MAT-011', designation: 'Écran 24" Dell P2422H', qte: 2, dateRetour: '12/09/2026', initiateur: 'Rakotobe Hery', beneficiaire: 'Rasoanirina Miora', origine: 'Magasin central', destination: 'Siège - Administration S2M', statut: 'En attente' },
        { bs: 'BS-2026-0142', code: 'MAT-012', designation: 'Ordinateur portable Lenovo L14', qte: 1, dateRetour: '12/09/2026', initiateur: 'Rakotobe Hery', beneficiaire: 'Rasoanirina Miora', origine: 'Magasin central', destination: 'Siège - Administration S2M', statut: 'En attente' },
        { bs: 'BS-2026-0138', code: 'MAT-019', designation: 'Vidéoprojecteur Epson', qte: 1, dateRetour: '20/09/2026', initiateur: 'Rabenjanahary Mamy', beneficiaire: 'Razafindrakoto Lova', origine: 'Siège - Administration S2M', destination: 'Magasin central', statut: 'En attente' },
        { bs: 'BS-2026-0134', code: 'MAT-088', designation: 'Multimètre Fluke 179', qte: 1, dateRetour: '14/08/2026', initiateur: 'Rabeharisoa Andry', beneficiaire: 'Rakotobe Hery', origine: 'Entrepôt S2M', destination: 'Magasin central', statut: 'En retard' },
        { bs: 'BS-2026-0130', code: 'MAT-045', designation: 'Perceuse à percussion Bosch', qte: 1, dateRetour: '05/08/2026', initiateur: 'Rakotobe Hery', beneficiaire: 'Razafindrakoto Lova', origine: 'Magasin central', destination: 'Entrepôt S2M', statut: 'Retourné' }
    ];

    var CURRENT_USER = 'Rakotobe Hery'; // Utilisateur connecté par défaut pour le rôle Personnel

    function currentRole() {
        var raw = new URLSearchParams(location.search).get('page') || '';
        return raw.split('/')[0] || null;
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    var activeTab = 'tab1';

    function initTabs() {
        var tabsContainer = document.querySelector('[data-retours-tabs]');
        if (!tabsContainer) return;

        var role = currentRole();
        var html = '';

        if (role === 'admin') {
            html = '<button class="mock-tab ' + (activeTab === 'tab1' ? 'active' : '') + '" data-tab="tab1" type="button">' +
                   '    <i class="fa-solid fa-hourglass-half"></i> Retours en attente' +
                   '</button>' +
                   '<button class="mock-tab ' + (activeTab === 'tab2' ? 'active' : '') + '" data-tab="tab2" type="button">' +
                   '    <i class="fa-solid fa-circle-check"></i> Retours effectués' +
                   '</button>';
        } else {
            // Rôle lambda / Personnel
            html = '<button class="mock-tab ' + (activeTab === 'tab1' ? 'active' : '') + '" data-tab="tab1" type="button">' +
                   '    <i class="fa-solid fa-arrow-right-from-bracket"></i> Ce que je dois rendre' +
                   '</button>' +
                   '<button class="mock-tab ' + (activeTab === 'tab2' ? 'active' : '') + '" data-tab="tab2" type="button">' +
                   '    <i class="fa-solid fa-arrow-right-to-bracket"></i> Ce qu\'on doit me rendre' +
                   '</button>';
        }

        tabsContainer.innerHTML = html;

        // Event listener pour changer d'onglet
        tabsContainer.querySelectorAll('[data-tab]').forEach(function (tabBtn) {
            tabBtn.addEventListener('click', function () {
                activeTab = this.getAttribute('data-tab');
                initTabs();
                apply();
            });
        });
    }

    function apply() {
        var root = document.querySelector('[data-retours]');
        if (!root) return;

        var role = currentRole();
        var tbody = root.querySelector('[data-retours-tbody]');
        var searchVal = (root.querySelector('[data-retours-search]').value || '').trim().toLowerCase();
        var statusFilter = root.querySelector('[data-retours-statut-select]').value;

        // Adapter les titres des colonnes selon le rôle et l'onglet
        var col1 = root.querySelector('[data-col-personne1]');
        var col2 = root.querySelector('[data-col-personne2]');
        if (col1 && col2) {
            if (role === 'admin') {
                col1.textContent = 'Initiateur / Source';
                col2.textContent = 'Bénéficiaire / Destinataire';
            } else {
                col1.textContent = (activeTab === 'tab1') ? 'Prêté par (Initiateur)' : 'Emprunté par (Bénéficiaire)';
                col2.textContent = (activeTab === 'tab1') ? 'Magasin source' : 'Magasin destinataire';
            }
        }

        // 1. Filtrer selon l'onglet courant et le rôle
        var list = RETOURS.filter(function (item) {
            if (role === 'admin') {
                if (activeTab === 'tab1') {
                    return item.statut !== 'Retourné';
                } else {
                    return item.statut === 'Retourné';
                }
            } else {
                // Rôle Personnel (lambda)
                if (activeTab === 'tab1') {
                    // Ce que je dois rendre (Je suis bénéficiaire, et ce n'est pas encore retourné)
                    return item.beneficiaire === CURRENT_USER && item.statut !== 'Retourné';
                } else {
                    // Ce qu'on doit me rendre (Je suis l'initiateur)
                    return item.initiateur === CURRENT_USER;
                }
            }
        });

        // 2. Mettre à jour les KPI Cards (pour l'onglet actif ou globalement pertinent)
        var kpiRetard = 0;
        var kpiAttente = 0;
        var kpiValides = 0;

        // On calcule les stats sur la sous-liste filtrée par onglet
        list.forEach(function (item) {
            if (item.statut === 'En retard') kpiRetard++;
            else if (item.statut === 'En attente') kpiAttente++;
            else if (item.statut === 'Retourné') kpiValides++;
        });

        var kpiRetardEl = root.querySelector('[data-kpi-retard]');
        var kpiAttenteEl = root.querySelector('[data-kpi-attente]');
        var kpiValidesEl = root.querySelector('[data-kpi-valides]');
        if (kpiRetardEl) kpiRetardEl.textContent = kpiRetard;
        if (kpiAttenteEl) kpiAttenteEl.textContent = kpiAttente;
        if (kpiValidesEl) kpiValidesEl.textContent = kpiValides;

        // 3. Filtrer par recherche texte et par statut
        list = list.filter(function (item) {
            if (statusFilter !== 'tous' && item.statut !== statusFilter) return false;

            if (searchVal) {
                var hay = (item.bs + ' ' + item.code + ' ' + item.designation + ' ' + item.initiateur + ' ' + item.beneficiaire + ' ' + item.origine + ' ' + item.destination).toLowerCase();
                if (hay.indexOf(searchVal) === -1) return false;
            }
            return true;
        });

        // Mettre à jour le nombre de résultats dans la pagination
        var resultsEl = root.querySelector('[data-retours-results]');
        if (resultsEl) resultsEl.textContent = list.length + (list.length > 1 ? ' résultats' : ' résultat');

        // 4. Générer le HTML du tableau
        if (!tbody) return;
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center cell-muted">Aucun article à rendre ne correspond aux filtres.</td></tr>';
            return;
        }

        var html = '';
        list.forEach(function (item, index) {
            var badgeClass = 'badge--info';
            if (item.statut === 'En attente') badgeClass = 'badge--encours';
            else if (item.statut === 'En retard') badgeClass = 'badge--retard';
            else if (item.statut === 'Retourné') badgeClass = 'badge--valide';

            // Déterminer les colonnes de personnes/magasins
            var persCol1 = '';
            var persCol2 = '';
            if (role === 'admin') {
                persCol1 = escapeHtml(item.initiateur) + ' <br><span class="cell-muted" style="font-size:0.75rem">' + escapeHtml(item.origine) + '</span>';
                persCol2 = escapeHtml(item.beneficiaire) + ' <br><span class="cell-muted" style="font-size:0.75rem">' + escapeHtml(item.destination) + '</span>';
            } else {
                if (activeTab === 'tab1') {
                    persCol1 = escapeHtml(item.initiateur);
                    persCol2 = escapeHtml(item.origine);
                } else {
                    persCol1 = escapeHtml(item.beneficiaire);
                    persCol2 = escapeHtml(item.destination);
                }
            }

            // Boutons d'action
            var urlBS = (role === 'admin') ? 'index.html?page=admin/bs-detail' : 'index.html?page=lambda/bs-detail';
            var actionHtml = '<a class="action-btn action-btn--view" href="' + urlBS + '" title="Voir le bon de sortie lié"><i class="fa-solid fa-eye"></i></a>';

            // Bouton de validation interactive du retour (seulement si non retourné)
            if (item.statut !== 'Retourné') {
                actionHtml += '<button class="action-btn action-btn--success" type="button" data-valider-retour="' + escapeHtml(item.bs) + '" data-valider-code="' + escapeHtml(item.code) + '" title="Confirmer la réception du retour de cet article">' +
                             '    <i class="fa-solid fa-check"></i>' +
                             '</button>';
            }

            html += '<tr>' +
                    '    <td><a class="cell-link" href="' + urlBS + '">' + escapeHtml(item.bs) + '</a></td>' +
                    '    <td class="mono">' + escapeHtml(item.code) + '</td>' +
                    '    <td>' + escapeHtml(item.designation) + '</td>' +
                    '    <td>' + item.qte + '</td>' +
                    '    <td class="' + (item.statut === 'En retard' ? 'text-red' : '') + '">' + escapeHtml(item.dateRetour) + '</td>' +
                    '    <td>' + persCol1 + '</td>' +
                    '    <td>' + persCol2 + '</td>' +
                    '    <td><span class="badge-status ' + badgeClass + '">' + escapeHtml(item.statut) + '</span></td>' +
                    '    <td class="cell-actions">' + actionHtml + '</td>' +
                    '</tr>';
        });

        tbody.innerHTML = html;

        // Liaison de l'action de validation
        tbody.querySelectorAll('[data-valider-retour]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var bsNum = this.getAttribute('data-valider-retour');
                var artCode = this.getAttribute('data-valider-code');

                // Simuler la validation du retour
                for (var i = 0; i < RETOURS.length; i++) {
                    if (RETOURS[i].bs === bsNum && RETOURS[i].code === artCode) {
                        RETOURS[i].statut = 'Retourné';
                        break;
                    }
                }

                // Ré-appliquer le rendu
                apply();
            });
        });
    }

    function boot() {
        var root = document.querySelector('[data-retours]');
        if (!root) return false;
        if (root.getAttribute('data-retours-bound')) return true;
        root.setAttribute('data-retours-bound', '1');

        // Liaison des écouteurs de la barre de filtres
        var searchInput = root.querySelector('[data-retours-search]');
        var selectFilter = root.querySelector('[data-retours-statut-select]');
        var resetBtn = root.querySelector('[data-retours-reset]');

        if (searchInput) {
            searchInput.addEventListener('input', apply);
        }
        if (selectFilter) {
            selectFilter.addEventListener('change', apply);
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                if (searchInput) searchInput.value = '';
                if (selectFilter) selectFilter.value = 'tous';
                apply();
            });
        }

        initTabs();
        apply();
        return true;
    }

    // Lancement au chargement du DOM ou après routage SPA S2M-WEB
    document.addEventListener('DOMContentLoaded', boot);

    // Dans le système SPA de app.js, on observe le chargement dynamique du contenu
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.addedNodes.length) {
                boot();
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();

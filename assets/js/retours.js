/* ============================================================
   RETOURS — suivi des retours de matériel (mockup S2M-WEB)
   ============================================================ */
(function () {
    'use strict';

    // Base de données de démo des retours d'articles (synchronisée avec bs-detail.html)
    var RETOURS = [
        { bs: 'BS-2026-0142', code: 'MAT-011', designation: 'Écran 24" Dell P2422H', qte: 2, dateRetour: '12/09/2026', initiateur: 'Rakotobe Hery', beneficiaire: 'Rasoanirina Miora', origine: 'Magasin central', destination: 'Siège - Administration S2M', statut: 'En attente' },
        { bs: 'BS-2026-0142', code: 'MAT-008', designation: 'Ordinateur portable Dell Latitude 5440', qte: 1, dateRetour: '12/09/2026', initiateur: 'Rakotobe Hery', beneficiaire: 'Rasoanirina Miora', origine: 'Magasin central', destination: 'Siège - Administration S2M', statut: 'Retourné (Expédié)' },
        { bs: 'BS-2026-0138', code: 'MAT-019', designation: 'Vidéoprojecteur Epson', qte: 1, dateRetour: '20/09/2026', initiateur: 'Rabenjanahary Mamy', beneficiaire: 'Razafindrakoto Lova', origine: 'Siège - Administration S2M', destination: 'Magasin central', statut: 'En attente' },
        { bs: 'BS-2026-0134', code: 'MAT-088', designation: 'Multimètre Fluke 179', qte: 1, dateRetour: '14/08/2026', initiateur: 'Rabeharisoa Andry', beneficiaire: 'Rakotobe Hery', origine: 'Entrepôt S2M', destination: 'Magasin central', statut: 'En retard' },
        { bs: 'BS-2026-0130', code: 'MAT-045', designation: 'Perceuse à percussion Bosch', qte: 1, dateRetour: '05/08/2026', initiateur: 'Rakotobe Hery', beneficiaire: 'Razafindrakoto Lova', origine: 'Magasin central', destination: 'Entrepôt S2M', statut: 'Réceptionné (Clôturé)' }
    ];

    var CURRENT_USER = 'Rakotobe Hery'; // Utilisateur Personnel (lambda) connecté par défaut

    function currentRole() {
        var raw = new URLSearchParams(location.search).get('page') || '';
        return raw.split('/')[0] || null;
    }

    function pageName() {
        var raw = new URLSearchParams(location.search).get('page') || '';
        var parts = raw.split('/');
        return parts[parts.length - 1] || 'bs-list';
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    var activeTab = 'tab1';
    var pendingAction = null;

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
                '    <i class="fa-solid fa-arrow-right-from-bracket"></i> Emprunts' +
                '</button>' +
                '<button class="mock-tab ' + (activeTab === 'tab2' ? 'active' : '') + '" data-tab="tab2" type="button">' +
                '    <i class="fa-solid fa-arrow-right-to-bracket"></i> Prêts' +
                '</button>';
        }

        tabsContainer.innerHTML = html;

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

        // Configuration des en-têtes
        var col1 = root.querySelector('[data-col-personne1]');
        var col2 = root.querySelector('[data-col-personne2]');
        if (col1 && col2) {
            if (role === 'admin') {
                col1.textContent = 'Initiateur / Source';
                col2.textContent = 'Bénéficiaire / Destinataire';
            } else {
                col1.textContent = (activeTab === 'tab1') ? 'Prêté par (Initiateur)' : 'Emprunté par (Bénéficiaire)';
                col2.textContent = (activeTab === 'tab1') ? 'Magasin d\'origine' : 'Magasin destinataire';
            }
        }

        // 1. Filtrer selon l'onglet courant et le rôle
        var list = RETOURS.filter(function (item) {
            if (role === 'admin') {
                if (activeTab === 'tab1') {
                    return item.statut !== 'Réceptionné (Clôturé)';
                } else {
                    return item.statut === 'Réceptionné (Clôturé)';
                }
            } else {
                // Rôle Personnel
                if (activeTab === 'tab1') {
                    // Ce que je dois rendre (Je suis bénéficiaire/destinataire)
                    return item.beneficiaire === CURRENT_USER;
                } else {
                    // Ce qu'on doit me rendre (Je suis l'initiateur/source)
                    return item.initiateur === CURRENT_USER;
                }
            }
        });

        // 2. Calculer les statistiques KPI
        var kpiRetard = 0;
        var kpiAttente = 0;
        var kpiValides = 0;

        list.forEach(function (item) {
            if (item.statut === 'En retard') kpiRetard++;
            else if (item.statut === 'En attente' || item.statut === 'Retourné (Expédié)') kpiAttente++;
            else if (item.statut === 'Réceptionné (Clôturé)') kpiValides++;
        });

        var kpiRetardEl = root.querySelector('[data-kpi-retard]');
        var kpiAttenteEl = root.querySelector('[data-kpi-attente]');
        var kpiValidesEl = root.querySelector('[data-kpi-valides]');
        if (kpiRetardEl) kpiRetardEl.textContent = kpiRetard;
        if (kpiAttenteEl) kpiAttenteEl.textContent = kpiAttente;
        if (kpiValidesEl) kpiValidesEl.textContent = kpiValides;

        // 3. Filtrer par barre de recherche et filtre de statut
        list = list.filter(function (item) {
            if (statusFilter !== 'tous' && item.statut !== statusFilter) return false;

            if (searchVal) {
                var hay = (item.bs + ' ' + item.code + ' ' + item.designation + ' ' + item.initiateur + ' ' + item.beneficiaire + ' ' + item.origine + ' ' + item.destination).toLowerCase();
                if (hay.indexOf(searchVal) === -1) return false;
            }
            return true;
        });

        // Pagination
        var resultsEl = root.querySelector('[data-retours-results]');
        if (resultsEl) resultsEl.textContent = list.length + (list.length > 1 ? ' résultats' : ' résultat');

        // 4. Générer le HTML
        if (!tbody) return;
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center cell-muted">Aucun article à rendre ne correspond aux filtres.</td></tr>';
            return;
        }

        var html = '';
        list.forEach(function (item) {
            var badgeClass = 'badge--info';
            var labelText = item.statut;

            if (item.statut === 'En attente') {
                badgeClass = 'badge--encours';
                labelText = (role === 'admin' || activeTab === 'tab2') ? 'Chez le bénéficiaire' : 'À retourner';
            } else if (item.statut === 'En retard') {
                badgeClass = 'badge--retard';
                labelText = (role === 'admin' || activeTab === 'tab2') ? 'Retard de renvoi' : 'En retard';
            } else if (item.statut === 'Retourné (Expédié)') {
                badgeClass = 'badge--info';
                labelText = 'Retour expédié';
            } else if (item.statut === 'Réceptionné (Clôturé)') {
                badgeClass = 'badge--valide';
                labelText = 'Clôturé';
            }

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

            // Boutons d'actions contextuels
            var urlBS = (role === 'admin') ? 'index.html?page=admin/bs-detail' : 'index.html?page=lambda/bs-detail';
            var actionHtml = '<a class="action-btn action-btn--view" href="' + urlBS + '" title="Voir le bon de sortie lié"><i class="fa-solid fa-eye"></i></a>';

            if (role !== 'admin') {
                if (activeTab === 'tab1' && (item.statut === 'En attente' || item.statut === 'En retard')) {
                    // Je dois le rendre -> Action d'expédition
                    actionHtml += '<button class="action-btn action-btn--info" type="button" data-expedier-retour="' + escapeHtml(item.bs) + '" data-expedier-code="' + escapeHtml(item.code) + '" title="Enregistrer le retour (Expédier vers le magasin d\'origine)">' +
                        '    <i class="fa-solid fa-paper-plane"></i>' +
                        '</button>';
                } else if (activeTab === 'tab2' && item.statut === 'Retourné (Expédié)') {
                    // On doit me le rendre et il est expédié -> Action de réception
                    actionHtml += '<button class="action-btn action-btn--success" type="button" data-recevoir-retour="' + escapeHtml(item.bs) + '" data-recevoir-code="' + escapeHtml(item.code) + '" title="Valider la réception du retour de cet article">' +
                        '    <i class="fa-solid fa-check"></i>' +
                        '</button>';
                }
            }

            html += '<tr>' +
                '    <td><a class="cell-link" href="' + urlBS + '">' + escapeHtml(item.bs) + '</a></td>' +
                '    <td class="mono">' + escapeHtml(item.code) + '</td>' +
                '    <td>' + escapeHtml(item.designation) + '</td>' +
                '    <td>' + item.qte + '</td>' +
                '    <td class="' + (item.statut === 'En retard' ? 'text-red' : '') + '">' + escapeHtml(item.dateRetour) + '</td>' +
                '    <td>' + persCol1 + '</td>' +
                '    <td>' + persCol2 + '</td>' +
                '    <td><span class="badge-status ' + badgeClass + '">' + labelText + '</span></td>' +
                '    <td class="cell-actions">' + actionHtml + '</td>' +
                '</tr>';
        });

        tbody.innerHTML = html;

        // Liaison des écouteurs d'action d'expédition
        tbody.querySelectorAll('[data-expedier-retour]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var bsNum = this.getAttribute('data-expedier-retour');
                var artCode = this.getAttribute('data-expedier-code');

                pendingAction = { type: 'expedier', bs: bsNum, code: artCode };
                showConfirmModal(
                    '<i class="fa-solid fa-paper-plane text-teal"></i> Enregistrer le retour',
                    'Voulez-vous enregistrer l\'expédition de l\'article <strong>' + escapeHtml(artCode) + '</strong> (BS ' + escapeHtml(bsNum) + ') vers son magasin d\'origine ?'
                );
            });
        });

        // Liaison des écouteurs d'action de réception
        tbody.querySelectorAll('[data-recevoir-retour]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var bsNum = this.getAttribute('data-recevoir-retour');
                var artCode = this.getAttribute('data-recevoir-code');

                pendingAction = { type: 'recevoir', bs: bsNum, code: artCode };
                showConfirmModal(
                    '<i class="fa-solid fa-circle-check text-teal"></i> Confirmer la réception',
                    'Voulez-vous valider la réception du retour de l\'article <strong>' + escapeHtml(artCode) + '</strong> (BS ' + escapeHtml(bsNum) + ') dans votre magasin ?'
                );
            });
        });
    }

    function showConfirmModal(title, message) {
        var modal = document.querySelector('[data-modal="confirm-retour"]');
        if (!modal) return;
        var titleEl = modal.querySelector('[data-confirm-modal-title]');
        var messageEl = modal.querySelector('[data-confirm-modal-message]');
        if (titleEl) titleEl.innerHTML = title;
        if (messageEl) messageEl.innerHTML = message;
        modal.removeAttribute('hidden');
        document.body.classList.add('modal-open');
    }

    function closeConfirmModal() {
        var modal = document.querySelector('[data-modal="confirm-retour"]');
        if (modal) {
            modal.setAttribute('hidden', '');
            document.body.classList.remove('modal-open');
        }
        pendingAction = null;
    }

    function bootList(root) {
        if (root.getAttribute('data-retours-bound')) return true;
        root.setAttribute('data-retours-bound', '1');

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

        var confirmBtn = root.querySelector('[data-confirm-modal-btn]');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function () {
                if (pendingAction) {
                    var bsNum = pendingAction.bs;
                    var artCode = pendingAction.code;
                    var type = pendingAction.type;

                    for (var i = 0; i < RETOURS.length; i++) {
                        if (RETOURS[i].bs === bsNum && RETOURS[i].code === artCode) {
                            if (type === 'expedier') {
                                RETOURS[i].statut = 'Retourné (Expédié)';
                            } else if (type === 'recevoir') {
                                RETOURS[i].statut = 'Réceptionné (Clôturé)';
                            }
                            break;
                        }
                    }
                    closeConfirmModal();
                    apply();
                }
            });
        }

        initTabs();
        apply();
        return true;
    }

    function bootDetail(refEl) {
        var section = refEl.closest('section');
        if (!section) return false;
        var tbody = section.querySelector('.table-mock tbody');
        if (!tbody) return false;

        if (tbody.getAttribute('data-retours-detail-bound')) return true;
        tbody.setAttribute('data-retours-detail-bound', '1');

        var bsNum = refEl.textContent.trim();

        var rows = tbody.querySelectorAll('tr');
        rows.forEach(function (row) {
            var codeCell = row.querySelector('.mono');
            if (!codeCell) return;
            var code = codeCell.textContent.trim();

            var item = null;
            for (var i = 0; i < RETOURS.length; i++) {
                if (RETOURS[i].bs === bsNum && RETOURS[i].code === code) {
                    item = RETOURS[i];
                    break;
                }
            }

            if (item) {
                var cells = row.querySelectorAll('td');
                var statusCell = cells[cells.length - 1];
                if (statusCell) {
                    var badgeClass = 'badge--info';
                    var labelText = item.statut;

                    if (item.statut === 'En attente') {
                        badgeClass = 'badge--encours';
                        labelText = 'En attente';
                    } else if (item.statut === 'En retard') {
                        badgeClass = 'badge--retard';
                        labelText = 'En retard';
                    } else if (item.statut === 'Retourné (Expédié)') {
                        badgeClass = 'badge--info';
                        labelText = 'Retour expédié';
                    } else if (item.statut === 'Réceptionné (Clôturé)') {
                        badgeClass = 'badge--valide';
                        labelText = 'Réceptionné';
                    }

                    statusCell.innerHTML = '<span class="badge-status ' + badgeClass + '">' + labelText + '</span>';
                }
            }
        });
        return true;
    }

    function boot() {
        var retoursRoot = document.querySelector('[data-retours]');
        if (retoursRoot) {
            return bootList(retoursRoot);
        }

        var bsDetailRoot = document.querySelector('[data-bs-ref]');
        if (bsDetailRoot) {
            return bootDetail(bsDetailRoot);
        }

        return false;
    }

    document.addEventListener('DOMContentLoaded', boot);

    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.addedNodes.length) {
                boot();
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Rendre accessible globalement pour synchronisation
    window.S2M = window.S2M || {};
    window.S2M.retoursList = RETOURS;

})();

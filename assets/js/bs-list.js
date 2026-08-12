/* ============================================================
   BS-LIST — liste des bons de sortie (mockup S2M-WEB)

   La page « Liste des BS » est organisée en deux sous-menus,
   comme l'espace administration :
     - « BS envoyés »   : bons partis du magasin de la personne
                          connectée ;
     - « BS à recevoir »: bons dont la destination est ce magasin,
                          avec un filtre « à rendre ou non ».
   Le choix de la personne connectée redistribue les deux listes.
   ============================================================ */
(function () {
    'use strict';

    var PEOPLE = [
        { name: 'Rakotobe Hery',        store: 'Magasin central' },
        { name: 'Razafindratsima Vola', store: 'Magasin central' },
        { name: 'Rabemananjara Solo',   store: 'Plateforme logistique' },
        { name: 'Andrianarivo Tovo',    store: 'Poste de contrôle' },
        { name: 'Randria Jean',         store: 'Siège - Administration S2M' },
        { name: 'Rasoanirina Miora',    store: 'Siège - Administration S2M' }
    ];

    /* Données de démo — retour = true si des articles du bon doivent
       revenir au magasin d'origine (matériel à rendre). */
    var BS = [
        { bs: 'BS-2026-0142', date: '12/08/2026', initiateur: 'Rakotobe Hery',        beneficiaire: 'Rasoanirina Miora',  origine: 'Magasin central', destination: 'Siège - Administration S2M', motif: 'Équipement informatique', statut: 'En cours', retour: true },
        { bs: 'BS-2026-0141', date: '11/08/2026', initiateur: 'Razafindratsima Vola', beneficiaire: 'Rabeharisoa Andry',  origine: 'Entrepôt S2M',     destination: 'Magasin central',           motif: 'Réapprovisionnement',   statut: 'Clôturé',  retour: false },
        { bs: 'BS-2026-0140', date: '10/08/2026', initiateur: 'Rakotobe Hery',        beneficiaire: 'Ranarivelo Tsiky',   origine: 'Magasin central', destination: 'Entrepôt S2M',               motif: 'Fournitures de bureau', statut: 'Validé',   retour: false },
        { bs: 'BS-2026-0139', date: '09/08/2026', initiateur: 'Andrianarivo Tovo',    beneficiaire: 'Rasoanirina Miora',  origine: 'Magasin central', destination: 'Siège - Administration S2M', motif: 'Matériel de sécurité',  statut: 'Refusé',   retour: false },
        { bs: 'BS-2026-0138', date: '08/08/2026', initiateur: 'Rabenjanahary Mamy',   beneficiaire: 'Razafindrakoto Lova', origine: 'Siège - Administration S2M', destination: 'Magasin central', motif: 'Retour de matériel',   statut: 'Soumis',   retour: true },
        { bs: 'BS-2026-0137', date: '07/08/2026', initiateur: 'Rakotobe Hery',        beneficiaire: 'Rasoanirina Miora',  origine: 'Magasin central', destination: 'Siège - Administration S2M', motif: 'Équipement informatique', statut: 'Brouillon', retour: true },
        { bs: 'BS-2026-0136', date: '06/08/2026', initiateur: 'Razafindratsima Vola', beneficiaire: 'Rabeharisoa Andry',  origine: 'Entrepôt S2M',     destination: 'Magasin central',           motif: 'Équipement mobilier',   statut: 'Annulé',   retour: false },
        { bs: 'BS-2026-0135', date: '05/08/2026', initiateur: 'Rakotomalala Njato',   beneficiaire: 'Rasolofoniaina Fanja', origine: 'Magasin central', destination: 'Entrepôt S2M',              motif: 'Consommables atelier',  statut: 'Clôturé',  retour: false }
    ];

    var STATUTS = ['Brouillon', 'Soumis', 'En cours', 'Validé', 'Refusé', 'Annulé', 'Clôturé'];

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    var STATUT_CLASS = {
        'Brouillon': 'badge--brouillon',
        'Soumis':    'badge--soumis',
        'En cours':  'badge--encours',
        'Validé':    'badge--valide',
        'Refusé':    'badge--refuse',
        'Annulé':    'badge--annule',
        'Clôturé':   'badge--cloture'
    };

    function badgeStatut(s) {
        return '<span class="badge-status ' + (STATUT_CLASS[s] || 'badge--info') + '">' + escapeHtml(s) + '</span>';
    }

    /* Retour attendu : amber = à rendre, teal = sans retour */
    function badgeRetour(retour) {
        return retour
            ? '<span class="badge-status badge--encours"><i class="fa-solid fa-rotate-left"></i> À rendre</span>'
            : '<span class="badge-status badge--valide">Sans retour</span>';
    }

    function actions(b) {
        var html = '<a class="btn-mock btn-mock--outline btn-mock--sm" href="index.html?page=bs-detail" title="Voir le détail"><i class="fa-solid fa-eye"></i></a>';
        if (b.statut === 'Brouillon') {
            html += '<a class="btn-mock btn-mock--outline btn-mock--sm" href="index.html?page=bs-create" title="Modifier"><i class="fa-solid fa-pen"></i></a>' +
                    '<button class="btn-mock btn-mock--danger btn-mock--sm" type="button" title="Annuler ce brouillon"><i class="fa-solid fa-xmark"></i></button>';
        }
        return html;
    }

    function rowHtml(b, withExp) {
        return '<tr>' +
            '<td><a class="cell-link" href="index.html?page=bs-detail">' + escapeHtml(b.bs) + '</a></td>' +
            '<td>' + escapeHtml(b.date) + '</td>' +
            '<td>' + escapeHtml(withExp ? b.initiateur : b.beneficiaire) + '</td>' +
            '<td class="cell-muted">' + escapeHtml(b.origine) + ' → ' + escapeHtml(b.destination) + '</td>' +
            '<td>' + badgeRetour(b.retour) + '</td>' +
            '<td>' + escapeHtml(b.motif) + '</td>' +
            '<td>' + badgeStatut(b.statut) + '</td>' +
            '<td class="cell-actions">' + actions(b) + '</td>' +
        '</tr>';
    }

    function renderPanel(tab, rows, total) {
        var root = document.querySelector('[data-bslist]');
        if (!root) return;
        var tbody = root.querySelector('[data-bslist-body][data-tab="' + tab + '"]');
        if (!tbody) return;

        var store = currentStore();
        if (!rows.length) {
            var msg = tab === 'envoyes'
                ? 'Aucun BS envoyé par <strong>' + escapeHtml(store) + '</strong>'
                : 'Aucun BS à recevoir pour <strong>' + escapeHtml(store) + '</strong>';
            tbody.innerHTML = '<tr><td colspan="8" class="cell-muted text-center py-3">' + msg + '.</td></tr>';
        } else {
            tbody.innerHTML = rows.map(function (b) {
                return rowHtml(b, tab === 'recevoir');
            }).join('');
        }

        var res = root.querySelector('[data-bslist-results][data-tab="' + tab + '"]');
        if (res) {
            var nb = rows.length;
            res.textContent = nb + (nb > 1 ? ' résultat(s)' : ' résultat') +
                ' / ' + total + (total > 1 ? ' bons' : ' bon') + ' pour ce magasin';
        }
        var count = root.querySelector('[data-bslist-count][data-tab="' + tab + '"]');
        if (count) count.textContent = total;
    }

    function currentPerson() {
        var sel = document.querySelector('[data-bslist-user]');
        var name = sel ? sel.value : PEOPLE[0].name;
        for (var i = 0; i < PEOPLE.length; i++) {
            if (PEOPLE[i].name === name) return PEOPLE[i];
        }
        return PEOPLE[0];
    }

    function currentStore() { return currentPerson().store; }

    function filterList(list, tab) {
        var root = document.querySelector('[data-bslist]');
        var panel = root.querySelector('[data-mock-panel="' + tab + '"]');
        var q = (panel.querySelector('[data-bslist-search]').value || '').trim().toLowerCase();
        var st = panel.querySelector('[data-bslist-statut]').value;
        var rt = panel.querySelector('[data-bslist-retour]').value;
        return list.filter(function (b) {
            if (q) {
                var hay = (b.bs + ' ' + b.initiateur + ' ' + b.beneficiaire + ' ' + b.motif).toLowerCase();
                if (hay.indexOf(q) === -1) return false;
            }
            if (st && b.statut !== st) return false;
            if (rt === 'a-rendre' && !b.retour) return false;
            if (rt === 'sans-retour' && b.retour) return false;
            return true;
        });
    }

    function apply() {
        var root = document.querySelector('[data-bslist]');
        if (!root) return;
        var store = currentStore();

        var env = BS.filter(function (b) { return b.origine === store; });
        var rec = BS.filter(function (b) { return b.destination === store; });

        renderPanel('envoyes', filterList(env, 'envoyes'), env.length);
        renderPanel('recevoir', filterList(rec, 'recevoir'), rec.length);

        var chip = root.querySelector('[data-bslist-store]');
        if (chip) chip.textContent = 'Mon magasin : ' + store;
    }

    function fillSelect(select, options, selected) {
        if (!select) return;
        select.innerHTML = options.map(function (o) {
            return '<option value="' + escapeHtml(o) + '"' + (o === selected ? ' selected' : '') + '>' + escapeHtml(o) + '</option>';
        }).join('');
    }

    function boot() {
        var root = document.querySelector('[data-bslist]');
        if (!root) return false;

        var userSel = root.querySelector('[data-bslist-user]');
        if (userSel && !userSel.getAttribute('data-bound')) {
            userSel.setAttribute('data-bound', '1');
            fillSelect(userSel, PEOPLE.map(function (p) { return p.name; }), PEOPLE[0].name);
            userSel.addEventListener('change', apply);
        }

        root.querySelectorAll('[data-bslist-panel]').forEach(function (panel) {
            if (panel.getAttribute('data-bound')) return;
            panel.setAttribute('data-bound', '1');
            panel.addEventListener('input', apply);
            panel.addEventListener('change', apply);
            var reset = panel.querySelector('[data-bslist-reset]');
            if (reset) {
                reset.addEventListener('click', function () {
                    var search = panel.querySelector('[data-bslist-search]');
                    var statut = panel.querySelector('[data-bslist-statut]');
                    var retour = panel.querySelector('[data-bslist-retour]');
                    if (search) search.value = '';
                    if (statut) statut.value = '';
                    if (retour) retour.value = 'tous';
                    apply();
                });
            }
        });

        apply();
        return true;
    }

    if (!boot()) {
        var timer = setInterval(function () {
            if (boot()) clearInterval(timer);
        }, 100);
        setTimeout(function () { clearInterval(timer); }, 4000);
    }
})();

/* ============================================================
   MOCKUP — interactions de la maquette statique
   1. Marquage du lien actif dans le menu hamburger (data-page)
   2. Onglets [data-mock-tabs] / [data-mock-tab] / [data-mock-panel]
   ============================================================ */
(function () {
    'use strict';

    /* --- 1. Lien actif dans le menu hamburger --- */
    function openGroup(group) {
        if (!group) return;
        group.classList.add('open');
        var toggle = group.querySelector('.floating-menu-group__toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'true');
    }

    function markActive() {
        var menu = document.querySelector('.floating-menu-content');
        if (!menu) return false;

        var page = new URLSearchParams(location.search).get('page') || 'bs-list';
        var matched = false;
        var links = menu.querySelectorAll('.floating-menu-link[data-page]');
        for (var i = 0; i < links.length; i++) {
            if (links[i].getAttribute('data-page') === page) {
                links[i].classList.add('active');
                // déplie automatiquement le groupe de la page courante
                openGroup(links[i].closest('.floating-menu-group'));
                matched = true;
            }
        }

        // Pages de détail (non listées dans le menu) : on ouvre simplement
        // le groupe correspondant, sans surligner de lien.
        if (!matched) {
            var toggles = menu.querySelectorAll('.floating-menu-group__toggle[data-section]');
            for (var j = 0; j < toggles.length; j++) {
                if (page.indexOf(toggles[j].getAttribute('data-section')) === 0) {
                    openGroup(toggles[j].closest('.floating-menu-group'));
                    break;
                }
            }
        }
        return true;
    }

    /* Pré-remplissage du formulaire d'anomalie depuis l'URL (bs / point) */
    function prefillAnomalieForm() {
        var bsSelect = document.querySelector('#ano-bs');
        if (!bsSelect) return;

        var params = new URLSearchParams(location.search);
        var bs = params.get('bs');
        var point = params.get('magasin') || params.get('point');

        if (bs) {
            for (var i = 0; i < bsSelect.options.length; i++) {
                if (bsSelect.options[i].value === bs) bsSelect.value = bs;
            }
        }
        var pointSelect = document.querySelector('#ano-point');
        if (point && pointSelect) {
            for (var j = 0; j < pointSelect.options.length; j++) {
                if (pointSelect.options[j].value === point) pointSelect.value = point;
            }
        }
    }

    function boot() {
        var done = markActive();
        if (done) prefillAnomalieForm();
        return done;
    }

    if (!boot()) {
        var timer = setInterval(function () {
            if (boot()) clearInterval(timer);
        }, 100);
        setTimeout(function () { clearInterval(timer); }, 3000);
    }

    /* --- 2. Accordéon des groupes du menu hamburger --- */
    document.addEventListener('click', function (event) {
        var toggle = event.target.closest('.floating-menu-group__toggle');
        if (!toggle) return;

        var group = toggle.closest('.floating-menu-group');
        var content = group ? group.closest('.floating-menu-content') : null;
        if (!content) return;

        var willOpen = !group.classList.contains('open');

        // accordéon : un seul groupe ouvert à la fois
        var groups = content.querySelectorAll('.floating-menu-group');
        for (var i = 0; i < groups.length; i++) {
            groups[i].classList.remove('open');
            var t = groups[i].querySelector('.floating-menu-group__toggle');
            if (t) t.setAttribute('aria-expanded', 'false');
        }

        if (willOpen) {
            group.classList.add('open');
            toggle.setAttribute('aria-expanded', 'true');
        }
    });

    /* --- 3. Soumission du formulaire de création d'anomalie --- */
    document.addEventListener('submit', function (event) {
        var form = event.target.closest('[data-anomalie-form]');
        if (!form) return;
        event.preventDefault();

        var success = document.querySelector('[data-anomalie-success]');
        if (!success) return;

        var code = form.getAttribute('data-next-code');
        var codeEl = success.querySelector('[data-anomalie-code]');
        if (code && codeEl) codeEl.textContent = code;

        var bsSelect = form.querySelector('#ano-bs');
        var bsEl = success.querySelector('[data-anomalie-bs]');
        if (bsSelect && bsEl && bsSelect.value) bsEl.textContent = bsSelect.value;

        form.classList.add('is-hidden');
        success.classList.remove('is-hidden');
    });

    /* --- 4. Onglets --- */
    document.addEventListener('click', function (event) {
        var tab = event.target.closest('[data-mock-tab]');
        if (!tab) return;

        var group = tab.closest('[data-mock-tabs]');
        if (!group) return;

        var target = tab.getAttribute('data-mock-tab');
        var tabs = group.querySelectorAll('[data-mock-tab]');
        // Les panneaux sont des frères de la barre d'onglets, pas des descendants
        var panels = document.querySelectorAll('[data-mock-panel]');

        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.toggle('active', tabs[i] === tab);
        }
        for (var j = 0; j < panels.length; j++) {
            panels[j].classList.toggle('is-active', panels[j].getAttribute('data-mock-panel') === target);
        }
    });

    /* --- 5. Modale générique ---
       Un bouton [data-modal-open="x"] ouvre [data-modal="x"].
       Fermeture : croix, clic sur le fond, ou touche Échap. */
    document.addEventListener('click', function (event) {
        var opener = event.target.closest('[data-modal-open]');
        if (opener) {
            var target = opener.getAttribute('data-modal-open');
            var modal = document.querySelector('[data-modal="' + target + '"]');
            if (modal) {
                // le contenu de la modale peut arriver après le boot :
                // on (re)rend le QR au moment de l'ouverture
                if (window.S2M && window.S2M.qr) window.S2M.qr.renderAll();
                modal.hidden = false;
                document.body.classList.add('modal-open');
            }
            return;
        }

        if (event.target.closest('[data-modal-close]')) {
            var closeModal = event.target.closest('[data-modal]');
            if (closeModal) {
                closeModal.hidden = true;
                document.body.classList.remove('modal-open');
            }
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        var open = document.querySelector('[data-modal]:not([hidden])');
        if (open) {
            open.hidden = true;
            document.body.classList.remove('modal-open');
        }
    });

    /* --- 6. Bouton « Retour » : retour à la page précédente --- */
    document.addEventListener('click', function (event) {
        var back = event.target.closest('[data-go-back]');
        if (!back) return;
        event.preventDefault();
        history.back();
    });

    /* --- 7. Notifications : filtres cliquables + marquer comme lu --- */
    function notifCount(section) {
        var feed = section ? section.querySelector('[data-notif]') : null;
        if (!feed) return 0;
        return feed.querySelectorAll('.notif-item.unread').length;
    }

    function notifUpdateCount(section) {
        var countEl = section ? section.querySelector('[data-notif-count]') : null;
        if (!countEl) return;
        var nb = notifCount(section);
        countEl.textContent = nb + (nb > 1 ? ' non lues' : ' non lue');
    }

    /* filtres : Toutes / Non lues / Anomalies / Retards / Résolutions */
    document.addEventListener('click', function (event) {
        var chip = event.target.closest('[data-notif-filter]');
        if (!chip) return;

        var section = chip.closest('section');
        var feed = section ? section.querySelector('[data-notif]') : null;
        if (!feed) return;

        var filter = chip.getAttribute('data-notif-filter');
        section.querySelectorAll('[data-notif-filter]').forEach(function (c) {
            c.classList.toggle('chip--active', c === chip);
        });

        feed.querySelectorAll('.notif-item').forEach(function (item) {
            var show;
            if (filter === 'toutes') show = true;
            else if (filter === 'non-lues') show = item.classList.contains('unread');
            else show = item.getAttribute('data-notif-cat') === filter;
            item.classList.toggle('is-hidden', !show);
        });
    });

    /* clic sur une notification : marquée comme lue puis ouverture */
    document.addEventListener('click', function (event) {
        var item = event.target.closest('[data-notif-href]');
        if (!item) return;

        var section = item.closest('section');
        if (item.classList.contains('unread')) {
            item.classList.remove('unread');
            notifUpdateCount(section);
            // si le filtre « Non lues » est actif, la notification disparaît
            var active = section.querySelector('[data-notif-filter].chip--active');
            if (active && active.getAttribute('data-notif-filter') === 'non-lues') {
                item.classList.add('is-hidden');
            }
        }
        location.href = item.getAttribute('data-notif-href');
    });

    /* tout marquer comme lu */
    document.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-notif-mark-read]');
        if (!btn) return;

        var section = btn.closest('section');
        var feed = section ? section.querySelector('[data-notif]') : null;
        if (!feed) return;

        feed.querySelectorAll('.notif-item.unread').forEach(function (item) {
            item.classList.remove('unread');
        });
        notifUpdateCount(section);
        btn.setAttribute('disabled', 'disabled');

        // si le filtre « Non lues » est actif, tout disparaît
        var active = section.querySelector('[data-notif-filter].chip--active');
        if (active && active.getAttribute('data-notif-filter') === 'non-lues') {
            feed.querySelectorAll('.notif-item').forEach(function (item) {
                item.classList.add('is-hidden');
            });
        }
    });

    /* --- 8. Anomalie : proposer une solution --- */
    document.addEventListener('click', function (event) {
        var toggle = event.target.closest('[data-solution-toggle]');
        if (!toggle) return;
        var card = toggle.closest('[data-solution]');
        if (!card) return;
        card.querySelector('[data-solution-toggle-row]').classList.add('is-hidden');
        var form = card.querySelector('[data-solution-form]');
        form.classList.remove('is-hidden');
        var input = card.querySelector('[data-solution-input]');
        if (input) input.focus();
    });

    document.addEventListener('click', function (event) {
        var cancel = event.target.closest('[data-solution-cancel]');
        if (!cancel) return;
        var card = cancel.closest('[data-solution]');
        if (!card) return;
        card.querySelector('[data-solution-form]').classList.add('is-hidden');
        card.querySelector('[data-solution-toggle-row]').classList.remove('is-hidden');
    });

    document.addEventListener('submit', function (event) {
        var form = event.target.closest('[data-solution-form]');
        if (!form) return;
        event.preventDefault();
        var card = form.closest('[data-solution]');
        if (!card) return;
        var input = form.querySelector('[data-solution-input]');
        var text = (input.value || '').trim();
        if (!text) { input.focus(); return; }

        var textEl = card.querySelector('[data-solution-text]');
        if (textEl) textEl.textContent = text;
        var metaEl = card.querySelector('[data-solution-meta]');
        if (metaEl) {
            metaEl.innerHTML = '<span><i class="fa-solid fa-user"></i> Vous (Sécurité)</span>' +
                '<span><i class="fa-solid fa-clock-rotate-left"></i> à l\'instant — en attente de validation</span>';
        }
        form.classList.add('is-hidden');
        var row = card.querySelector('[data-solution-toggle-row]');
        if (row) row.classList.remove('is-hidden');
        var note = card.querySelector('[data-solution-note]');
        if (note) {
            note.innerHTML = '<i class="fa-solid fa-circle-info text-teal"></i> Proposition enregistrée — en attente de validation par le responsable.';
        }
    });
})();

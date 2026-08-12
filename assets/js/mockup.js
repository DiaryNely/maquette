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
})();

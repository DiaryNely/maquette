/* ============================================================
   QR-FAKE — générateur SVG d'un QR "ressemblant" (100 % statique)
   Utilisé pour la maquette : rendu déterministe à partir de la
   référence (data-qr="BS-2026-0142") — motifs de détection en
   coins + matrice pseudo-aléatoire.
   ============================================================ */
(function () {
    'use strict';

    function hash(str) {
        var h = 2166136261;
        for (var i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function mulberry32(a) {
        return function () {
            a |= 0;
            a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function render(el) {
        var n = 25; // modules par côté
        var seed = hash(el.getAttribute('data-qr') || 'S2M');
        var rand = mulberry32(seed);
        var cells = [];
        var x, y, dx, dy, row;

        for (y = 0; y < n; y++) {
            row = [];
            for (x = 0; x < n; x++) row.push(rand() > 0.5);
            cells.push(row);
        }

        // motifs de détection (coins)
        function finder(ox, oy) {
            for (dy = 0; dy < 7; dy++) {
                for (dx = 0; dx < 7; dx++) {
                    var on = dx === 0 || dx === 6 || dy === 0 || dy === 6 ||
                        (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
                    cells[oy + dy][ox + dx] = on;
                }
            }
        }
        finder(0, 0);
        finder(n - 7, 0);
        finder(0, n - 7);

        var size = 148;
        var m = size / n;
        var svg = '<svg viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="QR code ' +
            el.getAttribute('data-qr') + '">';
        svg += '<rect width="' + size + '" height="' + size + '" fill="#ffffff"/>';
        for (y = 0; y < n; y++) {
            for (x = 0; x < n; x++) {
                if (cells[y][x]) {
                    svg += '<rect x="' + (x * m).toFixed(2) + '" y="' + (y * m).toFixed(2) +
                        '" width="' + m.toFixed(2) + '" height="' + m.toFixed(2) + '" fill="#2b3a55"/>';
                }
            }
        }
        svg += '</svg>';
        el.innerHTML = svg;
    }

    function init() {
        var els = document.querySelectorAll('[data-qr]');
        for (var i = 0; i < els.length; i++) render(els[i]);
        return els.length > 0;
    }

    if (!init()) {
        var timer = setInterval(function () {
            if (init()) clearInterval(timer);
        }, 80);
        setTimeout(function () { clearInterval(timer); }, 4000);
    }
})();

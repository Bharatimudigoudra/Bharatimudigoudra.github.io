/* Single entry point: loads the data and scripts in order. Include with one <script defer> tag. */
(function () {
  'use strict';
  var me = document.currentScript;
  var AB = (window.AskBharati = window.AskBharati || {});
  AB.root = me.src.replace(/js\/loader\.js([?#].*)?$/, '');
  ['data/facts.js', 'data/github-evidence.js', 'data/config.js', 'js/answer.js', 'js/ui.js'].forEach(function (p) {
    var s = document.createElement('script');
    s.src = AB.root + p; s.async = false;
    document.head.appendChild(s);
  });
})();

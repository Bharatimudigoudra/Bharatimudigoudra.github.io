// Year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Mobile menu
var menuBtn = document.getElementById('menuBtn');
var menu = document.getElementById('menu');
menuBtn.addEventListener('click', function () {
  menu.classList.toggle('open');
});
menu.querySelectorAll('a').forEach(function (link) {
  link.addEventListener('click', function () { menu.classList.remove('open'); });
});

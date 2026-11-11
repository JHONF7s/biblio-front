(function () {
  try {
    var pref = localStorage.getItem('biblio.theme');
    if (pref === 'dark') {
      document.documentElement.classList.add('dark-theme');
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', '#131314');
      }
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  } catch (_e) {
    // Almacenamiento restringido: conservar modo claro neutro por defecto
  }
})();

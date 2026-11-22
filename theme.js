// Light/dark theme. Light is the default; the choice is remembered in this browser only.
// Loaded in <head> so the saved theme is applied BEFORE the page paints (no flash).
(function () {
  var KEY = "hub-theme", root = document.documentElement;
  var read = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  var apply = function (t) {
    if (t === "dark") root.setAttribute("data-theme", "dark"); else root.removeAttribute("data-theme");
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", t === "dark" ? "#151413" : "#ffffff");
  };
  apply(read());
  document.addEventListener("DOMContentLoaded", function () {
    var b = document.getElementById("theme-toggle"); if (!b) return;
    var sync = function () {
      var dark = root.getAttribute("data-theme") === "dark";
      b.setAttribute("aria-pressed", String(dark));
      b.textContent = dark ? "\u2600 Light" : "\u263E Dark";
      b.title = dark ? "Switch to the light theme" : "Switch to the dark theme";
    };
    b.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      apply(next); try { localStorage.setItem(KEY, next); } catch (e) {} sync();
    });
    window.addEventListener("storage", function (e) { if (e.key === KEY) { apply(e.newValue); sync(); } });   // keep other open tabs in step
    sync();
  });
})();

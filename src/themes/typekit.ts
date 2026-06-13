// Adobe Fonts (Typekit) async loader — the standard Adobe async embed. Loads
// kit `vmz7pfu` (digibop display + config-mono-vf mono) non-blocking and toggles
// the wf-loading → wf-active / wf-inactive classes on <html> via Web Font Loader.
//
// Injected via dangerouslySetInnerHTML in the layout <head>; kept as a string
// because it is vendor-shaped code (var / IIFE / reassignment) and must not be
// linted or reformatted as project source.
const script = `(function(d) {
  var config = { kitId: 'vmz7pfu', scriptTimeout: 3000, async: true },
      h = d.documentElement,
      t = setTimeout(function () { h.className = h.className.replace(/\\bwf-loading\\b/g, "") + " wf-inactive"; }, config.scriptTimeout),
      tk = d.createElement("script"), f = false, s = d.getElementsByTagName("script")[0], a;
  h.className += " wf-loading";
  tk.src = 'https://use.typekit.net/' + config.kitId + '.js';
  tk.async = true;
  tk.onload = tk.onreadystatechange = function () {
    a = this.readyState;
    if (f || a && a != "complete" && a != "loaded") return;
    f = true; clearTimeout(t);
    try { Typekit.load(config) } catch (e) {}
  };
  s.parentNode.insertBefore(tk, s);
})(document);`;

/** Ready-to-spread payload for `<script dangerouslySetInnerHTML={...}>`. */
export const typekitLoaderHtml = { __html: script };

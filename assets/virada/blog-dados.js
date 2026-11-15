/* Ajudantes comuns ao blog e ao artigo, em cima de window.KP_POSTS. */
window.KpBlog = (function () {
  "use strict";
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const slug = (s) => semAcento(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // "Nota Mental #4" pertence à série "Nota Mental"
  const serieDe = (cat) => cat.replace(/\s*#\d+$/, "").trim();
  const numeroDe = (cat) => (cat.match(/#(\d+)$/) || [])[1] || null;

  const posts = (window.KP_POSTS || []).map((p, i) => {
    const [a, m, d] = p.iso.split("-").map(Number);
    return {
      ...p,
      i,
      serie: serieDe(p.c),
      serieSlug: slug(serieDe(p.c)),
      numero: numeroDe(p.c),
      dia: String(d).padStart(2, "0"),
      mesCurto: MES_CURTO[m - 1],
      mesChave: `${a}-${String(m).padStart(2, "0")}`,
      mesNome: `${MESES[m - 1]} ${a}`,
      busca: semAcento(`${p.t} ${p.e} ${p.c}`)
    };
  });

  // séries por volume, Se Atualize primeiro naturalmente
  const contagem = {};
  posts.forEach((p) => { contagem[p.serieSlug] = contagem[p.serieSlug] || { slug: p.serieSlug, nome: p.serie, total: 0 }; contagem[p.serieSlug].total++; });
  const series = Object.values(contagem).sort((x, y) => y.total - x.total);

  // no ar (kapota.com.br, <html data-kp-site>) os artigos são páginas estáticas em /blog/<slug>/
  const noAr = document.documentElement.hasAttribute("data-kp-site");
  const url = (p) => (noAr ? `/blog/${p.s}/` : `artigo.html?s=${encodeURIComponent(p.s)}`);
  const urlSerie = (s) => (noAr ? `/blog/?serie=${s}` : `blog.html?serie=${s}`);
  const urlReal = (p) => `https://kapota.com.br/blog/${p.s}/`;
  const primeiro = posts[posts.length - 1];

  return { posts, series, url, urlSerie, noAr, urlReal, esc, slug, semAcento, MESES, desde: primeiro ? `${MESES[+primeiro.iso.slice(5, 7) - 1]} de ${primeiro.iso.slice(0, 4)}` : "" };
})();

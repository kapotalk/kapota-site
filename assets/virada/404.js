/* Página não encontrada (404): mostra o endereço pedido, sugere artigos parecidos com ele
   e lista os mais recentes. No ar a página vem da Cloudflare com o endereço original;
   no mock, ?caminho=/blog/algum-endereco simula o endereço pedido. */
(function () {
  "use strict";
  const { posts, url, esc, semAcento, noAr } = window.KpBlog;
  const $ = (s) => document.querySelector(s);
  const SETA = '<svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" stroke-width="1.6"/></svg>';

  const decodifica = (s) => { try { return decodeURIComponent(s); } catch (e) { return s; } };
  const pedido = noAr ? location.pathname : (new URLSearchParams(location.search).get("caminho") || "/blog/spotify-paga-compositor-direto/");
  const elCaminho = $("[data-kp-caminho]");
  if (elCaminho) elCaminho.textContent = "kapota.com.br" + decodifica(pedido).slice(0, 140);

  // palavras do endereço que valem pra procurar ("blog", "html" e preposições não contam)
  const VAZIAS = new Set("blog html index www com que uma uns umas dos das nos nas pra pro para por sem com mais como".split(" "));
  const palavras = [...new Set(semAcento(decodifica(pedido)).split(/[^a-z0-9]+/).filter((p) => p.length > 2 && !VAZIAS.has(p)))];

  // palavra igual a um pedaço do endereço do artigo vale 2, palavra no texto vale 1
  const pontua = (p) => {
    const partes = new Set(p.s.split("-"));
    return palavras.reduce((n, w) => n + (partes.has(w) ? 2 : p.busca.includes(w) ? 1 : 0), 0);
  };
  const minimo = palavras.length > 1 ? 3 : 2;
  const talvez = palavras.length
    ? posts.map((p) => ({ p, n: pontua(p) })).filter((x) => x.n >= minimo).sort((a, b) => b.n - a.n || a.p.i - b.p.i).slice(0, 3).map((x) => x.p)
    : [];

  const item = (p) => `
    <article class="kp-item">
      <span class="kp-item__data"><b>${p.dia}</b>${p.mesCurto}</span>
      <span class="kp-item__serie">${esc(p.c)}</span>
      <h3 class="kp-item__titulo"><a href="${url(p)}">${esc(p.t)}</a></h3>
      <span class="kp-item__tempo">${p.min} min</span>
      <span class="kp-artigo__seta">${SETA}</span>
    </article>`;

  if (talvez.length) {
    $("[data-kp-talvez-lista]").innerHTML = talvez.map(item).join("");
    $("[data-kp-talvez]").hidden = false;
  }
  const mostrados = new Set(talvez.map((p) => p.s));
  $("[data-kp-ultimos]").innerHTML = posts.filter((p) => !mostrados.has(p.s)).slice(0, 4).map(item).join("");
})();

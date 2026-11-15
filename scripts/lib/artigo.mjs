// Lê um artigo em blog/<slug>/index.html, no formato antigo (art-body/wrap) ou no
// atual (CORPO:INICIO/FIM), e renderiza no modelo atual (artigo-modelo.html, que vem
// do design system Virada pelo tools/levar-pro-site.mjs de lá).
//
// Quem escreve post novo pode continuar usando o formato antigo: o generate-site.mjs
// passa todos pro modelo atual e troca o nome antigo da série pelo novo.
// Renderizar um artigo já no modelo atual devolve o mesmo arquivo (idempotente).

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE } from "./posts.mjs";

const MODELO = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "artigo-modelo.html"), "utf8");
const OG_PADRAO = `${SITE}/assets/og-image.jpg`;

// séries renomeadas em 15/11/2026; o "#4" das numeradas fica
const RENOMEIA = {
  "Radar de Notícias": "Se Atualize",
  "Leitura Estratégica": "Se Atualize",
  "Radar da Semana": "Resumo da Semana",
  "Modelo Mental": "Nota Mental",
  "Frase Comentada": "Pensa Nisso",
};
export function renomeiaSerie(cat) {
  const [, nome, num = ""] = cat.trim().match(/^(.*?)(\s*#\d+)?$/);
  return (RENOMEIA[nome.trim()] || nome.trim()) + num;
}

const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const slugSerie = (cat) => semAcento(cat.replace(/\s*#\d+$/, "")).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function minutosDe(corpo) {
  const palavras = corpo.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}

const pega = (html, re) => {
  const m = html.match(re);
  return m ? m[1] : null;
};

export function lePost(slug, html) {
  const d = {
    slug,
    titulo: pega(html, /<h1>([^]*?)<\/h1>/),
    categoria: pega(html, /<span class="cat">([^<]+)<\/span>/),
    data: pega(html, /<span class="cat">[^<]+<\/span>\s*<span>([^<]+)<\/span>/),
    ld: pega(html, /(<script type="application\/ld\+json">[^]*?<\/script>)/),
    descricao: pega(html, /<meta name="description" content="([^"]*)">/),
    resumo: pega(html, /<meta name="blog-excerpt" content="([^"]*)">/),
    imagem: pega(html, /<meta property="og:image" content="([^"]*)">/) || OG_PADRAO,
    corpo:
      pega(html, /<!-- CORPO:INICIO -->([^]*?)<!-- CORPO:FIM -->/) ??
      pega(html, /<article class="art-body">\s*<div class="wrap">([^]*?)<\/div>\s*<\/article>/),
  };
  d.resumo = d.resumo ?? d.descricao;
  d.descricao = d.descricao ?? d.resumo;
  for (const campo of ["titulo", "categoria", "data", "ld", "descricao", "corpo"]) {
    if (d[campo] == null) throw new Error(`${campo} não encontrado em blog/${slug}/index.html`);
  }
  d.titulo = d.titulo.trim();
  d.categoria = renomeiaSerie(d.categoria);
  d.data = d.data.trim();
  d.corpo = d.corpo.trim();
  return d;
}

export function renderiza(d) {
  const url = `${SITE}/blog/${d.slug}/`;
  const tituloAttr = d.titulo.replace(/"/g, "&quot;");
  const cabeca = [
    `<meta name="description" content="${d.descricao}">`,
    `<meta name="blog-excerpt" content="${d.resumo}">`,
    `<link rel="canonical" href="${url}">`,
    `<link rel="icon" href="/favicon.ico" sizes="any">`,
    `<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">`,
    `<meta name="theme-color" content="#0a0a0a">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:title" content="${tituloAttr} · Klysman Kley">`,
    `<meta property="og:description" content="${d.descricao}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${d.imagem}">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:site_name" content="Klysman Kley">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${tituloAttr} · Klysman Kley">`,
    `<meta name="twitter:description" content="${d.descricao}">`,
    `<meta name="twitter:image" content="${d.imagem}">`,
    d.ld,
  ].map((l) => `  ${l}`).join("\n");
  const valores = {
    cabeca,
    titulo_texto: d.titulo,
    slug: d.slug,
    serie_slug: slugSerie(d.categoria),
    categoria: d.categoria,
    titulo: d.titulo,
    data: d.data,
    minutos: String(minutosDe(d.corpo)),
    corpo: d.corpo,
  };
  // uma passada só: o que vem do artigo não é lido de novo como marcador
  return MODELO.replace(/\{\{(\w+)\}\}/g, (todo, chave) => {
    if (!(chave in valores)) throw new Error(`Marcador desconhecido no modelo: ${todo}`);
    return valores[chave];
  });
}

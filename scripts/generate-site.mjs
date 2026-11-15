#!/usr/bin/env node
// Regenera o site a partir dos próprios artigos (blog/<slug>/index.html):
//   1. passa cada artigo pro modelo atual (scripts/lib/artigo-modelo.html), trocando
//      nome antigo de série pelo novo; artigo novo pode chegar no formato antigo
//   2. assets/posts.js, a lista que a home, a Leitura de Mercado e os artigos usam
//   3. sitemap.xml
//   4. blog/index.html: lista estática entre POSTS:START/END (a página refaz com JS)
//   5. index.html: destaques entre LATEST:START/END e o total de artigos
//
// Uso: node scripts/generate-site.mjs

import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getPosts, SITE } from "./lib/posts.mjs";
import { lePost, renderiza, minutosDe } from "./lib/artigo.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = join(ROOT, "blog");
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const SETA = '<svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" stroke-width="1.6"/></svg>';

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const escreveSeMudou = (path, novo) => {
  if (!existsSync(path) || readFileSync(path, "utf8") !== novo) writeFileSync(path, novo);
};

// ---------- 1. artigos no modelo atual ----------
const minutos = {};
let renderizados = 0;
for (const slug of readdirSync(BLOG_DIR).sort()) {
  const path = join(BLOG_DIR, slug, "index.html");
  if (!statSync(join(BLOG_DIR, slug)).isDirectory() || !existsSync(path)) continue;
  const original = readFileSync(path, "utf8");
  const dados = lePost(slug, original);
  minutos[slug] = minutosDe(dados.corpo);
  const novo = renderiza(dados);
  if (novo !== original) {
    writeFileSync(path, novo);
    renderizados++;
  }
}

const posts = getPosts(ROOT);

// ---------- 2. assets/posts.js ----------
// t título, c série, d data exibida, iso data, s slug, e resumo, min minutos de leitura
const lista = posts.map((p) => ({ t: p.title, c: p.category, d: p.dateDisplay, iso: p.dateISO, s: p.slug, e: p.excerpt, min: minutos[p.slug] || 1 }));
escreveSeMudou(
  join(ROOT, "assets", "posts.js"),
  `// Gerado por scripts/generate-site.mjs a partir de blog/<slug>/index.html. Não editar à mão.\nwindow.KP_POSTS = ${JSON.stringify(lista)};\n`
);

// ---------- 3. sitemap.xml ----------
const urls = [
  { loc: `${SITE}/`, priority: "1.0" },
  { loc: `${SITE}/blog/`, priority: "0.9" },
  ...[...posts].sort((a, b) => a.slug.localeCompare(b.slug)).map((p) => ({ loc: `${SITE}/blog/${p.slug}/`, priority: "0.7" })),
];
const sitemapBody = urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <priority>${u.priority}</priority>\n  </url>`).join("\n");
escreveSeMudou(join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapBody}\n</urlset>\n`);

// ---------- 4. blog/index.html ----------
const partesData = (p) => {
  const [a, m, d] = p.dateISO.split("-").map(Number);
  return { a, m, d: String(d).padStart(2, "0") };
};
const grupos = [];
for (const p of posts) {
  const { a, m } = partesData(p);
  const chave = `${a}-${m}`;
  let g = grupos[grupos.length - 1];
  if (!g || g.chave !== chave) grupos.push((g = { chave, nome: `${MESES[m - 1]} ${a}`, itens: [] }));
  g.itens.push(p);
}
const listaEstatica = grupos
  .map(
    (g) => `      <section class="kp-mes" aria-label="${g.nome}">
        <div class="kp-mes__titulo"><h2>${g.nome}</h2><span class="kp-meta">${g.itens.length} artigo${g.itens.length > 1 ? "s" : ""}</span></div>
${g.itens
  .map((p) => {
    const { m, d } = partesData(p);
    return `        <article class="kp-item">
          <span class="kp-item__data"><b>${d}</b>${MES_CURTO[m - 1]}</span>
          <span class="kp-item__serie">${esc(p.category)}</span>
          <h3 class="kp-item__titulo"><a href="/blog/${p.slug}/">${esc(p.title)}</a></h3>
          <span class="kp-item__tempo">${minutos[p.slug] || 1} min</span>
          <span class="kp-artigo__seta">${SETA}</span>
        </article>`;
  })
  .join("\n")}
      </section>`
  )
  .join("\n");

const primeiro = posts[posts.length - 1];
const desde = primeiro ? `${MESES[+primeiro.dateISO.slice(5, 7) - 1]} de ${primeiro.dateISO.slice(0, 4)}` : "";
let blogIndex = readFileSync(join(BLOG_DIR, "index.html"), "utf8");
blogIndex = entreMarcadores(blogIndex, "POSTS", listaEstatica, "blog/index.html")
  .replace(/data-kp-conta="\d+"/, `data-kp-conta="${posts.length}"`)
  .replace(/(<span data-kp-conta-alvo data-kp-total>)\d+(<\/span>)/, `$1${posts.length}$2`)
  .replace(/(<span data-kp-desde>)[^<]*(<\/span>)/, `$1${desde}$2`);
escreveSeMudou(join(BLOG_DIR, "index.html"), blogIndex);

// ---------- 5. index.html (home) ----------
const [destaque, ...resto] = posts;
const destaques = destaque
  ? `      <article class="kp-artigo kp-artigo--destaque" data-kp-revela data-kp-cursor="Ler">
        <div class="kp-artigo__meta"><span class="kp-tag kp-tag--brasa">${esc(destaque.category)}</span><span class="kp-meta">${esc(destaque.dateDisplay)}</span></div>
        <h3 class="kp-artigo__titulo"><a href="/blog/${destaque.slug}/">${esc(destaque.title)}</a></h3>
        <p class="kp-artigo__resumo">${esc(destaque.excerpt)}</p>
        <span class="kp-artigo__seta">${SETA}</span>
      </article>
      <div class="kp-radar__lista">
${resto
  .slice(0, 4)
  .map(
    (p) => `        <article class="kp-artigo" data-kp-revela>
          <div>
            <div class="kp-artigo__meta"><span class="kp-meta kp-acento">${esc(p.category)}</span><span class="kp-meta">${esc(p.dateDisplay)}</span></div>
            <h3 class="kp-artigo__titulo"><a href="/blog/${p.slug}/">${esc(p.title)}</a></h3>
          </div>
          <span class="kp-artigo__seta">${SETA}</span>
        </article>`
  )
  .join("\n")}
      </div>`
  : "";
let home = readFileSync(join(ROOT, "index.html"), "utf8");
home = entreMarcadores(home, "LATEST", destaques, "index.html").replace(
  /(<span data-kp-total-posts>)\d+(<\/span>)/g,
  `$1${posts.length}$2`
);
escreveSeMudou(join(ROOT, "index.html"), home);

function entreMarcadores(html, nome, conteudo, arquivo) {
  const ini = html.match(new RegExp(`<!-- ${nome}:START[^>]*-->`));
  const fim = html.indexOf(`<!-- ${nome}:END -->`);
  if (!ini || fim === -1 || fim < ini.index) throw new Error(`Marcadores ${nome} não encontrados em ${arquivo}`);
  return `${html.slice(0, ini.index + ini[0].length)}\n${conteudo}\n${html.slice(fim)}`;
}

console.log(`${posts.length} artigos (${renderizados} passados pro modelo atual). assets/posts.js, sitemap.xml, blog/index.html e index.html atualizados.`);

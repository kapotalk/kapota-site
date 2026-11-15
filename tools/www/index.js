// www.kapota.com.br -> kapota.com.br, mantendo caminho e parâmetros (301, como o GitHub Pages fazia).
export default {
  fetch(request) {
    const url = new URL(request.url);
    url.hostname = "kapota.com.br";
    url.protocol = "https:";
    url.port = "";
    return Response.redirect(url.toString(), 301);
  },
};

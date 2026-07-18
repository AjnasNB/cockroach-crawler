const HSTS = "max-age=31536000; includeSubDomains";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.protocol !== "https:" || url.hostname === "www.cockroachcrawler.com") {
      url.protocol = "https:";
      if (url.hostname === "www.cockroachcrawler.com") url.hostname = "cockroachcrawler.com";
      return Response.redirect(url, 308);
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("Strict-Transport-Security", HSTS);
    if (headers.get("Content-Type")?.toLowerCase().includes("text/html")) {
      headers.set("Cache-Control", "public, max-age=300, no-transform");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

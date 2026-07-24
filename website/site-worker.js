const HSTS = "max-age=31536000; includeSubDomains";
const CONTENT_SECURITY_POLICY = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

async function fetchAsset(request, env) {
  try {
    return await env.ASSETS.fetch(request);
  } catch {
    const fallbackUrl = new URL("/404", request.url);
    const fallback = await env.ASSETS.fetch(new Request(fallbackUrl, { method: "GET" }));
    return new Response(fallback.body, {
      status: 404,
      statusText: "Not Found",
      headers: fallback.headers,
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.protocol !== "https:" || url.hostname === "www.cockroachcrawler.com") {
      url.protocol = "https:";
      if (url.hostname === "www.cockroachcrawler.com") url.hostname = "cockroachcrawler.com";
      return Response.redirect(url, 308);
    }

    const response = await fetchAsset(request, env);
    const headers = new Headers(response.headers);
    headers.set("Strict-Transport-Security", HSTS);
    headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    if (response.status >= 400) {
      headers.set("Cache-Control", "no-store, no-transform");
    } else if (headers.get("Content-Type")?.toLowerCase().includes("text/html")) {
      headers.set("Cache-Control", "public, max-age=0, s-maxage=300, must-revalidate, no-transform");
    } else if (url.pathname.startsWith("/media/")) {
      headers.set("Cache-Control", "public, max-age=3600, must-revalidate, no-transform");
    } else {
      headers.set("Cache-Control", "public, max-age=300, must-revalidate, no-transform");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

// Cloudflare Worker — TUS proxy with watermark & metadata support + auto disable signed URLs

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, PATCH, HEAD, OPTIONS",
  "Access-Control-Allow-Headers":
    "Tus-Resumable, Upload-Length, Upload-Metadata, Upload-Offset, Content-Type, Authorization, X-Requested-With, X-Video-ID",
  "Access-Control-Expose-Headers":
    "Location, Upload-Offset, Upload-Length, Tus-Resumable",
};

function tryAtob(s) {
  try { return atob(s); } catch (e) { return s; }
}

function parseUploadMetadata(headerValue) {
  if (!headerValue) return {};
  const entries = headerValue.split(",").map((s) => s.trim()).filter(Boolean);
  const obj = {};
  for (const e of entries) {
    const idx = e.indexOf(" ");
    if (idx === -1) { obj[e] = ""; continue; }
    const k = e.slice(0, idx);
    const v = e.slice(idx + 1);
    obj[k] = tryAtob(v);
  }
  return obj;
}

function buildUploadMetadata(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${k} ${btoa(String(v || ""))}`)
    .join(",");
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const cfToken = env.CLOUDFLARE_STREAM_API_TOKEN;
    const watermarkUid = env.CLOUDFLARE_WATERMARK_UID;

    if (!accountId || !cfToken) {
      return new Response(JSON.stringify({ error: "Missing Cloudflare env vars" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`;
    const requestUrl = new URL(request.url);
    const videoIdHeader = request.headers.get("X-Video-ID");

    try {
      // -------------------------
      // CREATE SESSION (POST)
      // -------------------------
      if (request.method === "POST" && !videoIdHeader) {
        const clientUploadMetadata = request.headers.get("Upload-Metadata") || "";
        const clientParsed = parseUploadMetadata(clientUploadMetadata);

        const metadata = {
          name: clientParsed.name || clientParsed.filename || "lesson-video",
          filename: clientParsed.filename || "",
          filetype: clientParsed.filetype || "",
          requiresignedurls: "false",
        };

        if (clientParsed.watermark) metadata.watermark = clientParsed.watermark;
        else if (watermarkUid) metadata.watermark = watermarkUid;

        const uploadMetadataStr = buildUploadMetadata(metadata);

        const uploadLength =
          request.headers.get("Upload-Length") ||
          request.headers.get("Content-Length") ||
          "0";

        const upstream = await fetch(base, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${cfToken}`,
            "Tus-Resumable": "1.0.0",
            "Upload-Length": uploadLength,
            "Upload-Metadata": uploadMetadataStr,
          },
        });

        const upstreamLocation = upstream.headers.get("Location");
        const respHeaders = new Headers(CORS);

        if (upstreamLocation) {
          const uid = upstreamLocation.split("/").pop().split("?")[0];
          respHeaders.set("Location", `${requestUrl.origin}${requestUrl.pathname}/${uid}`);
        }

        return new Response(null, { status: upstream.status, headers: respHeaders });
      }

      // -------------------------
      // PATCH / HEAD
      // -------------------------
      if ((request.method === "PATCH" || request.method === "HEAD") && videoIdHeader) {
        const target = `${base}/${videoIdHeader}`;

        const forward = new Headers();
        forward.set("Authorization", `Bearer ${cfToken}`);
        for (const h of [
          "Tus-Resumable",
          "Upload-Length",
          "Upload-Metadata",
          "Upload-Offset",
          "Content-Type",
        ]) {
          const v = request.headers.get(h);
          if (v) forward.set(h, v);
        }

        const upstream = await fetch(target, {
          method: request.method,
          headers: forward,
          body: request.method === "PATCH" ? request.body : null,
        });

        const respHeaders = new Headers(CORS);

        // Forward TUS headers
        for (const h of ["Location", "Upload-Offset", "Upload-Length", "Tus-Resumable"]) {
          const v = upstream.headers.get(h);
          if (v) {
            if (h === "Location") {
              const uid = v.split("/").pop().split("?")[0];
              respHeaders.set("Location", `${requestUrl.origin}${requestUrl.pathname}/${uid}`);
            } else {
              respHeaders.set(h, v);
            }
          }
        }

        // -------------------------
        // AUTO UPDATE SIGNED URL = FALSE
        // -------------------------

        const offset = upstream.headers.get("Upload-Offset");
        const length = upstream.headers.get("Upload-Length");

        if (offset && length && offset === length) {
          

          await fetch(`${base}/${videoIdHeader}`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${cfToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requireSignedURLs: false,
            }),
          });

          
        }

        return new Response(upstream.body, {
          status: upstream.status,
          headers: respHeaders,
        });
      }

      return new Response(JSON.stringify({ error: "Bad request" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
  },
};

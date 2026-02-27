import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
};

Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    console.log("=== Incoming request ===");

    if (req.method === "OPTIONS") {
      console.log("Preflight request (OPTIONS)");
      return new Response(null, { headers: corsHeaders });
    }

    const body = await req.json();
    console.log("Request JSON:", body);

    const { type } = body;
    console.log("Type:", type);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    /* --------------------------------------------------------
     * 1) robots.txt
    -------------------------------------------------------- */
    if (type === "robots") {
      console.log("Generating robots.txt...");
      const robots = `
User-agent: *
Allow: /

Sitemap: https://arrangely.io/sitemap.xml
      `.trim();

      console.log("robots.txt generated");
      console.log("Execution time:", Date.now() - startTime, "ms");

      return new Response(robots, {
        headers: { "Content-Type": "text/plain", ...corsHeaders },
      });
    }

    /* --------------------------------------------------------
     * 2) sitemap.xml
    -------------------------------------------------------- */
    if (type === "sitemap") {
      console.log("Generating sitemap.xml...");

      const urls: string[] = [];

      // Events
      console.log("Fetching events...");
      const { data: events, error: eventsErr } = await supabase
        .from("events")
        .select("slug, id")
        .eq("visibility", "public");

      if (eventsErr) console.error("Events error:", eventsErr);
      console.log("Events count:", events?.length || 0);

      events?.forEach((e) => {
        urls.push(`https://arrangely.io/events/${e.slug || e.id}`);
      });

      // Songs / arrangements
      console.log("Fetching songs...");
      const { data: songs, error: songsErr } = await supabase
        .from("songs")
        .select("slug, id")
        .eq("is_public", true);

      if (songsErr) console.error("Songs error:", songsErr);
      console.log("Songs count:", songs?.length || 0);

      songs?.forEach((s) => {
        urls.push(`https://arrangely.io/arrangement/${s.slug || s.id}`);
      });

      // Creators
      console.log("Fetching creators...");
      const { data: creators, error: creatorsErr } = await supabase
        .from("profiles")
        .select("creator_slug")
        .eq("creator_type", "creator_professional");

      if (creatorsErr) console.error("Creators error:", creatorsErr);
      console.log("Creators count:", creators?.length || 0);

      creators?.forEach((c) => {
        urls.push(`https://arrangely.io/creator/${c.creator_slug}`);
      });

      // Lessons
      console.log("Fetching lessons...");
      const { data: lessons, error: lessonsErr } = await supabase
        .from("lessons")
        .select("slug, id")
        .eq("is_unlisted", false)
        .eq("is_production", true);

      if (lessonsErr) console.error("Lessons error:", lessonsErr);
      console.log("Lessons count:", lessons?.length || 0);

      lessons?.forEach((l) => {
        urls.push(
          `https://arrangely.io/arrangely-music-lab/${l.slug || l.id}`
        );
      });

      // Setlists
      console.log("Fetching setlists...");
      // const { data: setlists, error: setlistsErr } = await supabase
      //   .from("setlists")
      //   .select("slug, id");

      // if (setlistsErr) console.error("Setlists error:", setlistsErr);
      // console.log("Setlists count:", setlists?.length || 0);

      // setlists?.forEach((s) => {
      //   urls.push(`https://arrangely.io/setlist-performance/${s.slug || s.id}`);
      // });

      console.log("Total URLs collected:", urls.length);

      const xml =
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls
          .map(
            (url) => `
  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
          )
          .join("\n") +
        "\n</urlset>";

      console.log("sitemap.xml generated");
      console.log("Execution time:", Date.now() - startTime, "ms");

      return new Response(xml, {
        headers: { "Content-Type": "application/xml", ...corsHeaders },
      });
    }

    /* ----------------- INVALID TYPE ---------------- */
    console.warn("Invalid type received:", type);
    return new Response("Invalid type", { status: 400 });

  } catch (err) {
    console.error("Unexpected error:", err);

    return new Response(
      JSON.stringify({ error: "Edge function crashed", details: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

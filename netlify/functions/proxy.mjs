export default async (req, context) => {
  // Sadece POST isteklerini kabul et
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { url, options } = await req.json();

    if (!url) {
      return new Response("Missing URL", { status: 400 });
    }

    // Trendyol veya Resim URL'sine istek at
    const response = await fetch(url, options || {});

    // Binary (Resim) veya Text (JSON) ayrımı yap
    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("image")) {
      const arrayBuffer = await response.arrayBuffer();
      return new Response(arrayBuffer, {
        status: response.status,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        "Content-Type": contentType || "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
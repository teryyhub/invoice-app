// api/admin-impersonate.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { target_user_id, admin_token } = req.body;

  if (!target_user_id || !admin_token) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const ANON_KEY     = process.env.SUPABASE_ANON_KEY;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    return res.status(500).json({
      error: "Missing environment variables",
      has_url:     !!SUPABASE_URL,
      has_anon:    !!ANON_KEY,
      has_service: !!SERVICE_KEY,
    });
  }

  try {
    // 1. Decode JWT to get caller user ID
    const parts = admin_token.split(".");
    if (parts.length !== 3) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    let payload;
    try {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
      payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    } catch (e) {
      return res.status(401).json({ error: "Failed to decode token" });
    }

    const callerId = payload?.sub;
    if (!callerId) {
      return res.status(401).json({ error: "No user ID in token" });
    }

    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return res.status(401).json({ error: "Token expired" });
    }

    // 2. Verify caller is admin using service role
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${callerId}&select=is_admin`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
      }
    );
    const profiles = await profileRes.json();
    if (!profiles?.[0]?.is_admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // 3. Get target user email first
    const userRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${target_user_id}`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
      }
    );
    const userData = await userRes.json();
    if (!userRes.ok || !userData?.email) {
      return res.status(404).json({ error: "Target user not found", detail: userData });
    }

    // 4. Generate magic link using correct endpoint
    const linkRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/generateLink`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "magiclink",
          email: userData.email,
          options: {
            redirect_to: "https://sivacholainvoices.vercel.app/admin-callback",
          },
        }),
      }
    );

    const linkText = await linkRes.text();
    let linkData;
    try {
      linkData = JSON.parse(linkText);
    } catch (e) {
      return res.status(500).json({ error: "Invalid response from Supabase", raw: linkText.slice(0, 200) });
    }

    if (!linkRes.ok) {
      return res.status(500).json({ error: linkData.message || "Failed to generate link", detail: linkData });
    }

    return res.status(200).json({ link: linkData.action_link || linkData.properties?.action_link });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
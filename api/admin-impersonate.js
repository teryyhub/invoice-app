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
    // 1. Verify the caller's JWT
    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${admin_token}`,
        apikey: ANON_KEY,
      },
    });
    const callerUser = await verifyRes.json();
    if (!callerUser?.id) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // 2. Check admin status
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${callerUser.id}&select=is_admin`,
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

    // 3. Generate magic link via Supabase Admin API
    const linkRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${target_user_id}/generate_link`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "magiclink",
          redirect_to: "https://sivacholainvoices.vercel.app/admin-callback",
        }),
      }
    );

    const linkData = await linkRes.json();
    if (!linkRes.ok) {
      return res.status(500).json({ error: linkData.message || "Failed to generate link" });
    }

    return res.status(200).json({ link: linkData.action_link });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
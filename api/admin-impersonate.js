// api/admin-impersonate.js
import { createClient } from "@supabase/supabase-js";

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
    return res.status(500).json({ error: "Missing environment variables" });
  }

  try {
    // 1. Decode JWT to get caller user ID
    const parts = admin_token.split(".");
    if (parts.length !== 3) return res.status(401).json({ error: "Invalid token format" });

    let payload;
    try {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
      payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    } catch (e) {
      return res.status(401).json({ error: "Failed to decode token" });
    }

    const callerId = payload?.sub;
    if (!callerId) return res.status(401).json({ error: "No user ID in token" });
    if (payload.exp && Date.now() / 1000 > payload.exp) return res.status(401).json({ error: "Token expired" });

    // 2. Create admin supabase client with service role
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Verify caller is admin
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("is_admin")
      .eq("id", callerId)
      .single();

    if (!profiles?.is_admin) return res.status(403).json({ error: "Admin access required" });

    // 4. Generate magic link using admin client
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: (await adminClient.auth.admin.getUserById(target_user_id)).data.user?.email,
      options: {
        redirectTo: "https://sivacholainvoices.vercel.app/admin-callback",
      },
    });

    if (error) return res.status(500).json({ error: error.message });
    if (!data?.properties?.action_link) return res.status(500).json({ error: "No link returned", detail: data });

    return res.status(200).json({ link: data.properties.action_link });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
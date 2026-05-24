// api/admin-impersonate.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { target_user_id, admin_token } = req.body;

  if (!target_user_id || !admin_token) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: "Missing environment variables" });
  }

  try {
    // 1. Decode JWT
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

    // 2. Admin client
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Check admin
    const { data: profile } = await adminClient
      .from("profiles")
      .select("is_admin")
      .eq("id", callerId)
      .single();
    if (!profile?.is_admin) return res.status(403).json({ error: "Admin access required" });

    // 4. Get target user email
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(target_user_id);
    if (userError || !userData?.user?.email) {
      return res.status(404).json({ error: "User not found", detail: userError?.message });
    }
    const email = userData.user.email;

    // 5. Try generateLink
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: "https://sivacholainvoices.vercel.app/admin-callback" },
    });

    if (linkError) {
      // Log the exact error to diagnose
      return res.status(500).json({ 
        error: linkError.message,
        status: linkError.status,
        email,
        supabase_url: SUPABASE_URL,
      });
    }

    const link = linkData?.properties?.action_link;
    if (!link) return res.status(500).json({ error: "No link in response", detail: linkData });

    return res.status(200).json({ link });

  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
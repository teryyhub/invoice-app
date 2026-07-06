// /src/api/customerPortalUsers.js
// Manages login credentials for the customer-facing read-only portal.
// Stored in the `customer_portal_users` Supabase table.
// Admin creates accounts; customers log in with login_id + password.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const CustomerPortalUser = {
  // Admin: list all portal users
  async list() {
    const { data, error } = await supabase
      .from("customer_portal_users")
      .select("id, login_id, label, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Admin: create a portal user
  async create({ login_id, password, label }) {
    const { data, error } = await supabase
      .from("customer_portal_users")
      .insert([{ login_id, password_hash: password, label, is_active: true }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Admin: toggle active/inactive
  async setActive(id, is_active) {
    const { error } = await supabase
      .from("customer_portal_users")
      .update({ is_active })
      .eq("id", id);
    if (error) throw error;
  },

  // Admin: delete
  async delete(id) {
    const { error } = await supabase
      .from("customer_portal_users")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // Customer login — returns user row if credentials match and account is active
  async login(login_id, password) {
    const { data, error } = await supabase
      .from("customer_portal_users")
      .select("id, login_id, label, is_active")
      .eq("login_id", login_id)
      .eq("password_hash", password)
      .eq("is_active", true)
      .single();
    if (error || !data) return null;
    return data;
  },
};

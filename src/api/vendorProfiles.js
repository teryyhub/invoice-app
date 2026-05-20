// Replaces: base44.entities.VendorProfile.*
import { supabase } from "./supabaseClient";

export const VendorProfile = {
  // base44: VendorProfile.list('-created_date', 100)
  async list(limit = 100) {
    const { data, error } = await supabase
      .from("vendor_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  // base44: VendorProfile.filter({ id })
  async filter(filters) {
    let query = supabase.from("vendor_profiles").select("*");
    Object.entries(filters).forEach(([k, v]) => { query = query.eq(k, v); });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // base44: VendorProfile.create(data)
  async create(data) {
    const { data: row, error } = await supabase
      .from("vendor_profiles")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return row;
  },

  // base44: VendorProfile.update(id, data)
  async update(id, data) {
    const { data: row, error } = await supabase
      .from("vendor_profiles")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return row;
  },

  // base44: VendorProfile.delete(id)
  async delete(id) {
    const { error } = await supabase.from("vendor_profiles").delete().eq("id", id);
    if (error) throw error;
  },
};

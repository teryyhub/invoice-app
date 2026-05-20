// Replaces: base44.entities.Invoice.*
import { supabase } from "./supabaseClient";

export const Invoice = {
  // base44: Invoice.list('-created_date', 500)
  async list(limit = 500) {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  // base44: Invoice.filter({ id })
  async filter(filters) {
    let query = supabase.from("invoices").select("*");
    Object.entries(filters).forEach(([k, v]) => { query = query.eq(k, v); });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // base44: Invoice.create(data)
  async create(data) {
    const { data: row, error } = await supabase
      .from("invoices")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return row;
  },

  // base44: Invoice.update(id, data)
  async update(id, data) {
    const { data: row, error } = await supabase
      .from("invoices")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return row;
  },

  // base44: Invoice.delete(id)
  async delete(id) {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) throw error;
  },
};

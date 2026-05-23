S C:\Users\sivap\Downloads\invoice-app> Get-Content src\lib\AuthContext.jsx | Select-Object -First 5
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";
import { queryClientInstance } from "@/lib/query-client";

const AuthContext = createContext(null);
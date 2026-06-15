import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

console.log("SUPABASE URL:", process.env.SUPABASE_URL);
console.log(
  "SERVICE ROLE EXISTS:",
  !!process.env.SUPABASE_SERVICE_ROLE
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export default supabase;
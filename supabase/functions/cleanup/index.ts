// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async () => {
  try {
    // Auth block completely removed.

    // 1. Time calculations
    const now = new Date();
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    // 2. Fetch strictly expired rows ONLY
    const { data: stashRows, error } = await supabase
      .from("stash")
      .select("*")
      .or(`and(expiry.eq.once,created_at.lte.${fifteenMinsAgo}),and(expiry.eq.30m,created_at.lte.${thirtyMinsAgo}),and(expiry.eq.1h,created_at.lte.${oneHourAgo})`);

    if (error) throw error;
    
    if (!stashRows || stashRows.length === 0) {
      return new Response(JSON.stringify({ status: "No rows found" }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. Two-Phase Deletion Loop
    for (const row of stashRows) {
      // Phase A: Storage Deletion
      if (row.files && Array.isArray(row.files)) {
        const filePaths = row.files
          .map((f: any) => f.file_path)
          .filter(Boolean);

        console.log("Deleting paths:", filePaths);

        if (filePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from("stash")
            .remove(filePaths);
            
          if (storageError) {
            console.error(`Storage delete error for ${row.stash_key}:`, storageError.message);
          }
        }
      }

      // Phase B: Database Row Deletion
      const { error: tableError } = await supabase.from("stash").delete().eq("id", row.id);
      if (tableError) {
        console.error(`Table delete error for ID ${row.id}:`, tableError.message);
      }
    }

    return new Response(JSON.stringify({ status: "Cleanup done", deletedCount: stashRows.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

await import("https://raw.githubusercontent.com/Ofirdad12/courtiq/98b27efc14361bbee1865dddc142fa78a4c21573/supabase/functions/shared/data-quality-v6-sync.ts");
await import("https://raw.githubusercontent.com/Ofirdad12/courtiq/98b27efc14361bbee1865dddc142fa78a4c21573/supabase/functions/shared/team-possessions-postprocess.ts");
await import("https://raw.githubusercontent.com/Ofirdad12/courtiq/98b27efc14361bbee1865dddc142fa78a4c21573/supabase/functions/shared/euroleague-fetch-normalizer.ts");
await import("./production-entry.ts");

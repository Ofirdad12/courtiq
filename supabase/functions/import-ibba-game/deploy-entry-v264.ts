import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Winner League upstream resilience: bound slow basket.co.il requests and retry the alternate official hostname.
await import("https://raw.githubusercontent.com/Ofirdad12/courtiq/70deda585251c554f9039efa1bc271fe4702d09c/supabase/functions/import-ibba-game/winner-production-entry.ts");

// Unified full team possessions estimate v8 (2dp box-score fallback).
await import("https://raw.githubusercontent.com/Ofirdad12/courtiq/187abf3ff18f7a3741d0ebb5db5ba457c8b2f486/supabase/functions/shared/team-possessions-precision.ts");
// Shared game-pace compatibility + CBF bridge. Use the latest valid commit containing this module.
await import("https://raw.githubusercontent.com/Ofirdad12/courtiq/6bac0a0f4236c352566e4e202c3bfda3969de708/supabase/functions/shared/team-possessions-postprocess.ts");
// EuroLeague v2 nested total.stats normalization.
await import("https://raw.githubusercontent.com/Ofirdad12/courtiq/c6d4e3e7c6c686c1fd93e9f6a5bf0885a69e24b7/supabase/functions/shared/euroleague-fetch-normalizer.ts");
// Global Sports Archive basketball match pages: verified box-score importer.
await import("https://raw.githubusercontent.com/Ofirdad12/courtiq/6382c28828abfc08be2eda73a3049509e420a935/supabase/functions/import-ibba-game/gsa-production-entry.ts");
// Basketball Champions League uses the FIBA digital platform; map BCL links into the verified FIBA parser.
await import("./bcl-production-entry.ts");
// FIBA RSC importer with official play-by-play preservation.
await import("./fiba-rsc-production-entry.ts");

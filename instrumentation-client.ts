import posthog from "posthog-js";

// The project token is a public, write-only key; the env var lets a preview point at another project.
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "phc_rNmHe3GqYkHVuBnxigf3jZKM5zC5QnPTpAKN9cE4g5B5", {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  defaults: "2025-05-24",
  person_profiles: "identified_only",
});

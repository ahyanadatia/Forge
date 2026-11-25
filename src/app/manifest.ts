import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Forge: verified track records for builders",
    short_name: "Forge",
    description: "Log what you shipped. Forge verifies it and turns the evidence into a score teams trust.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fbfaf8",
    theme_color: "#f2581c",
    categories: ["productivity", "developer", "business"],
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

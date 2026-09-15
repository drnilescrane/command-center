import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Command Center",
    short_name: "Command",
    description: "Personal execution system",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#111827",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}

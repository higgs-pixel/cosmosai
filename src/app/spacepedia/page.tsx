import type { Metadata } from "next";
import { SpacepediaPage } from "@/components/spacepedia/spacepedia-page";

export const metadata: Metadata = {
  title: "Spacepedia | COSMOS AI",
  description:
    "A searchable NASA-backed COSMOS AI knowledge base covering planets, stars, black holes, galaxies, space missions, astronauts, and cosmology.",
  alternates: {
    canonical: "/spacepedia",
  },
};

export default function Page() {
  return <SpacepediaPage />;
}

export const blogCategories = [
  "Space Science",
  "NASA Data",
  "Artificial Intelligence",
  "Astronomy",
  "Research Notes",
  "COSMOS Updates",
] as const;

export type BlogCategory = (typeof blogCategories)[number];

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  author: string;
  date: string;
  readingTime: string;
  category: BlogCategory;
  tags: string[];
  featuredImage?: string;
  imageAlt?: string;
  pullQuote?: string;
  factBox?: {
    label: string;
    title: string;
    body: string;
  };
  content: Array<{
    heading: string;
    body: string[];
  }>;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "why-cosmos-ai-exists",
    title: "Why COSMOS AI Exists: A Living Observatory for Public Space Data",
    description:
      "COSMOS AI is built around a simple idea: public space data should feel alive, understandable, and worth returning to every day.",
    author: "COSMOS AI Team",
    date: "2026-07-03",
    readingTime: "4 min read",
    category: "COSMOS Updates",
    tags: ["mission", "product", "NASA", "AI"],
    featuredImage: "/images/earth-dashboard/earth-horizon.jpg",
    imageAlt: "Earth horizon with city lights and blue atmosphere",
    pullQuote: "The challenge is not whether the universe is documented; it is whether people can find a path through it.",
    factBox: {
      label: "Product principle",
      title: "Source first, spectacle second",
      body: "Every COSMOS feature should make the source, timestamp, and uncertainty easier to understand, not hide them behind cinematic polish.",
    },
    content: [
      {
        heading: "A living observatory for everyone",
        body: [
          "NASA publishes an extraordinary amount of public science, imagery, and mission data. The challenge is not whether the universe is documented; it is whether people can find a path through it.",
          "COSMOS AI exists to make that path feel cinematic, trustworthy, and useful. It turns daily space signals into a guided observatory for students, educators, researchers, creators, and anyone who still looks up.",
        ],
      },
      {
        heading: "Data first, wonder always",
        body: [
          "The platform starts with real public sources: APOD, near-Earth objects, space weather, Mars rover updates, NASA media archives, and OpenAlex research metadata.",
          "The product goal is not to decorate data. It is to help people understand why a signal matters, where it came from, and what they can explore next.",
        ],
      },
      {
        heading: "A calm AI guide",
        body: [
          "COSMOS AI is designed to feel like a calm space guide, not a generic chatbot. When live AI is configured, it should explain sources clearly. When AI is unavailable, the product should remain honest and useful.",
        ],
      },
    ],
  },
  {
    slug: "nasa-open-data-space-education",
    title: "How NASA Open Data Can Change Space Education",
    description:
      "NASA's open data ecosystem gives classrooms and independent learners access to real missions, real imagery, and real scientific context.",
    author: "COSMOS AI Editorial",
    date: "2026-07-03",
    readingTime: "5 min read",
    category: "NASA Data",
    tags: ["education", "NASA open data", "APOD", "Mars", "media archives"],
    featuredImage: "https://www.nasa.gov/wp-content/uploads/2022/07/main_image_deep_field_smacs0723-5mb.jpg",
    imageAlt: "James Webb deep field showing galaxies and gravitational lensing",
    pullQuote: "A Mars rover photo, an asteroid close approach, or an APOD story can become the start of a lesson instead of an afterthought.",
    factBox: {
      label: "Classroom idea",
      title: "Start with one authentic signal",
      body: "A single NASA image can support observation, vocabulary, source evaluation, and a short research question in the same activity.",
    },
    content: [
      {
        heading: "Learning from real missions",
        body: [
          "Space education becomes more memorable when learners work with authentic mission material. A Mars rover photo, an asteroid close approach, or an APOD story can become the start of a lesson instead of an afterthought.",
          "Public NASA APIs make this possible at web scale. They let products like COSMOS AI connect learners to current space activity without inventing fictional dashboards.",
        ],
      },
      {
        heading: "From archive to explanation",
        body: [
          "The hardest part of open data is often context. A beautiful image needs a date, mission, telescope, target, source link, and plain-language explanation.",
          "COSMOS AI's role is to organize those fragments into briefings, galleries, planetary views, and guided questions that students can actually use.",
        ],
      },
      {
        heading: "Trust through provenance",
        body: [
          "Education tools should show where information comes from. That is why source links, timestamps, and fallback labels matter as much as visual polish.",
        ],
      },
    ],
  },
  {
    slug: "beginners-guide-near-earth-objects",
    title: "Near-Earth Objects Without the Panic: A Beginner's Guide",
    description:
      "Near-Earth objects are asteroids and comets whose orbits bring them close to Earth. Here is how to read them without panic.",
    author: "COSMOS AI Research Notes",
    date: "2026-07-03",
    readingTime: "6 min read",
    category: "Space Science",
    tags: ["asteroids", "NeoWs", "planetary defense", "beginner"],
    featuredImage: "https://www.nasa.gov/wp-content/uploads/2021/11/asteroid-bennu-crop.jpg",
    imageAlt: "Asteroid Bennu photographed by NASA OSIRIS-REx",
    pullQuote: "Close does not mean dangerous. In astronomy, a close approach can still be millions of kilometers away.",
    factBox: {
      label: "Reading NeoWs",
      title: "Use distance and hazard together",
      body: "Miss distance, size range, velocity, and hazard flag should be read as a monitoring packet, not as a single dramatic number.",
    },
    content: [
      {
        heading: "What counts as a near-Earth object",
        body: [
          "A near-Earth object, often shortened to NEO, is an asteroid or comet with an orbit that approaches Earth's neighborhood. Most are small, distant, and safely monitored.",
          "NASA's NeoWs service helps developers and researchers inspect close-approach windows, miss distance, velocity, size estimates, and hazard flags.",
        ],
      },
      {
        heading: "Close does not mean dangerous",
        body: [
          "Astronomical distance is enormous. A close approach can still be millions of kilometers away. That is why COSMOS AI displays miss distance and hazard status together instead of relying on dramatic language.",
          "Potentially hazardous classification is a monitoring category. It does not mean an impact is expected.",
        ],
      },
      {
        heading: "How COSMOS uses NeoWs",
        body: [
          "The Daily Briefing and Earth Dashboard use NeoWs to summarize how many objects are visible in the current window and which listed object is closest.",
          "When NASA data is unavailable, COSMOS should say so clearly rather than filling the gap with fake live values.",
        ],
      },
    ],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export function getRelatedPosts(post: BlogPost, limit = 2) {
  return blogPosts
    .filter((candidate) => candidate.slug !== post.slug)
    .filter((candidate) => candidate.category === post.category || candidate.tags.some((tag) => post.tags.includes(tag)))
    .slice(0, limit);
}

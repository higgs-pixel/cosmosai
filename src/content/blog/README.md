# COSMOS AI Blog Writing Workflow

Blog content currently lives in `src/content/blog/posts.ts`.

## Add A New Post

1. Open `posts.ts`.
2. Add a new object to the `blogPosts` array.
3. Use a unique `slug` in lowercase kebab-case, for example `how-jwst-sees-infrared-light`.
4. Choose one category from `blogCategories`.
5. Add 3-6 focused tags.
6. Add article sections through the `content` array.

## Required Fields

- `slug`: lowercase kebab-case, no spaces.
- `title`: reader-facing headline.
- `description`: one-sentence summary for SEO and listing cards.
- `author`: team or author name.
- `date`: `YYYY-MM-DD`.
- `readingTime`: short label such as `5 min read`.
- `category`: one of the approved categories.
- `tags`: short topic labels.
- `content`: array of sections with `heading` and `body` paragraphs.

## Approved Categories

- Space Science
- NASA Data
- Artificial Intelligence
- Astronomy
- Research Notes
- COSMOS Updates

## Image Rules

`featuredImage` is optional. If used:

- Put the image in `public/images/blog/`.
- Use a root-relative path such as `/images/blog/jwst-field.jpg`.
- Verify the file exists before publishing.
- Use NASA/public-domain imagery only when licensing permits it.

## Publishing Checklist

- Slug is unique.
- Category exactly matches an approved category.
- Date is current and formatted correctly.
- Links in the article are working.
- No private keys, internal prompts, or unpublished roadmap details are included.
- Run `npm run lint`, `npm run typecheck`, and `npm run build`.

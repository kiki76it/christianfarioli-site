// Presentation-only copy for article bylines. Keep article data and SEO unchanged.
const POST_AUTHOR_SIGNATURES: Readonly<Record<string, readonly string[]>> = {
  'Prof. Christian Farioli': [
    'International Keynote Speaker | AI & Growth Strategist | Best Selling Author',
    'Forbes Contributor | Founder & CEO of the UAE’s First Digital Marketing Agency',
  ],
};

/** Local frontmatter roles cannot override a centrally maintained post signature. */
export function getPostAuthorSignature(name: string): readonly string[] | undefined {
  return Object.hasOwn(POST_AUTHOR_SIGNATURES, name) ? POST_AUTHOR_SIGNATURES[name] : undefined;
}

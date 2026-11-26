// Presentation-only copy for article bylines. Keep article data and SEO unchanged.
interface SignatureLine {
  text: string;
  linkedCredit?: { label: string; href: string };
}

const POST_AUTHOR_SIGNATURES: Readonly<Record<string, readonly SignatureLine[]>> = {
  'Prof. Christian Farioli': [
    { text: 'International Keynote Speaker | AI & Growth Strategist | Best Selling Author' },
    {
      linkedCredit: {
        label: 'Forbes Contributor',
        href: 'https://forbes.com.mx/author/prof-christian-farioli/',
      },
      text: 'Founder & CEO of the UAE’s First Digital Marketing Agency',
    },
  ],
};

/** Local frontmatter roles cannot override a centrally maintained post signature. */
export function getPostAuthorSignature(name: string): readonly SignatureLine[] | undefined {
  return Object.hasOwn(POST_AUTHOR_SIGNATURES, name) ? POST_AUTHOR_SIGNATURES[name] : undefined;
}

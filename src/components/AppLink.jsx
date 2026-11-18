// The site is served as plain prebuilt HTML files (no Next.js navigation data),
// so links are ordinary page loads. Same props as next/link for the ones we use.
export default function AppLink({ href, prefetch, replace, scroll, children, ...rest }) {
  return (
    <a href={typeof href === 'string' ? href : String(href)} {...rest}>
      {children}
    </a>
  );
}

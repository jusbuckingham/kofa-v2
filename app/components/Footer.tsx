import Link from "next/link";

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

const footerLinks: Readonly<
  Record<"company" | "resources" | "legal", readonly FooterLink[]>
> = {
  company: [
    { href: "/about", label: "About" },
    { href: "/support", label: "Support" },
  ],
  resources: [{ href: "/faq", label: "FAQ" }],
  legal: [{ href: "/copyright", label: "Copyright Policy" }],
};

const socialLinks: readonly FooterLink[] = [
  { href: "https://twitter.com/placeholder", label: "Twitter", external: true },
  { href: "https://github.com/placeholder", label: "GitHub", external: true },
  { href: "https://linkedin.com/in/placeholder", label: "LinkedIn", external: true },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t bg-gray-100 dark:bg-gray-900">
      <h2 className="sr-only">Site footer</h2>
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex flex-col items-center sm:flex-row sm:items-start sm:justify-between gap-8">
          <div className="text-center sm:text-left">
            <time dateTime={`${year}`} aria-label={`Copyright ${year}`}>
              © {year}
            </time>{" "}
            Kofa. All rights reserved.
          </div>

          <nav aria-label="Footer navigation" className="flex flex-col sm:flex-row gap-8">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                <ul className="space-y-1">
                  {links.map((link) => (
                    <li key={link.href}>
                      {(link.external === true) ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 dark:focus-visible:ring-gray-600"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          prefetch={false}
                          className="hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 dark:focus-visible:ring-gray-600"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <nav aria-label="Social media" className="flex space-x-6">
            {socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 dark:focus-visible:ring-gray-600"
              >
                {link.label === "Twitter" && (
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M23 3a10.9 10.9 0 01-3.14.86 4.48 4.48 0 001.98-2.48 9.06 9.06 0 01-2.88 1.1 4.52 4.52 0 00-7.7 4.12A12.85 12.85 0 013 4.15a4.52 4.52 0 001.4 6.03 4.48 4.48 0 01-2.05-.57v.06a4.52 4.52 0 003.63 4.43 4.52 4.52 0 01-2.04.08 4.52 4.52 0 004.22 3.14A9.05 9.05 0 013 19.54a12.77 12.77 0 006.92 2.03c8.3 0 12.84-6.88 12.84-12.84 0-.2 0-.39-.02-.58A9.2 9.2 0 0023 3z" />
                  </svg>
                )}
                {link.label === "GitHub" && (
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.6-3.37-1.34-3.37-1.34-.45-1.14-1.1-1.44-1.1-1.44-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.58 9.58 0 0112 6.8c.85.004 1.7.115 2.5.337 1.9-1.29 2.74-1.02 2.74-1.02.56 1.38.21 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.85 0 1.33-.01 2.4-.01 2.73 0 .27.18.58.69.48A10.013 10.013 0 0022 12c0-5.52-4.48-10-10-10z" />
                  </svg>
                )}
                {link.label === "LinkedIn" && (
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.27c-.97 0-1.75-.78-1.75-1.75S5.53 4.23 6.5 4.23 8.25 5 8.25 5.98 6.53 7.73 5.5 7.73zm13.5 11.27h-3v-5.5c0-1.32-1.68-1.22-1.68 0v5.5h-3v-10h3v1.36c1.39-2.58 5.68-2.77 5.68 2.46v6.18z" />
                  </svg>
                )}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
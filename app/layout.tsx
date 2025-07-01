import '/styles/globals.css';
import NewsTicker from './components/NewsTicker';

export const metadata = {
  title: 'Kofa AI',
  description: 'AI news interpreted through a Black lens',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header>
          {/* Public news ticker */}
          <NewsTicker />

          {/* Log Out button */}
          <div className="flex justify-end bg-black py-1 px-4 z-50">
            <a href="/api/auth/logout">
              <button className="px-2 py-1 bg-red-600 text-white rounded">
                Log Out
              </button>
            </a>
          </div>
        </header>

        {/* Page content */}
        {children}
      </body>
    </html>
  );
}
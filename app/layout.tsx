import '../styles/globals.css';
import Header from './components/Header';

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
      <body className="antialiased bg-gray-100 dark:bg-gray-900">
        <Header />
        <div className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </div>
      </body>
    </html>
  );
}
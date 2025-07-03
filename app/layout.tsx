import '../styles/globals.css';
import KindeWrapper from './components/KindeWrapper';
import AuthButtons from './components/AuthButtons';
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
        <KindeWrapper>
          <header>
            <div className="flex justify-between items-center bg-black py-1 px-4">
              <AuthButtons />
            </div>
            {/* News ticker bar */}
            <NewsTicker />
          </header>
          {children}
        </KindeWrapper>
      </body>
    </html>
  );
}
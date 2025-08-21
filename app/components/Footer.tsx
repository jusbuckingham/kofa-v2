import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-100 py-6 mt-12 border-t">
      <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row justify-between items-center text-gray-600 text-sm">
        <div>© {new Date().getFullYear()} Kofa. All rights reserved.</div>
        <div className="flex space-x-4 mt-2 sm:mt-0">
          <Link href="/support" className="hover:text-gray-900">Support</Link>
          <span>|</span>
          <Link href="/faq" className="hover:text-gray-900">FAQ</Link>
          <span>|</span>
          <Link href="/about" className="hover:text-gray-900">About</Link>
          <span>|</span>
          <Link href="/copyright" className="hover:text-gray-900">Copyright</Link>
        </div>
      </div>
    </footer>
  );
}
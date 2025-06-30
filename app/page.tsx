import Image from "next/image";
import NewsTicker from "./components/NewsTicker";

export default function Home() {
  return (
    <>
      {/* Top-of-page news ticker */}
      <NewsTicker />

      <div className="flex items-center justify-center min-h-screen p-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <Image
          src="/images/image.png"
          alt="Kofa AI Preview"
          width={900}
          height={506}
          className="rounded-xl shadow-xl"
          priority
        />
      </div>
    </>
  );
}

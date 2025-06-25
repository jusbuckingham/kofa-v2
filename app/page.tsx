import Image from "next/image";
import previewImage from "/public/images/image.png";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <Image
        src={previewImage}
        alt="Kofa AI Preview"
        width={900}
        height={506}
        className="rounded-xl shadow-xl"
        priority
      />
    </div>
  );
}

export const metadata = {
  title: "About - Kofa",
  description: "Learn more about Kofa AI, our mission, and the team behind the platform.",
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">About Kofa AI</h1>
      <p className="text-gray-700 leading-relaxed">
        Kofa AI is a SaaS product that delivers AI-powered news aggregation with a Black point of view. Our platform curates and presents news stories that matter to the Black community, ensuring a unique and inclusive perspective.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">Our Mission</h2>
      <p className="text-gray-700 leading-relaxed">
        Our mission is to make news more inclusive and accessible by highlighting stories and voices that are often underrepresented in mainstream media.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">The Team</h2>
      <p className="text-gray-700 leading-relaxed">
        Founded by technologists and storytellers passionate about representation in media and technology, our team is dedicated to building a platform that empowers and informs.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">Contact Us</h2>
      <p className="text-gray-700 leading-relaxed">
        For inquiries or support, please visit our Support page or email us at support@kofa.ai.
      </p>
    </div>
  );
}

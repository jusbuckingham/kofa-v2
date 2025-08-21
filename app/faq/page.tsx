

export const metadata = {
  title: "FAQ - Kofa",
  description: "Frequently asked questions about Kofa and our platform",
};

export default function FAQPage() {
  return (
    <main className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Frequently Asked Questions</h1>
      <dl className="space-y-8">
        <div>
          <dt className="text-xl font-semibold text-gray-800">What is Kofa?</dt>
          <dd className="mt-2 text-gray-700">
            Kofa is an AI-powered platform that delivers news summaries with a unique perspective.
          </dd>
        </div>
        <div>
          <dt className="text-xl font-semibold text-gray-800">How do I subscribe?</dt>
          <dd className="mt-2 text-gray-700">
            You can subscribe via our pricing page, which integrates securely with Stripe.
          </dd>
        </div>
        <div>
          <dt className="text-xl font-semibold text-gray-800">Is there a free trial?</dt>
          <dd className="mt-2 text-gray-700">
            Yes, we offer a limited free trial so you can explore the platform.
          </dd>
        </div>
        <div>
          <dt className="text-xl font-semibold text-gray-800">How can I contact support?</dt>
          <dd className="mt-2 text-gray-700">
            You can reach us via the Support link in the footer or by email at <a href="mailto:support@kofa.ai" className="text-blue-600 underline">support@kofa.ai</a>.
          </dd>
        </div>
      </dl>
    </main>
  );
}
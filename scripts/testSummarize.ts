// scripts/testSummarize.ts
import summarizeWithPerspective from '../lib/summarize';

(async () => {
  try {
    // Replace this sample text with any article snippet you want to test
    const article = `In a historic move, civil rights leaders gathered in Atlanta to discuss the future of Black empowerment initiatives.`;
    const summary = await summarizeWithPerspective(article);
    console.log('✅ Summary:', summary);
  } catch (err) {
    console.error('❌ Summarizer error:', err);
  }
})();
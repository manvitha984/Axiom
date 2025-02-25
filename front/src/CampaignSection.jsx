import hero2 from "./assets/hero2.png-removebg-preview.png";

export default function CampaignSection() {
  return (
    <section className="bg-[#FFF8F8] py-16 px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 flex justify-center">
          <img src={hero2} alt="Campaign" className="rounded-lg" />
        </div>
        <div className="md:w-1/2 text-left mt-6 md:mt-0 md:pl-12">
          <h2 className="text-3xl font-bold text-gray-900">
            Meet Campaign Goals
          </h2>
          <div className="text-lg text-gray-600 mt-4 space-y-4">
            <div className="flex items-center">
              <span className="text-black text-xl mr-3">✔️</span>
              <p>Optimize Business Operations – Enhance efficiency by automating repetitive tasks.</p>
            </div>
            <div className="flex items-center">
              <span className="text-black text-xl mr-3">✔️</span>
              <p>Automate Document Processing – Convert and extract key data from documents seamlessly.</p>
            </div>
            <div className="flex items-center">
              <span className="text-black text-xl mr-3">✔️</span>
              <p> Understand Customer Sentiment – Analyze emails to measure customer satisfaction and trends.</p>
            </div>
            <div className="flex items-center">
              <span className="text-black text-xl mr-3">✔️</span>
              <p> Summarize Key Insights from Videos – AI-powered video summarization for quick decision-making.</p>
            </div>
            <div className="flex items-center">
              <span className="text-black text-xl mr-3">✔️</span>
              <p> Scale with AI Efficiency – Adapt and grow without increasing manual effort.</p>
            </div>
          </div>
          <div className="mt-6 flex space-x-4">
            <button className="px-7 py-3 bg-[#FE6059] text-white font-medium rounded-md hover:bg-red-600">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
import hero from "./assets/hero.png";

export default function HeroSection() {
  return (
    <section className="bg-[#FFF8F8] py-17 px-8 flex items-center justify-center">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 text-left">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            Automate Workflows, <br /> Boost Productivity with AI
          </h1>
          <h2 className="text-lg text-gray-600 mt-4">
            AI-driven automation to streamline repetitive tasks and optimize efficiency.
          </h2>
          <div className="mt-6 flex space-x-4">
            <button className="px-7 py-3 bg-[#FE6059] text-white font-medium rounded-md hover:bg-red-600">
              Get Started
            </button>
          </div>
        </div>
        <div className="md:w-1/2 flex justify-center mt-8 md:mt-1">
          <img src={hero} alt="AI Automation" className="rounded-lg w-[100%]" />
        </div>
      </div>
    </section>
  );
}

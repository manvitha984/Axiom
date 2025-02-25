const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } = require("@google/generative-ai");
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-8b",
  });
  
  const generationConfig = {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  };
  
  async function generateSummary(text) {
    try {
      const prompt = `Please summarize this video transcription in a clear, structured format.
      Focus on key points and main ideas. Keep it under 500 words.
      
      Transcription:
      ${text}`;
  
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return {
        summary: response.text()
      };
    } catch (error) {
      console.error("Error generating summary:", error);
      return { error: error.message };
    }
  }
  
  // Get text from command line arguments
  const inputText = process.argv[2] ? JSON.parse(process.argv[2]) : "";
  generateSummary(inputText)
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => console.error(JSON.stringify({ error: error.message })));
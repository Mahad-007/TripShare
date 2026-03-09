
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API client correctly using the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSmartItinerary = async (destination: string, days: number) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a ${days}-day travel itinerary for ${destination}. 
      Include 3-4 activities per day. Format the response as a clear, list-based markdown.`,
      config: {
        systemInstruction: "You are a professional travel planner specializing in efficient group trips.",
        temperature: 0.7,
      },
    });
    // Access the generated text content via the .text property
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Could not generate itinerary. Please check your connection.";
  }
};

export const summarizeExpenses = async (expenses: any[], participants: string[]) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert financial analyst for travel groups. 
      Analyze these expenses: ${JSON.stringify(expenses)}. 
      The group consists of: ${participants.join(", ")}.
      
      Provide:
      1. A very brief spending summary.
      2. Who spent the most and on what.
      3. Precise settlement instructions (Who should pay whom to reach a zero balance).
      Keep it concise and friendly.`,
      config: {
        temperature: 0.2, // Lower temperature for more consistent calculation advice
      }
    });
    // Access the generated text content via the .text property
    return response.text;
  } catch (error) {
    return "Unable to summarize expenses at this time. Please try again.";
  }
};

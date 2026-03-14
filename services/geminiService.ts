
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'google/gemini-2.0-flash-001';

async function chatCompletion(
  messages: { role: string; content: string }[],
  temperature: number = 0.7
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter API key is not configured.');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'TripShare',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || `OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export const getSmartItinerary = async (destination: string, days: number) => {
  try {
    const result = await chatCompletion(
      [
        {
          role: 'system',
          content: 'You are a professional travel planner specializing in efficient group trips.',
        },
        {
          role: 'user',
          content: `Create a ${days}-day travel itinerary for ${destination}.
      Include 3-4 activities per day. Format the response as a clear, list-based markdown.`,
        },
      ],
      0.7
    );
    return result;
  } catch (error) {
    console.error('AI Error:', error);
    return 'Could not generate itinerary. Please check your connection.';
  }
};

export const summarizeExpenses = async (expenses: any[], participants: string[]) => {
  try {
    const result = await chatCompletion(
      [
        {
          role: 'user',
          content: `You are an expert financial analyst for travel groups.
      Analyze these expenses: ${JSON.stringify(expenses)}.
      The group consists of: ${participants.join(', ')}.

      Provide:
      1. A very brief spending summary.
      2. Who spent the most and on what.
      3. Precise settlement instructions (Who should pay whom to reach a zero balance).
      Keep it concise and friendly.`,
        },
      ],
      0.2
    );
    return result;
  } catch (error) {
    return 'Unable to summarize expenses at this time. Please try again.';
  }
};

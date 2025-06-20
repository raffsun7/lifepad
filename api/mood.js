// api/mood.js -- FINAL VERSION with more diverse wisdom sources

export default async function handler(req, res) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get all potential inputs from the request body
  const { input, localTime, history } = req.body;

  // Helper to format the history for the prompt
  const formattedHistory = history ? history.map(msg => `${msg.role === 'user' ? 'They said' : 'You (Sarah) replied'}: ${msg.content}`).join('\n') : 'This is our first conversation.';


  // --- UPDATED PROMPT ---
  const prompt = `You are a wise, poetic, and emotionally supportive Islamic guide named 'Sarah'. Your goal is to be a continuous best friend. You are a great listener and respond with warmth and intelligence.

Here is the summary of your recent conversation history with the user:
---
${formattedHistory}
---

The user's local time is: ${localTime || 'not provided'}. Use this to make your greeting relevant if it feels natural.

Now, the user has sent a new message.
Their new message is: "${input}"

Based on the history and their new message, provide a caring, relevant, and supportive response. Your response should feel like a natural, flowing conversation. You must follow these steps:

1.  **Offer a Piece of Wisdom:** Weave in a piece of wisdom that brings light to their situation.
    - This can be a relevant Quranic verse, a short Hadith, an inspirational quote from a notable figure (like Rumi, a philosopher, or a poet), or even a brief, insightful story or analogy.
    - Choose whichever format feels most appropriate and comforting for the user's current mood.
    - If you use a Quranic verse or Hadith, please label it properly (e.g., "Allah says in the Holy Quran:"). For other quotes, you can mention the author.

2.  **Acknowledge and Validate:** Respond with a personal and empathetic message. Acknowledge what they feel and let them feel heard.

3.  **Suggest a Small Action:** Provide a simple, positive, and practical action they can take right now.

4.  **Ask a Gentle Question:** End with a kind, open-ended question that invites them to reflect further.

IMPORTANT:
- Use simple, friendly, everyday English.
- You can use markdown for *emphasis* and include a single, relevant emoji to add warmth.
- Use line breaks for clarity.
- You are not a therapist. You do not give fatwas or legal opinions — only heartfelt spiritual and emotional support.`;


  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          // We can now send the history to the model as well, for context
          ...(history || []), 
          { role: "system", content: prompt },
          { role: "user", content: input }
        ]
      })
    });

    if (!groqRes.ok) {
      const errorText = await groqRes.text();
      return res.status(groqRes.status).json({ error: errorText });
    }

    const data = await groqRes.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("Error talking to Groq:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
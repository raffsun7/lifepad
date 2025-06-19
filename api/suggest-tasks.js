// api/suggest-tasks.js

// This is a Vercel serverless function that acts as a secure proxy to the Groq API.
export default async function handler(req, res) {
  // Ensure this function only handles POST requests.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Securely get the Groq API key from environment variables.
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY is not configured." });
  }

  const { goal } = req.body;

  // Validate that a goal was provided in the request.
  if (!goal) {
    return res.status(400).json({ error: "User goal is required." });
  }

  // This is a carefully crafted prompt to instruct the AI.
  // It specifically asks for the output to be ONLY a JSON array of strings.
  const prompt = `You are an expert productivity assistant. Your sole purpose is to take a user's goal and break it down into 3-5 simple, actionable tasks that can be completed today.

User's goal: "${goal}"

Your response MUST be a valid JSON array of strings. Each string in the array should be a single task. Do NOT include any introductory text, explanations, or markdown formatting like \`\`\`json. Your entire response should be nothing but the JSON array itself, starting with '[' and ending with ']'.

For example, if the user's goal is 'prepare for my exam', a valid response would be:
["Review chapter 3 notes", "Complete 10 practice problems", "Create flashcards for key terms", "Schedule a 30-minute study break"]`;

  try {
    // Make the POST request to the Groq API.
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: prompt }
        ],
        // We can set a lower temperature for more predictable, focused output.
        temperature: 0.5, 
      })
    });

    if (!groqRes.ok) {
      const errorText = await groqRes.text();
      console.error("Groq API Error:", errorText);
      return res.status(groqRes.status).json({ error: "Failed to get a response from the AI." });
    }

    const data = await groqRes.json();
    const aiResponseText = data.choices[0].message.content;

    // The frontend expects a clean JSON array. We parse the AI's string response
    // to validate it's correct JSON and then send it back.
    try {
      const suggestedTasks = JSON.parse(aiResponseText);
      res.status(200).json(suggestedTasks);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", aiResponseText);
      res.status(500).json({ error: "The AI returned an invalid format." });
    }

  } catch (err) {
    console.error("Internal Server Error:", err);
    res.status(500).json({ error: "An internal error occurred." });
  }
}
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

  const prompt = `You are an expert productivity assistant...`; // The prompt remains the same

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [{ role: "system", content: prompt }],
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

    // --- UPDATED: More robust JSON parsing ---
    try {
      // First, try to parse the whole response directly.
      const suggestedTasks = JSON.parse(aiResponseText);
      res.status(200).json(suggestedTasks);
    } catch (directParseError) {
      // If direct parsing fails, try to find a JSON array within the string.
      console.warn("Direct JSON parsing failed. Attempting to extract from string.");
      console.log("Original AI Response:", aiResponseText);

      // This regex looks for a string that starts with [ and ends with ]
      const jsonMatch = aiResponseText.match(/\[.*\]/s);

      if (jsonMatch && jsonMatch[0]) {
        try {
          const extractedTasks = JSON.parse(jsonMatch[0]);
          res.status(200).json(extractedTasks);
        } catch (extractionParseError) {
          console.error("Failed to parse the extracted JSON:", extractionParseError);
          res.status(500).json({ error: "The AI returned an invalid format that could not be repaired." });
        }
      } else {
        console.error("No valid JSON array found in the AI's response.");
        res.status(500).json({ error: "The AI returned an invalid format." });
      }
    }

  } catch (err) {
    console.error("Internal Server Error:", err);
    res.status(500).json({ error: "An internal error occurred." });
  }
}
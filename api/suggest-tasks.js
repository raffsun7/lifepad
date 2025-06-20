// api/suggest-tasks.js -- FINAL, MORE ROBUST VERSION

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY is not configured." });
  }

  const { goal } = req.body;
  if (!goal) {
    return res.status(400).json({ error: "User goal is required." });
  }

  // --- UPDATED AND IMPROVED PROMPT ---
  const prompt = `You are an expert productivity assistant. Your sole purpose is to take a user's goal and break it down into 3-5 simple, actionable tasks.

User's goal: "${goal}"

IMPORTANT INSTRUCTIONS:
1. Your response MUST be a valid JSON array of strings.
2. Each string in the array should be a single, concise task.
3. Do NOT include any introductory text, explanations, or markdown formatting like \`\`\`json.
4. Your entire response should be nothing but the JSON array itself, starting with '[' and ending with ']'.
5. If you cannot generate relevant tasks for the given goal for any reason, you MUST respond with an empty JSON array: []. Do NOT respond with an explanation or any other text.

Example of a good response:
["Review chapter 3 notes", "Complete 10 practice problems", "Create flashcards for key terms", "Schedule a 30-minute study break"]

Example of a good response for an impossible goal:
[]`;

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
          { role: "system", content: prompt }
        ],
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

    // The robust parsing logic from before
    try {
      const suggestedTasks = JSON.parse(aiResponseText);
      res.status(200).json(suggestedTasks);
    } catch (directParseError) {
      console.warn("Direct JSON parsing failed. Attempting to extract from string.");
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
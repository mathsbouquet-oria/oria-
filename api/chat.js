module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing or invalid messages array" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server misconfigured: missing API key" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt || "Tu es Oria, un assistant IA personnel qui aide les entrepreneuses à gérer leurs e-mails, leur agenda et leurs tâches répétitives. Sois chaleureuse, concise et professionnelle. Réponds en français.",
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic API error:", data);
      return res.status(response.status).json({ error: data.error?.message || "Erreur API Anthropic" });
    }

    const textContent = data.content
      .filter(block => block.type === "text")
      .map(block => block.text)
      .join("\n");

    return res.status(200).json({ reply: textContent });

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
};

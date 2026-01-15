const SYSTEM_PROMPT =
  "你是一个AI学习记录助理，知识范围仅限以下内容：\n" +
  "1) 教学卡片1：前期准备已完成；处理网络与支付问题；Gemini因账号问题暂不考虑，先使用ChatGPT。\n" +
  "2) 教学卡片2：了解主流模型与工具（DeepSeek、Gemini、Claude、通义千问、Kimi Chat、Midjourney、Sora、GitHub Copilot、Suno、扣子/Coze）；学习提示词工程；了解Markdown与Json；开始使用Notion。\n" +
  "3) 教学卡片3：使用即梦生成赛博朋克风格图片；总结文生图提示词要素与镜头表达；提示词过细可能导致偏差。\n" +
  "回答要求：简洁清晰，优先用中文，超出知识范围就提示只能基于卡片内容回答。";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing DEEPSEEK_API_KEY" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (error) {
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }
  }

  const incoming = Array.isArray(body && body.messages) ? body.messages : [];
  const sanitized = incoming
    .filter((item) => item && typeof item.content === "string")
    .map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.content.trim(),
    }))
    .filter((item) => item.content);

  if (!sanitized.length) {
    res.status(400).json({ error: "Empty messages" });
    return;
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...sanitized],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(500).json({ error: text || "Upstream error" });
      return;
    }

    const data = await response.json();
    const reply =
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? data.choices[0].message.content.trim()
        : "";

    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ error: "Request failed" });
  }
};


// c:/0-Music Fun/Backups/backup for firestore/functions/antigravity/pipeline.js

// Heuristic dynamic fallback template compiler
function generateLocallyFallback(args) {
  const {
    childAge,
    traitsSelected = [],
    curiousAbout = [],
    curiousRefinements = {},
    energeticAbout = [],
    energeticRefinements = {},
    shyAbout = [],
    shyRefinements = {},
    sensitiveTo = [],
    sensitiveRefinements = {},
    socialIn = [],
    socialRefinements = {},
    distractedBy = [],
    focusHelpers = [],
    enjoys = [],
    growthGoals = [],
    notes = ''
  } = args;

  const summaryTraits = traitsSelected.join(', ');
  const greeting = `### Welcome to Music Fun!

At **${childAge}**, your little one is entering an incredible window of cognitive and auditory development. Based on your profile selections, here is how our **Music Fun With Your Little One** program is mapped to support their development:`;

  const sections = [];

  if (traitsSelected.includes('curious') && curiousAbout.length > 0) {
    const items = curiousAbout.join(' and ');
    sections.push(`**🌟 Supporting Curiosity & Discovery:**\nYour child shows natural curiosity towards **${items}**. During our session activities (like exploring instrument sounds and watching Banjo the Giraffe's hoof-tapping counts), we encourage active investigation. We build early cognitive connections by letting curious learners lead counting patterns and notice speed variations (BPM) in our play.`);
  }

  if (traitsSelected.includes('energetic') && energeticAbout.length > 0) {
    const activities = energeticAbout.join(' and ');
    sections.push(`**⚡ Active Gross Motor Play:**\nSince your child is energetic about **${activities}**, we channel that movement into steady-beat coordination. We encourage clapping, stomping, and tapping kitchen pots or simple rhythm items to build physical rhythm synchronization rather than expecting quiet sitting.`);
  }

  if (traitsSelected.includes('shy') && shyAbout.length > 0) {
    const fears = shyAbout.join(' and ');
    sections.push(`**💜 Safety & Confidence:**\nFor children showing hesitation in **${fears}**, we provide a low-pressure studio space. Your child is welcome to listen quietly or doodle on our digital whiteboard. We build vocal confidence slowly, letting them unmute when comfortable.`);
  }

  if (traitsSelected.includes('sensitive') && sensitiveTo.length > 0) {
    sections.push(`**🛡️ Sensory-Friendly Structure:**\nTo support sensitivity to volume or visual changes, we keep class segments structured, predictable, and aurally comfortable. We avoid sudden loud sound effects and visual flashing, keeping the environment safe and focused.`);
  }

  if (traitsSelected.includes('social') && socialIn.length > 0) {
    sections.push(`**🤝 Sharing & Turn-taking:**\nWe leverage our visual grid to support peer imitation and turn-taking games. This fosters early social listening and cooperative play, encouraging connection with classmates.`);
  }

  if (traitsSelected.includes('distracted') && distractedBy.length > 0) {
    const helpers = focusHelpers.join(', ');
    sections.push(`**🎯 Engaging Focus Helpers:**\nTo guide focus back from distractions, we utilize **${helpers}**. Bright whiteboard color highlighting and direct mascot animations from Banjo serve as gentle cues to anchor your child's attention.`);
  }

  if (notes.trim()) {
    sections.push(`**📝 Special Notes:**\nWe have aligned our program approach to support your special guidance: *"${notes.trim()}"*.`);
  }

  return `
# Music Fun Personalized Alignment
*Profile summary: ${summaryTraits || 'Standard Development'}*

${greeting}

${sections.join('\n\n')}

We look forward to enjoying this musical journey together!
  `.trim();
}

async function callGemini({ model, fn, args, apiKey }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const promptText = `
Payload:
${JSON.stringify(args, null, 2)}

Please call the function ${fn.name} with these arguments to generate the explanation narrative in Markdown.
  `;

  const requestBody = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          explanation: { 
            type: "STRING", 
            description: "Personalized explanation narrative for parents structured in Markdown." 
          }
        },
        required: ["explanation"]
      }
    },
    systemInstruction: {
      parts: [{ text: fn.description }]
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) {
    throw new Error("No output candidate returned from Gemini.");
  }

  const parsedJson = JSON.parse(resultText);
  return {
    output: {
      explanation: parsedJson.explanation
    }
  };
}

async function callClaude({ model, fn, args, apiKey }) {
  let anthropicModel = model;
  if (model === "claude-3-sonnet") {
    anthropicModel = "claude-3-sonnet-20240229";
  }

  const url = "https://api.anthropic.com/v1/messages";
  const requestBody = {
    model: anthropicModel,
    max_tokens: 4000,
    system: fn.description,
    messages: [
      {
        role: "user",
        content: `Child Profile Payload:\n${JSON.stringify(args, null, 2)}`
      }
    ],
    tools: [
      {
        name: fn.name,
        description: "Generate the structured parent explanation output.",
        input_schema: {
          type: "object",
          properties: {
            explanation: {
              type: "string",
              description: "The personalized explanation narrative for parents in clear formatted Markdown."
            }
          },
          required: ["explanation"]
        }
      }
    ],
    tool_choice: {
      type: "tool",
      name: fn.name
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const toolUse = data.content?.find(c => c.type === "tool_use");
  if (!toolUse || !toolUse.input || !toolUse.input.explanation) {
    throw new Error("Invalid tool output from Claude response.");
  }

  return {
    output: {
      explanation: toolUse.input.explanation
    }
  };
}

/**
 * CommonJS generic pipeline helper that handles calling Gemini and Claude APIs
 */
async function pipeline({ model = "gemini-1.5-pro", function: fn, arguments: args }) {
  // Check Gemini first
  if (model.startsWith("gemini")) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      return await callGemini({ model, fn, args, apiKey });
    }
  }

  // Check Claude
  if (model.startsWith("claude")) {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (apiKey) {
      return await callClaude({ model, fn, args, apiKey });
    }
  }

  // If we reach here and have no API key, or unsupported model, throw error to trigger failover or fallback
  throw new Error(`No active API key found for model "${model}" or unsupported model configuration.`);
}

module.exports = { pipeline };

// c:/0-Music Fun/Backups/backup for firestore/functions/antigravity/functions.js

const functions = {
  generatePersonalizedMusicFunExplanation: {
    name: "generatePersonalizedMusicFunExplanation",
    description: "Generate a warm, encouraging, personalized explanation for parents showing why the Music Fun With Your Little One program is a great fit for their child. Use the structured trait selections provided (age, personality traits, curiosity details, energetic behaviors, sensitivities, social tendencies, focus helpers, enjoyment preferences, and growth goals) to create a parent‑friendly narrative. Connect each selected trait to specific activities, experiences, and developmental benefits within the program. Avoid clinical language. Celebrate the child’s individuality. Make the parent feel understood and confident. Keep the tone warm, supportive, and joyful.",
    parameters: {
      type: "object",
      properties: {
        childAge: { "type": "string" },

        traitsSelected: {
          "type": "array",
          "items": { "type": "string" }
        },

        curiousAbout: {
          "type": "array",
          "items": { "type": "string" }
        },
        curiousRefinements: {
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": { "type": "string" }
          }
        },

        energeticAbout: {
          "type": "array",
          "items": { "type": "string" }
        },
        energeticRefinements: {
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": { "type": "string" }
          }
        },

        shyAbout: {
          "type": "array",
          "items": { "type": "string" }
        },
        shyRefinements: {
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": { "type": "string" }
          }
        },

        sensitiveTo: {
          "type": "array",
          "items": { "type": "string" }
        },
        sensitiveRefinements: {
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": { "type": "string" }
          }
        },

        socialIn: {
          "type": "array",
          "items": { "type": "string" }
        },
        socialRefinements: {
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": { "type": "string" }
          }
        },

        distractedBy: {
          "type": "array",
          "items": { "type": "string" }
        },
        focusHelpers: {
          "type": "array",
          "items": { "type": "string" }
        },
        focusRefinements: {
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": { "type": "string" }
          }
        },

        enjoys: {
          "type": "array",
          "items": { "type": "string" }
        },
        enjoysRefinements: {
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": { "type": "string" }
          }
        },

        growthGoals: {
          "type": "array",
          "items": { "type": "string" }
        },
        growthRefinements: {
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": { "type": "string" }
          }
        },

        notes: { "type": "string" }
      },
      "required": ["childAge", "traitsSelected"]
    }
  }
};

module.exports = { functions };

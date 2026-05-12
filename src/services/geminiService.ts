import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function generatePresentationStructure(
  topic: string,
  style: string = "professional",
  slideCount: number = 5
) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",

      contents: `
Generate a professional presentation structure.

Topic: "${topic}"
Style: "${style}"

Create ${slideCount} slides.

For each slide provide:
- title
- bullet point content
- detailed image prompt

Keep output concise, visually structured, and presentation-ready.
      `,

      config: {
        responseMimeType: "application/json",

        responseSchema: {
          type: Type.OBJECT,

          properties: {
            slides: {
              type: Type.ARRAY,

              items: {
                type: Type.OBJECT,

                properties: {
                  title: {
                    type: Type.STRING,
                  },

                  content: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING,
                    },
                  },

                  imagePrompt: {
                    type: Type.STRING,
                  },
                },

                required: [
                  "title",
                  "content",
                  "imagePrompt",
                ],
              },
            },
          },

          required: ["slides"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");

    return parsed.slides || [];

  } catch (error) {

    console.error(
      "Presentation Structure Generation Error:",
      error
    );

    return [
      {
        title: "Error",
        content: [
          "Unable to generate presentation structure."
        ],
        imagePrompt: "Minimal dark presentation background",
      },
    ];
  }
}

export async function beautifySlideAesthetic(
  title: string,
  content: string
) {
  try {

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",

      contents: `
Analyze this presentation slide.

DO NOT rewrite the text.

Return:
1. best layout:
- basic
- split
- focus

2. professionally formatted content.

Title:
${title}

Content:
${content}
      `,

      config: {
        responseMimeType: "application/json",

        responseSchema: {
          type: Type.OBJECT,

          properties: {
            layout: {
              type: Type.STRING,
              enum: ["basic", "split", "focus"],
            },

            formattedContent: {
              type: Type.STRING,
            },
          },

          required: [
            "layout",
            "formattedContent",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");

    return {
      layout: parsed.layout || "basic",
      formattedContent: parsed.formattedContent || content,
    };

  } catch (error) {

    console.error(
      "Slide Beautification Error:",
      error
    );

    return {
      layout: "basic",
      formattedContent: content,
    };
  }
}

export async function generateSlideImage(prompt: string) {

  try {

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",

      contents: `
Generate a detailed presentation background concept.

Style:
Minimal
Professional
Modern
Presentation-friendly

Prompt:
${prompt}
      `,
    });

    const generatedText =
      response.text ||
      "professional abstract presentation background";

    return `https://picsum.photos/seed/${encodeURIComponent(
      generatedText
    )}/1600/900`;

  } catch (error) {

    console.error(
      "Gemini Image Generation Error:",
      error
    );

    return `https://picsum.photos/seed/${encodeURIComponent(
      prompt
    )}/1600/900`;
  }
}
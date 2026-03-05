import { NextRequest, NextResponse } from "next/server";
import { createGateway, generateObject } from "ai";
import { z } from "zod";
import { getRequiredUser } from "@/lib/auth";

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

const TranslationSchema = z.object({
  translatedText: z.string().describe("The translated text"),
});

export async function POST(req: NextRequest) {
  const user = await getRequiredUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text, targetLanguage } = await req.json();
  if (!text || !targetLanguage) {
    return NextResponse.json(
      { error: "text and targetLanguage required" },
      { status: 400 }
    );
  }

  const langName = targetLanguage === "zh" ? "Chinese" : "English";

  try {
    const { object } = await generateObject({
      model: gateway("openai/gpt-4o-mini"),
      schema: TranslationSchema,
      prompt: `Translate the following text to ${langName}. If the text is already in ${langName}, return it as-is. Only translate, do not add explanations.\n\nText: "${text}"`,
    });

    return NextResponse.json({ translatedText: object.translatedText });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}

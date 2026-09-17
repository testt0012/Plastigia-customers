import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GREEK_REGIONS } from "@/lib/regions";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXTRACT_TOOL_NAME = "extract_store_info";

// Shape returned to the client and used to auto-fill the manual form.
interface ExtractedStoreInfo {
  name: string;
  category: string;
  address: string;
  phone: string;
  city: string;
  region: string;
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Λείπει το ANTHROPIC_API_KEY στον server. Επικοινωνήστε με τον διαχειριστή." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Δεν στάλθηκε εικόνα." },
      { status: 400 }
    );
  }

  if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Μη υποστηριζόμενος τύπος αρχείου. Χρησιμοποιήστε JPEG, PNG, WEBP ή GIF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Η εικόνα είναι πολύ μεγάλη (μέγιστο 10MB)." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64Data = buffer.toString("base64");

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4096,
      tools: [
        {
          name: EXTRACT_TOOL_NAME,
          description:
            "Extract business contact details for a hardware / sanitary-ware / building-materials store from a photo of a storefront, business card, or receipt. Use an empty string for any field that isn't visible or can't be determined.",
          input_schema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "The store/business name as printed.",
              },
              category: {
                type: "string",
                description:
                  "Type of store in Greek, e.g. 'Είδη υγιεινής', 'Οικοδομικά υλικά', 'Σιδηρικά', 'Χρώματα', 'Πλακάκια'.",
              },
              address: {
                type: "string",
                description: "Full street address if visible, in Greek.",
              },
              phone: {
                type: "string",
                description: "Phone number if visible, as printed.",
              },
              city: {
                type: "string",
                description: "City or town in Greek, if identifiable.",
              },
              region: {
                type: "string",
                description:
                  "Best-guess Greek geographic region for the city above. Must be one of the enum values, or an empty string if it cannot be determined.",
                enum: [...GREEK_REGIONS, ""],
              },
            },
            required: ["name", "category", "address", "phone", "city", "region"],
            additionalProperties: false,
          },
          strict: true,
        },
      ],
      tool_choice: { type: "tool", name: EXTRACT_TOOL_NAME },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: "Extract the store's contact details from this image using the extract_store_info tool.",
            },
          ],
        },
      ],
    });

    const toolUseBlock = response.content.find(
      (block) => block.type === "tool_use" && block.name === EXTRACT_TOOL_NAME
    );

    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      return NextResponse.json(
        { error: "Το μοντέλο AI δεν επέστρεψε δομημένα δεδομένα. Δοκιμάστε ξανά με πιο καθαρή φωτογραφία." },
        { status: 502 }
      );
    }

    const extracted = toolUseBlock.input as ExtractedStoreInfo;
    return NextResponse.json(extracted);
  } catch (err) {
    console.error("extract-store error:", err);
    const message =
      err instanceof Anthropic.APIError
        ? `Σφάλμα Vision AI: ${err.message}`
        : "Απρόσμενο σφάλμα κατά την εξαγωγή στοιχείων.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

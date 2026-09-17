import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GREEK_REGIONS } from "@/lib/regions";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20MB
const EXTRACT_TOOL_NAME = "extract_store_list";
const MAX_STORES = 300;

interface ExtractedStore {
  name: string;
  category: string;
  address: string;
  phone: string;
  website: string;
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
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Δεν στάλθηκε αρχείο." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Το αρχείο πρέπει να είναι PDF." }, { status: 400 });
  }

  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "Το PDF είναι πολύ μεγάλο (μέγιστο 20MB)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64Data = buffer.toString("base64");

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      tools: [
        {
          name: EXTRACT_TOOL_NAME,
          description:
            "Extract every hardware / sanitary-ware / building-materials store listed in this document into a structured list. Use an empty string for any field that isn't present for a given store.",
          input_schema: {
            type: "object",
            properties: {
              stores: {
                type: "array",
                maxItems: MAX_STORES,
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "The store/business name as printed." },
                    category: {
                      type: "string",
                      description:
                        "Type of store in Greek, e.g. 'Είδη υγιεινής', 'Οικοδομικά υλικά', 'Σιδηρικά', 'Χρώματα', 'Πλακάκια'.",
                    },
                    address: { type: "string", description: "Full street address if present, in Greek." },
                    phone: { type: "string", description: "Phone number if present, as printed." },
                    website: { type: "string", description: "Website URL or domain if present for this store." },
                    city: { type: "string", description: "City or town in Greek, if identifiable." },
                    region: {
                      type: "string",
                      description:
                        "Best-guess Greek geographic region for the city above. Must be one of the enum values, or an empty string if it cannot be determined.",
                      enum: [...GREEK_REGIONS, ""],
                    },
                  },
                  required: ["name", "category", "address", "phone", "website", "city", "region"],
                  additionalProperties: false,
                },
              },
            },
            required: ["stores"],
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
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64Data },
            },
            {
              type: "text",
              text: "Extract every store listed in this document using the extract_store_list tool.",
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
        { error: "Το μοντέλο AI δεν επέστρεψε δομημένα δεδομένα. Δοκιμάστε ξανά με διαφορετικό αρχείο." },
        { status: 502 }
      );
    }

    const { stores } = toolUseBlock.input as { stores: ExtractedStore[] };
    return NextResponse.json({ stores, truncated: stores.length >= MAX_STORES });
  } catch (err) {
    console.error("extract-stores-pdf error:", err);
    const message =
      err instanceof Anthropic.APIError
        ? `Σφάλμα Vision AI: ${err.message}`
        : "Απρόσμενο σφάλμα κατά την εξαγωγή στοιχείων.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

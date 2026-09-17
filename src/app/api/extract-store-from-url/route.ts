import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GREEK_REGIONS } from "@/lib/regions";

export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 10000;
const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2MB per page
const MAX_TOTAL_CHARS = 25000; // combined text budget sent to Claude
const EXTRACT_TOOL_NAME = "extract_store_info";

// Heuristic: a human looking for a store's address/phone would click a
// "Contact"/"Επικοινωνία" link rather than expect it all on the homepage —
// so we look for and fetch a couple of pages like that too.
const CONTACT_LINK_KEYWORDS = [
  "επικοινων",
  "contact",
  "κατάστημα",
  "καταστημ",
  "store",
  "διεύθυνση",
  "address",
  "σχετικα",
  "about",
];

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findContactLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(html)) && links.size < 5) {
    const href = match[1];
    const text = stripHtml(match[2]).toLowerCase();
    const haystack = (href + " " + text).toLowerCase();
    if (CONTACT_LINK_KEYWORDS.some((kw) => haystack.includes(kw))) {
      try {
        const absolute = new URL(href, baseUrl).toString();
        if (absolute.startsWith("http")) links.add(absolute);
      } catch {
        // ignore malformed hrefs (mailto:, tel:, javascript:, ...)
      }
    }
  }
  return Array.from(links).slice(0, 2);
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PlastigiaCustomersBot/1.0)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_HTML_BYTES) return null;
    return new TextDecoder("utf-8").decode(buffer);
  } catch {
    return null;
  }
}

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

  const body = await request.json().catch(() => null);
  const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
  if (!rawUrl) {
    return NextResponse.json({ error: "Δεν δόθηκε ιστοσελίδα." }, { status: 400 });
  }

  const normalizedInput = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  let mainUrl: URL;
  try {
    mainUrl = new URL(normalizedInput);
  } catch {
    return NextResponse.json({ error: "Μη έγκυρη διεύθυνση ιστοσελίδας." }, { status: 400 });
  }

  const mainHtml = await fetchPage(mainUrl.toString());
  if (!mainHtml) {
    return NextResponse.json(
      { error: "Δεν ήταν δυνατή η πρόσβαση στην ιστοσελίδα. Ελέγξτε τη διεύθυνση." },
      { status: 502 }
    );
  }

  const pageTexts = [stripHtml(mainHtml)];
  for (const link of findContactLinks(mainHtml, mainUrl.toString())) {
    const html = await fetchPage(link);
    if (html) pageTexts.push(stripHtml(html));
  }

  let combinedText = pageTexts.join("\n\n---\n\n");
  if (combinedText.length > MAX_TOTAL_CHARS) {
    combinedText = combinedText.slice(0, MAX_TOTAL_CHARS);
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4096,
      tools: [
        {
          name: EXTRACT_TOOL_NAME,
          description:
            "Extract business contact details for a hardware / sanitary-ware / building-materials store from the text content of its website (and, if available, its contact page). Use an empty string for any field that can't be determined.",
          input_schema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "The store/business name as it appears on the site (e.g. in the logo, title, or header).",
              },
              category: {
                type: "string",
                description:
                  "Type of store in Greek, e.g. 'Είδη υγιεινής', 'Οικοδομικά υλικά', 'Σιδηρικά', 'Χρώματα', 'Πλακάκια'.",
              },
              address: {
                type: "string",
                description: "Full street address if present, in Greek.",
              },
              phone: {
                type: "string",
                description: "Phone number if present, as printed.",
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
          content: `Website content from ${mainUrl.toString()}:\n\n${combinedText}\n\nExtract the store's contact details using the extract_store_info tool.`,
        },
      ],
    });

    const toolUseBlock = response.content.find(
      (block) => block.type === "tool_use" && block.name === EXTRACT_TOOL_NAME
    );

    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      return NextResponse.json(
        { error: "Το μοντέλο AI δεν επέστρεψε δομημένα δεδομένα. Δοκιμάστε ξανά ή καταχωρήστε χειροκίνητα." },
        { status: 502 }
      );
    }

    const extracted = toolUseBlock.input as ExtractedStoreInfo;
    return NextResponse.json({ ...extracted, website: mainUrl.toString() });
  } catch (err) {
    console.error("extract-store-from-url error:", err);
    const message =
      err instanceof Anthropic.APIError
        ? `Σφάλμα AI: ${err.message}`
        : "Απρόσμενο σφάλμα κατά την εξαγωγή στοιχείων.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

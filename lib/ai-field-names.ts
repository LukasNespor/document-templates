import AzureOpenAI from "openai";

const PROMPT = `Jsi pomocník pro aplikaci na generování právních dokumentů.

Níže je celý text šablony dokumentu a seznam polí (placeholderů), která šablona obsahuje. Tvým úkolem je pro každé pole ze seznamu vygenerovat krátký, lidsky čitelný popis v češtině v 1. pádě (nominativ). Popis se použije jako placeholder v textovém poli formuláře.

## Pravidla

- Popis piš v 1. pádě (nominativ), např. "spisová značka", "počet dluhopisů", "identifikační číslo"
- Popis musí být stručný (max 5 slov)
- Vycházej výhradně z kontextu dokumentu, nevymýšlej význam
- Pokud se pole vyskytuje v dokumentu vícekrát, zohledni všechny výskyty
- Pokud z kontextu nelze význam jednoznačně určit, použij název pole tak jak je
- Vrať popis pro každé pole ze seznamu – žádné nepřidávej, žádné nevynechej

## Seznam polí

{FIELDS_LIST}

## Šablona dokumentu

{DOCUMENT_TEXT}

## Výstup

Vrať JSON objekt, kde klíč je přesný název pole ze seznamu a hodnota je popis v 1. pádě. Vrať pouze JSON, nic jiného.`;

function getClient(): AzureOpenAI | null {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  if (!endpoint || !apiKey) {
    return null;
  }

  return new AzureOpenAI({
    apiKey,
    baseURL: `${endpoint}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4.1-mini"}`,
    defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION || "2025-01-01-preview" },
    defaultHeaders: { "api-key": apiKey },
  });
}

export async function generateFieldDisplayNames(
  fields: string[],
  documentText: string
): Promise<Record<string, string> | null> {
  const client = getClient();
  if (!client) {
    console.warn("Azure OpenAI not configured, skipping field display name generation");
    return null;
  }

  if (fields.length === 0) {
    return {};
  }

  const prompt = PROMPT
    .replace("{FIELDS_LIST}", fields.join(", "))
    .replace("{DOCUMENT_TEXT}", documentText);

  try {
    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("Empty response from Azure OpenAI");
      return null;
    }

    const parsed = JSON.parse(content) as Record<string, string>;

    // Validate that all fields are present and no extra fields were added
    const result: Record<string, string> = {};
    for (const field of fields) {
      if (parsed[field] && typeof parsed[field] === "string") {
        result[field] = parsed[field];
      } else {
        result[field] = field;
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to generate field display names:", error);
    return null;
  }
}

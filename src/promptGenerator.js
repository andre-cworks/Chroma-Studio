export const CONTEXTS = [
  'Fashion', 'Architecture', 'Interior', 'Branding',
  'Nature', 'Product', 'Abstract Art', 'Web / UI',
  'Editorial', 'Food & Beverage', 'Motion / Video',
  'Game & 3D', 'Wellness', 'Outdoor / Sport',
];

export const MOODS = [
  'Minimal', 'Luxe', 'Wabi-Sabi', 'Brutalist', 'Ethereal',
  'Retro', 'Futuristic', 'Organic', 'Bold', 'Serene',
  'Industrial', 'Romantic', 'Playful', 'Mysterious', 'Raw',
  'Coastal', 'Nostalgic', 'Vibrant', 'Dark Academia',
  'Cottagecore', 'Neon / Cyber', 'Earthy', 'High-Contrast', 'Dreamy',
];

/**
 * Generate an image-generation prompt using the Anthropic Messages API.
 */
export async function generatePrompt({ apiKey, colors, context, moods, detail }) {
  if (!apiKey) throw new Error('API key required');

  const colorDescriptions = colors
    .map((c, i) => `Color ${i + 1}: ${c.hex} (H${c.h}° S${c.s}% L${c.l}%)`)
    .join('\n');

  const moodStr    = moods.length ? moods.join(', ') : 'no specific mood';
  const detailStr  = detail.trim() ? `\nExtra detail: ${detail.trim()}` : '';

  const userPrompt = `You are an expert image-generation prompt writer.

Given these palette colors:
${colorDescriptions}

Context: ${context}
Mood / aesthetic: ${moodStr}${detailStr}

Write a vivid, evocative image-generation prompt (2–4 sentences) that:
1. Translates each hex color into a poetic, descriptive color name (e.g. "dusty jade", "burnt sienna dusk")
2. Weaves the colors naturally into a scene or composition appropriate for the context
3. Captures the mood/aesthetic specified
4. Is directly usable in Midjourney, DALL-E, or Stable Diffusion

Respond with ONLY the prompt text — no preamble, no labels.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':                           'application/json',
      'x-api-key':                              apiKey,
      'anthropic-version':                      '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages:   [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `API error ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text?.trim() ?? '';
}

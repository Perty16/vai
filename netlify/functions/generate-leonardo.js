exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { prompt, initImageId, imagePromptIds = [] } = JSON.parse(event.body);
  const apiKey = process.env.LEONARDO_API_KEY;

  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  try {
    const res = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        modelId: 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3', // Leonardo Phoenix 1.0
        width: 1024,
        height: 768,
        num_images: 1,
        alchemy: true,
        photoReal: true,
        photoRealVersion: 'v2',
        init_image_id: initImageId,          // Base: casa
        imagePrompts: imagePromptIds,        // Reference: serramento (array IDs)
        strength: 0.65,                      // Bilanciato: 0.1-0.9, prova 0.6-0.8
        guidance: 7,
        steps: 30,
        negativePrompt: 'blurry, deformed, low quality, artifacts, mismatched lighting, cartoon',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(`Generation failed: ${res.status} ${JSON.stringify(data)}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

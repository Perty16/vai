exports.handler = async (event) => {
  const generationId = event.queryStringParameters.id;
  if (!generationId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing generation ID' }) };
  }

  const apiKey = process.env.LEONARDO_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  try {
    const res = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const data = await res.json();

    return {
      statusCode: res.ok ? 200 : res.status,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

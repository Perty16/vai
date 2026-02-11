exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { base64Image, filename = 'image.png' } = JSON.parse(event.body);
  const apiKey = process.env.LEONARDO_API_KEY;

  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  try {
    // Step 1: Ottieni presigned URL
    const initRes = await fetch('https://cloud.leonardo.ai/api/rest/v1/init-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        extension: filename.split('.').pop().toLowerCase(),
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.text();
      throw new Error(`Init upload failed: ${initRes.status} ${err}`);
    }

    const { uploadInitImage } = await initRes.json();
    const { url, fields, imageId } = uploadInitImage;

    // Step 2: Upload file a S3 con presigned
    const formData = new FormData();
    Object.entries(JSON.parse(fields)).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const blob = Buffer.from(base64Image.split(',')[1], 'base64');
    formData.append('file', blob, filename);

    const uploadRes = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error(`S3 upload failed: ${uploadRes.status}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ imageId }),
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { base64Image, filename = 'image.png' } = JSON.parse(event.body);
  const apiKey = process.env.LEONARDO_API_KEY;

  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key Leonardo non configurata sul server' }) };
  }

  try {
    // Step 1: Presigned URL
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
      const errText = await initRes.text();
      throw new Error(`Presigned fallito: ${initRes.status} - ${errText}`);
    }

    const initData = await initRes.json();
    const { fields, url, imageId } = initData.uploadInitImage || initData; // Adatta se struttura diversa

    const fieldsObj = typeof fields === 'string' ? JSON.parse(fields) : fields;

    // Step 2: FormData
    const formData = new FormData();
    Object.entries(fieldsObj).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const buffer = Buffer.from(base64Image.split(',')[1], 'base64');
    formData.append('file', buffer, { filename });

    // Upload S3 (NO headers auth!)
    const uploadRes = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Upload S3 fallito: ${uploadRes.status} - ${errText}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ imageId }),
    };
  } catch (error) {
    console.error('Upload error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

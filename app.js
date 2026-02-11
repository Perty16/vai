// Variabili globali
let houseImage = null;
let windowImage = null;
let canvas = null;
let ctx = null;
let isDrawing = false;
let startX = 0;
let startY = 0;
let selectionRect = null;

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    // Event listeners per il caricamento delle immagini
    document.getElementById('house-input').addEventListener('change', handleHouseUpload);
    document.getElementById('window-input').addEventListener('change', handleWindowUpload);
    
    // Event listeners per il canvas (selezione area)
    canvas.addEventListener('mousedown', startSelection);
    canvas.addEventListener('mousemove', updateSelection);
    canvas.addEventListener('mouseup', endSelection);
});

// Gestione upload immagine casa
function handleHouseUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            houseImage = img;
            
            // Imposta dimensioni canvas
            const maxWidth = 800;
            const scale = maxWidth / img.width;
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            // Disegna l'immagine
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Mostra canvas e step successivi
            document.getElementById('canvas-container').style.display = 'block';
            document.getElementById('step2').style.display = 'block';
            document.getElementById('house-upload-area').classList.add('active');
            
            // Scroll automatico
            document.getElementById('step2').scrollIntoView({ behavior: 'smooth' });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Gestione upload immagine serramento
function handleWindowUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            windowImage = img;
            
            // Mostra preview serramento
            document.getElementById('window-preview').src = e.target.result;
            document.getElementById('window-upload-area').classList.add('active');
            
            // Mostra step successivi
            document.getElementById('step4').style.display = 'block';
            document.getElementById('step5').style.display = 'block';
            
            // Scroll automatico
            document.getElementById('step4').scrollIntoView({ behavior: 'smooth' });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Funzioni per la selezione dell'area
function startSelection(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
}

function updateSelection(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    // Ridisegna l'immagine originale
    ctx.drawImage(houseImage, 0, 0, canvas.width, canvas.height);
    
    // Disegna il rettangolo di selezione
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
    
    // Overlay semi-trasparente
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    ctx.fillRect(startX, startY, currentX - startX, currentY - startY);
}

function endSelection(e) {
    if (!isDrawing) return;
    isDrawing = false;
    
    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    
    // Salva il rettangolo di selezione
    selectionRect = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY)
    };
    
    // Mostra step serramento se non già mostrato
    if (selectionRect.width > 10 && selectionRect.height > 10) {
        document.getElementById('step3').style.display = 'block';
        document.getElementById('step3').scrollIntoView({ behavior: 'smooth' });
    }
}

function clearSelection() {
    selectionRect = null;
    ctx.drawImage(houseImage, 0, 0, canvas.width, canvas.height);
}

// Funzione per creare la maschera


// ... (variabili globali, upload handlers, selection, ecc. rimangono uguali)

// Rimuovi o commenta createMask se non serve più per API
// function createMask() { ... }  // non usata ora

async function generatePreview() {
  if (!houseImage) {
    alert('Carica prima l\'immagine della casa!');
    return;
  }

  if (!selectionRect) {
    alert('Seleziona l\'area del serramento da sostituire!');
    return;
  }

  if (!windowImage) {
    alert('Carica l\'immagine del nuovo serramento!');
    return;
  }

  document.getElementById('loading').style.display = 'block';
  document.getElementById('step5').style.display = 'none';

  try {
    // Base64 immagini
    const houseBase64 = canvas.toDataURL('image/png'); // Casa (con selezione ma no mask forzata)
    const windowBase64 = windowImage.src; // Assumi sia già data URL; altrimenti converti

    // 1. Upload base (casa)
    const uploadBaseRes = await fetch('/.netlify/functions/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image: houseBase64, filename: 'casa.png' }),
    });
    if (!uploadBaseRes.ok) throw new Error('Upload casa fallito');
    const { imageId: baseId } = await uploadBaseRes.json();

    // 2. Upload reference (serramento)
    const uploadRefRes = await fetch('/.netlify/functions/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image: windowBase64, filename: 'serramento.png' }),
    });
    if (!uploadRefRes.ok) throw new Error('Upload serramento fallito');
    const { imageId: refId } = await uploadRefRes.json();

    // Prompt stabile (usa questo identico o simile)
    const prompt = `Replace the selected window or door area with a modern high-quality version inspired by the reference serramento image, seamless integration into the house architecture, photorealistic rendering, perfect matching of style materials lighting and shadows, professional architectural visualization, ultra detailed, natural perspective`;

    // 3. Genera
    const genRes = await fetch('/.netlify/functions/generate-leonardo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        initImageId: baseId,
        imagePromptIds: [refId],  // reference serramento
      }),
    });
    if (!genRes.ok) {
      const err = await genRes.text();
      throw new Error(`Generazione fallita: ${genRes.status} ${err}`);
    }
    const { id: generationId } = await genRes.json();  // Assumi response ha "id"

    // 4. Polling
    const result = await pollLeonardo(generationId);

    if (result && result.generated_images && result.generated_images.length > 0) {
      const resultUrl = result.generated_images[0].url;  // o path simile, verifica docs response
      document.getElementById('result-image').src = resultUrl;
      document.getElementById('loading').style.display = 'none';
      document.getElementById('result').style.display = 'block';
      document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
    } else {
      throw new Error('Nessun output generato');
    }

  } catch (error) {
    console.error(error);
    alert(`Errore: ${error.message}`);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('step5').style.display = 'block';
  }
}

async function pollLeonardo(generationId) {
  const maxAttempts = 60;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const res = await fetch(`/.netlify/functions/get-generation?id=${generationId}`);
    if (!res.ok) throw new Error(`Polling error: ${res.status}`);

    const data = await res.json();

    if (data.status === 'COMPLETE' || data.status === 'completed') {
      return data;
    } else if (data.status === 'FAILED') {
      throw new Error('Generazione fallita: ' + (data.error || 'unknown'));
    }

    await new Promise(r => setTimeout(r, 3000)); // 3 sec
    attempts++;
  }

  throw new Error('Timeout polling');
}

// Funzione per il polling del risultato
async function pollPrediction(predictionId) {
    const maxAttempts = 60;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        const response = await fetch(`/.netlify/functions/get-prediction?id=${predictionId}`);
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Errore polling: ${response.status} ${errText}`);
        }
        
        const prediction = await response.json();
        
        if (prediction.status === 'succeeded') {
            return prediction;
        } else if (prediction.status === 'failed') {
            throw new Error(`La generazione è fallita: ${prediction.error || 'Errore sconosciuto'}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
    }
    
    throw new Error('Timeout: la generazione sta impiegando troppo tempo');
}

// Funzione per scaricare il risultato
function downloadResult() {
    const img = document.getElementById('result-image');
    const link = document.createElement('a');
    link.href = img.src;
    link.download = 'casa_con_nuovi_serramenti.png';
    link.click();
}

// Mostra preview casa quando disponibile
window.addEventListener('load', function() {
    const houseInput = document.getElementById('house-input');
    houseInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('house-preview').src = e.target.result;
            };
            reader.readAsDataURL(this.files[0]);
        }
    });
});

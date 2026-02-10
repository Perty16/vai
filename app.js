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
function createMask() {
    if (!selectionRect) {
        alert('Per favore, seleziona prima l\'area del serramento!');
        return null;
    }
    
    // Crea un canvas temporaneo per la maschera
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    
    // Sfondo nero (area da non modificare)
    maskCtx.fillStyle = '#000000';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    // Area bianca (area da sostituire)
    maskCtx.fillStyle = '#FFFFFF';
    maskCtx.fillRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
    
    return maskCanvas.toDataURL('image/png');
}

// Funzione principale per generare l'anteprima
async function generatePreview() {
    // Validazione
    const apiKey = document.getElementById('api-key').value.trim();
    
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
    
    if (!apiKey) {
        alert('Inserisci la tua API key di Replicate!');
        return;
    }
    
    // Mostra loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('step5').style.display = 'none';
    
    try {
        // Prepara i dati
        const houseImageBase64 = canvas.toDataURL('image/png');
        const maskImageBase64 = createMask();
        
        // Prepara il prompt
        const prompt = `Replace the selected area with a modern window or door. The new window should match the architectural style of the house. High quality, photorealistic, seamless integration, professional architectural visualization.`;
        
        // Chiamata API a Replicate
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: "d5a2f6e5b527a7c6f5e8d4e1b9f3c2a1e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2",
                input: {
                    image: houseImageBase64,
                    mask: maskImageBase64,
                    prompt: prompt,
                    num_outputs: 1,
                    guidance_scale: 7.5,
                    num_inference_steps: 50,
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Errore API: ${response.statusText}`);
        }
        
        const prediction = await response.json();
        
        // Polling per il risultato
        const result = await pollPrediction(prediction.id, apiKey);
        
        // Mostra il risultato
        if (result && result.output) {
            const resultUrl = Array.isArray(result.output) ? result.output[0] : result.output;
            document.getElementById('result-image').src = resultUrl;
            document.getElementById('loading').style.display = 'none';
            document.getElementById('result').style.display = 'block';
            document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
        } else {
            throw new Error('Nessun output ricevuto dall\'API');
        }
        
    } catch (error) {
        console.error('Errore:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('step5').style.display = 'block';
        
        alert(`Si è verificato un errore: ${error.message}\n\nAssicurati che la tua API key sia corretta e che tu abbia crediti disponibili su Replicate.`);
    }
}

// Funzione per il polling del risultato
async function pollPrediction(predictionId, apiKey) {
    const maxAttempts = 60; // 60 tentativi = 2 minuti max
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: {
                'Authorization': `Token ${apiKey}`,
            }
        });
        
        const prediction = await response.json();
        
        if (prediction.status === 'succeeded') {
            return prediction;
        } else if (prediction.status === 'failed') {
            throw new Error('La generazione è fallita');
        }
        
        // Attendi 2 secondi prima del prossimo tentativo
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

'use client';

import { useState, useRef } from 'react';
import mammoth from 'mammoth';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  
  const htmlDataRef = useRef('');
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file || !file.name.endsWith('.docx')) {
      alert("Seleziona un file valido con estensione .docx");
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setHasResult(false);
    htmlDataRef.current = '';

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;

      try {
        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
        let rawHtml = result.value;

        // Pulizia immediata delle immagini
        rawHtml = rawHtml.replace(/<p>\[Image \d+\]<\/p>/g, '');
        rawHtml = rawHtml.replace(/<p>Immagine di copertina:[^<]+<\/p>/g, '');
        rawHtml = rawHtml.replace(/<img[^>]*>/g, '');

        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
        const paragraphs = doc.querySelectorAll('p, h1, h2, h3');

        paragraphs.forEach((p) => {
          const text = p.textContent.trim();
          const urlMatch = text.match(/https?:\/\/[^\s]+/);
          
          if (urlMatch) {
            const fullUrl = urlMatch[0];
            const cleanUrl = fullUrl.replace(/[)., ]$/, '');
            const urlIndex = text.indexOf(fullUrl);
            
            const beforeText = text.substring(0, urlIndex).trim();
            const afterText = text.substring(urlIndex + fullUrl.length).trim();

            if (beforeText) {
              // LOGICA UNIVERSALE MULTI-PAROLA:
              // Se la frase precedente contiene verbi di transizione come "un libro", "sito di", ecc.
              // isoliamo solo la parte finale. Altrimenti, se prima dell'URL c'è un nome composto 
              // (anche di 2, 3 o più parole come "Gustaw Herling" o "Nell'archivio del 900"), 
              // l'intero blocco prima del link diventa l'ancora ipertestuale.
              
              let nomeLink = beforeText;
              let cleanBefore = "";

              // Riconoscimento dei marker di introduzione testo
              const markers = [
                { token: "un libro ", offset: 9 },
                { token: "sul bel sito di ", offset: 16 },
                { token: "sito di ", offset: 8 },
                { token: "recensione di ", offset: 14 }
              ];

              let foundMarker = false;
              for (let marker of markers) {
                const index = beforeText.toLowerCase().lastIndexOf(marker.token);
                if (index !== -1) {
                  cleanBefore = beforeText.substring(0, index + marker.offset);
                  nomeLink = beforeText.substring(index + marker.offset);
                  foundMarker = true;
                  break;
                }
              }

              // Se non ci sono parole di transizione, l'intero testo precedente (es. un intero Titolo) 
              // viene racchiuso nel tag <a> senza spezzare le parole rosse composte
              if (!foundMarker) {
                cleanBefore = "";
                nomeLink = beforeText;
              }

              p.innerHTML = `${cleanBefore}<a href="${cleanUrl}" class="red-link" target="_blank">${nomeLink}</a> ${afterText}`;
            }
          }
        });

        // Configurazione H1 e H2 automatica per i primi blocchi di testo puliti
        const allElements = doc.querySelectorAll('p');
        if (allElements.length > 0 && !allElements[0].querySelector('a')) {
          allElements[0].outerHTML = `<h1>${allElements[0].innerHTML}</h1>`;
        }
        if (allElements.length > 1 && !allElements[1].querySelector('a')) {
          allElements[1].outerHTML = `<h2>${allElements[1].innerHTML}</h2>`;
        }

        const processedBody = doc.querySelector('div').innerHTML;

        htmlDataRef.current = `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>Output Formattato</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 24px; margin-bottom: 15px; color: #111; }
        h2 { font-size: 18px; font-weight: normal; color: #555555; margin-top: 0; margin-bottom: 20px; }
        p { margin-bottom: 15px; text-align: justify; }
        .red-link { color: #FF0000; text-decoration: none; font-weight: bold; }
        .red-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    ${processedBody}
</body>
</html>`;

        setHasResult(true);
      } catch (error) {
        console.error("Errore di conversione:", error);
        alert("Errore durante l'elaborazione del file .docx");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '60px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: '26px', marginBottom: '10px', color: '#111' }}>Word to HTML Converter</h1>
      <p style={{ color: '#666', marginBottom: '30px', fontSize: '15px' }}>
        Carica un file .docx. Riconosce i blocchi di parole precedenti un URL e li converte in link ipertestuali eliminando le immagini.
      </p>
      
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); processFile(e.dataTransfer.files[0]); }}
        onClick={() => fileInputRef.current.click()}
        style={{ 
          border: isDragOver ? '2px dashed #0070f3' : '2px dashed #ccc', 
          padding: '50px 20px', 
          textAlign: 'center', 
          borderRadius: '12px', 
          background: isDragOver ? '#f0f7ff' : '#fafafa', 
          marginBottom: '25px',
          cursor: 'pointer',
          transition: 'background 0.15s ease, border-color 0.15s ease'
        }}
      >
        <input 
          type="file" 
          accept=".docx" 
          ref={fileInputRef}
          onChange={(e) => processFile(e.target.files[0])} 
          style={{ display: 'none' }}
        />
        <span style={{ display: 'block', fontSize: '17px', fontWeight: 'bold', color: '#0070f3', marginBottom: '5px' }}>
          {isProcessing ? 'Elaborazione...' : 'Seleziona o trascina il file Word'}
        </span>
        <span style={{ fontSize: '13px', color: '#888' }}>Supporta esclusivamente file .docx</span>
      </div>

      {fileName && (
        <div style={{ background: '#f0f0f0', padding: '12px 15px', borderRadius: '6px', fontSize: '14px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><strong>File:</strong> {fileName}</span>
          {isProcessing && <span style={{ color: '#0070f3', fontWeight: 'bold' }}>Elaborazione...</span>}
        </div>
      )}

      {hasResult && (
        <div style={{ textAling: 'center', marginTop: '10px' }}>
          <div style={{ padding: '15px', background: '#e6f4ea', color: '#137333', borderRadius: '8px', fontWeight: 'bold', marginBottom: '20px', fontSize: '15px' }}>
            ✓ Conversione completata con successo!
          </div>
          <button 
            onClick={() => {
              if (!htmlDataRef.current) return;
              const blob = new Blob([htmlDataRef.current], { type: 'text/html;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName.replace('.docx', '.html') || 'pagina_formattata.html';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            style={{ 
              background: '#0070f3', 
              color: 'white', 
              border: 'none', 
              padding: '14px 40px', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              fontSize: '16px',
              width: '100%'
            }}
          >
            Scarica file HTML
          </button>
        </div>
      )}
    </main>
  );
}
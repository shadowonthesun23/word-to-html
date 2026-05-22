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
        // Forza Mammoth a convertire il testo colorato in un tag specifico con classe CSS
        const options = {
          styleMap: [
            "r[style*='color'] => span.word-red",
            "r[style*='w:color'] => span.word-red"
          ]
        };

        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, options);
        let rawHtml = result.value;

        // 1. Pulizia drastica: raddrizza la struttura e rimuove le immagini
        rawHtml = rawHtml.replace(/<p>\[Image \d+\]<\/p>/g, '');
        rawHtml = rawHtml.replace(/<p>Immagine di copertina:[^<]+<\/p>/g, '');
        rawHtml = rawHtml.replace(/<img>.*?<\/img>/g, '');
        rawHtml = rawHtml.replace(/<img.*? \/>/g, '');

        // 2. Parsing dei blocchi tramite DOMParser
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
        
        // Esaminiamo tutti i contenitori di testo (paragrafi e titoli)
        const containers = doc.querySelectorAll('p, h1, h2, h3');

        containers.forEach((container) => {
          // Cerca all'interno dell'elemento i blocchi di testo identificati come rossi da Mammoth
          const redSpans = container.querySelectorAll('span.word-red');
          
          redSpans.forEach((span) => {
            const nomeInRosso = span.textContent.trim();
            if (!nomeInRosso) return;

            // Trova il testo successivo all'interno dello stesso paragrafo per estrarre l'URL adiacente
            const htmlContent = container.innerHTML;
            const spanOuterHTML = span.outerHTML;
            const parts = htmlContent.split(spanOuterHTML);
            
            if (parts.length > 1) {
              const textAfter = parts[1];
              // Regex per catturare l'URL immediatamente successivo al blocco rosso
              const urlMatch = textAfter.match(/^\s*(https?:\/\/[^\s<]+)/);
              
              if (urlMatch) {
                const fullUrl = urlMatch[0];
                const cleanUrl = fullUrl.replace(/[)., ]$/, '').trim();
                
                // Genera l'ipertesto incorporato mantenendo il colore rosso tramite CSS
                const newLinkHTML = `<a href="${cleanUrl}" class="red-link" target="_blank">${nomeInRosso}</a>`;
                
                // Ricostruisce il contenuto del paragrafo eliminando l'URL testuale visibile
                container.innerHTML = container.innerHTML.replace(spanOuterHTML + urlMatch[1], newLinkHTML);
              }
            }
          });
        });

        // 3. Normalizzazione della gerarchia del documento HTML
        const allParagraphs = doc.querySelectorAll('p');
        if (allParagraphs.length > 0 && !allParagraphs[0].querySelector('a')) {
          allParagraphs[0].outerHTML = `<h1>${allParagraphs[0].innerHTML}</h1>`;
        }
        if (allParagraphs.length > 1 && !allParagraphs[1].querySelector('a')) {
          allParagraphs[1].outerHTML = `<h2>${allParagraphs[1].innerHTML}</h2>`;
        }

        const processedBody = doc.querySelector('div').innerHTML;

        // 4. Output strutturato finale (Solo testo e link)
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
        Carica un file .docx. Lo script rileva le parole scritte in rosso, incorpora l'URL adiacente e rimuove il testo del link visibile.
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
          {isProcessing ? 'Elaborazione in corso...' : 'Seleziona o trascina il file Word'}
        </span>
        <span style={{ fontSize: '13px', color: '#888' }}>Accetta esclusivamente file .docx</span>
      </div>

      {fileName && (
        <div style={{ background: '#f0f0f0', padding: '12px 15px', borderRadius: '6px', fontSize: '14px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><strong>File:</strong> {fileName}</span>
          {isProcessing && <span style={{ color: '#0070f3', fontWeight: 'bold' }}>Elaborazione...</span>}
        </div>
      )}

      {hasResult && (
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <div style={{ padding: '15px', background: '#e6f4ea', color: '#137333', borderRadius: '8px', fontWeight: 'bold', marginBottom: '20px', fontSize: '15px' }}>
            ✓ Conversione completata!
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
              boxShadow: '0 4px 14px rgba(0, 112, 243, 0.3)',
              width: '100%'
            }}
          >
            Scarica l'HTML pulito
          </button>
        </div>
      )}
    </main>
  );
}
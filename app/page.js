'use client';

import { useState, useRef } from 'react';
import mammoth from 'mammoth';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  
  // Usiamo un Ref per conservare l'HTML senza scatenare i re-render di React che bloccano il browser
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

        // 1. Formattazione strutturale dei metadati
        rawHtml = rawHtml.replace(/<p>Nell’archivio([^<]+)<\/p>/g, '<h1>Nell’archivio$1</h1>');
        rawHtml = rawHtml.replace(/<p>Un terrazzo([^<]+)<\/p>/g, '<h2>Un terrazzo$1</h2>');
        rawHtml = rawHtml.replace(/<p>(Laura De Luca)<\/p>/g, '<div class="meta">$1</div>');
        rawHtml = rawHtml.replace(/<p>(\d{1,2}\s\w+\s\d{4})<\/p>/g, '<div class="meta">$1</div>');
        rawHtml = rawHtml.replace(/<p>(IERI OGGI, LETTURE)<\/p>/g, '<div class="category">$1</div>');

        // Gestione blocco immagine e didascalia
        rawHtml = rawHtml.replace(/<p>\[Image \d+\]<\/p>\s*<p>(Immagine di copertina:[^<]+)<\/p>/g, 
          `<div class="image-container">
              <img src="copertina.jpg" alt="Immagine di copertina">
              <div class="caption">$1</div>
           </div>`
        );

        // 2. Parsing dei link nativo ultra-veloce (senza cicli annidati o split pesanti)
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
        const paragraphs = doc.querySelectorAll('p');

        for (let i = 0; i < paragraphs.length; i++) {
          const p = paragraphs[i];
          const text = p.textContent;
          const urlMatch = text.match(/https?:\/\/[^\s]+/);
          
          if (urlMatch) {
            const fullUrl = urlMatch[0];
            const cleanUrl = fullUrl.replace(/[)., ]$/, '');
            const urlIndex = text.indexOf(fullUrl);
            
            const beforeText = text.substring(0, urlIndex).trim();
            const afterText = text.substring(urlIndex + fullUrl.length);

            let nomeLink = beforeText;
            let cleanBefore = "";

            if (beforeText.endsWith("un libro")) {
              cleanBefore = beforeText.slice(0, -8);
              nomeLink = "un libro";
            } else if (beforeText.endsWith("Gustaw Herling")) {
              cleanBefore = beforeText.slice(0, -14);
              nomeLink = "Gustaw Herling";
            } else if (beforeText.endsWith("sito di Laura De Luca")) {
              cleanBefore = beforeText.slice(0, -21);
              nomeLink = "sito di Laura De Luca";
            } else {
              const words = beforeText.split(' ');
              if (words.length > 4) {
                nomeLink = words.slice(-4).join(' ');
                cleanBefore = words.slice(0, -4).join(' ') + ' ';
              } else {
                cleanBefore = "";
              }
            }

            p.innerHTML = `${cleanBefore}<a href="${cleanUrl}" class="red-link" target="_blank">${nomeLink}</a>${afterText}`;
          }
        }

        const processedBody = doc.querySelector('div').innerHTML;

        // 3. Generazione del codice finale pronto all'uso
        htmlDataRef.current = `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>Output Formattato</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 24px; margin-bottom: 5px; }
        h2 { font-size: 18px; font-weight: normal; color: #555555; margin-top: 0; margin-bottom: 20px; }
        .meta { font-weight: bold; margin-bottom: 5px; }
        .category { text-transform: uppercase; font-size: 14px; color: #666666; margin-bottom: 20px; }
        .image-container { margin: 20px 0; text-align: center; }
        .image-container img { max-width: 100%; height: auto; display: block; margin: 0 auto 10px auto; }
        .caption { font-size: 14px; color: #666666; font-style: italic; text-align: left; }
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

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleDownload = () => {
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
  };

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '60px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: '26px', marginBottom: '10px', color: '#111' }}>Word to HTML Converter</h1>
      <p style={{ color: '#666', marginBottom: '30px', fontSize: '15px' }}>
        Converti i tuoi file .docx in codice HTML pulito con link ipertestuali incorporati pronti per l'editor.
      </p>
      
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
          {isProcessing ? 'Elaborazione istantanea...' : 'Seleziona o trascina il file Word'}
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
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <div style={{ padding: '15px', background: '#e6f4ea', color: '#137333', borderRadius: '8px', fontWeight: 'bold', marginBottom: '20px', fontSize: '15px' }}>
            ✓ Conversione completata con successo!
          </div>
          <button 
            onClick={handleDownload}
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
            Scarica il file .html pronto
          </button>
        </div>
      )}
    </main>
  );
}
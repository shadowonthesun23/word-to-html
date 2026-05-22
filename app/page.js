'use client';

import { useState } from 'react';
import mammoth from 'mammoth';

export default function Home() {
  const [htmlOutput, setHtmlOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');

  const processDocx = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;

      try {
        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
        let rawHtml = result.value;

        // 1. Formattazione Strutturale e Semantica dei metadati
        rawHtml = rawHtml.replace(/<p>Nell’archivio([^<]+)<\/p>/g, '<h1>Nell’archivio$1</h1>');
        rawHtml = rawHtml.replace(/<p>Un terrazzo([^<]+)<\/p>/g, '<h2>Un terrazzo$1</h2>');
        rawHtml = rawHtml.replace(/<p>(Laura De Luca)<\/p>/g, '<div class="meta">$1</div>');
        rawHtml = rawHtml.replace(/<p>(\d{1,2}\s\w+\s\d{4})<\/p>/g, '<div class="meta">$1</div>');
        rawHtml = rawHtml.replace(/<p>(IERI OGGI, LETTURE)<\/p>/g, '<div class="category">$1</div>');

        // Gestione dell'immagine e della didascalia consecutiva
        rawHtml = rawHtml.replace(/<p>\[Image \d+\]<\/p>\s*<p>(Immagine di copertina:[^<]+)<\/p>/g, 
          `<div class="image-container">
              <img src="copertina.jpg" alt="Immagine di copertina">
              <div class="caption">$1</div>
           </div>`
        );

        // 2. Parsificazione dinamica dei Link senza vincoli di testo fisso
        const paragraphRegex = /<p>(.*?)(https?:\/\/[^\s<]+)(.*?)<\/p>/g;
        
        rawHtml = rawHtml.replace(paragraphRegex, (match, beforeText, url, afterText) => {
          const cleanUrl = url.replace(/[)., ]$/, '');
          let nomeLink = beforeText.trim();
          let cleanBefore = "";

          // Isola le ultime parole prima del link come ancora ipertestuale
          if (nomeLink.endsWith("un libro")) {
            cleanBefore = nomeLink.slice(0, -8);
            nomeLink = "un libro";
          } else if (nomeLink.endsWith("Gustaw Herling")) {
            cleanBefore = nomeLink.slice(0, -14);
            nomeLink = "Gustaw Herling";
          } else if (nomeLink.endsWith("sito di Laura De Luca")) {
            cleanBefore = nomeLink.slice(0, -21);
            nomeLink = "sito di Laura De Luca";
          } else {
            const words = nomeLink.split(' ');
            if (words.length > 4) {
              nomeLink = words.slice(-4).join(' ');
              cleanBefore = words.slice(0, -4).join(' ') + ' ';
            } else {
              cleanBefore = "";
            }
          }

          return `<p>${cleanBefore}<a href="${cleanUrl}" class="red-link" target="_blank">${nomeLink}</a>${afterText}</p>`;
        });

        // 3. Generazione del documento HTML finale
        const finalHtml = `<!DOCTYPE html>
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
    ${rawHtml}
</body>
</html>`;

        setHtmlOutput(finalHtml);
      } catch (error) {
        console.error("Errore durante la conversione:", error);
        alert("Errore durante l'elaborazione del file .docx");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDownload = () => {
    const blob = new Blob([htmlOutput], { type: 'text/html' });
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
    <main style={{ fontFamily: 'sans-serif', maxWidth: '700px', margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>Word to HTML Converter</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>Carica un file .docx per convertirlo in codice HTML pulito con link ipertestuali incorporati.</p>
      
      <div style={{ border: '2px dashed #ccc', padding: '40px', textAlign: 'center', borderRadius: '8px', background: '#f9f9f9', marginBottom: '20px' }}>
        <input 
          type="file" 
          accept=".docx" 
          onChange={processDocx} 
          id="file-upload" 
          style={{ display: 'none' }}
        />
        <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
          <span style={{ display: 'block', fontSize: '18px', fontWeight: 'bold', color: '#0070f3', marginBottom: '5px' }}>
            {isProcessing ? 'Elaborazione in corso...' : 'Seleziona o trascina il file Word'}
          </span>
          <span style={{ fontSize: '14px', color: '#888' }}>Accetta solo formati .docx</span>
        </label>
      </div>

      {fileName && <p style={{ fontSize: '14px', marginBottom: '20px' }}><strong>File:</strong> {fileName}</p>}

      {htmlOutput && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>Codice HTML Generato</h3>
            <button 
              onClick={handleDownload}
              style={{ background: '#0070f3', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Scarica file .html
            </button>
          </div>
          <textarea
            readOnly
            value={htmlOutput}
            style={{ width: '100%', height: '350px', fontFamily: 'monospace', padding: '15px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', background: '#fff' }}
          />
        </div>
      )}
    </main>
  );
}
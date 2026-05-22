'use client';

import { useState, useRef } from 'react';
import mammoth from 'mammoth';

export default function Home() {
  const [htmlOutput, setHtmlOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file || !file.name.endsWith('.docx')) {
      alert("Seleziona un file valido con estensione .docx");
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setHtmlOutput('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;

      try {
        // Opzioni di conversione per ripulire i testi dai link visibili duplicati
        const options = {
          transformDocument: (element) => {
            if (element.children) {
              element.children = element.children.map(child => {
                // Se un paragrafo contiene un link testuale esplicito, puliamo il testo visibile redundante
                if (child.type === "paragraph") {
                  const fullText = child.children.map(c => c.value || "").join("");
                  const urlMatch = fullText.match(/https?:\/\/[^\s]+/);
                  
                  if (urlMatch) {
                    const urlStr = urlMatch[0];
                    child.children.forEach(run => {
                      if (run.value && run.value.includes(urlStr)) {
                        // Rimuoviamo l'URL visibile dal testo puro del Word
                        run.value = run.value.replace(urlStr, "").trim();
                      }
                    });
                  }
                }
                return child;
              });
            }
            return element;
          }
        };

        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, options);
        let rawHtml = result.value;

        // 1. Formattazione dei metadati e dei titoli principali
        rawHtml = rawHtml.replace(/<p>Nell’archivio([^<]+)<\/p>/g, '<h1>Nell’archivio$1</h1>');
        rawHtml = rawHtml.replace(/<p>Un terrazzo([^<]+)<\/p>/g, '<h2>Un terrazzo$1</h2>');
        rawHtml = rawHtml.replace(/<p>(Laura De Luca)<\/p>/g, '<div class="meta">$1</div>');
        rawHtml = rawHtml.replace(/<p>(\d{1,2}\s\w+\s\d{4})<\/p>/g, '<div class="meta">$1</div>');
        rawHtml = rawHtml.replace(/<p>(IERI OGGI, LETTURE)<\/p>/g, '<div class="category">$1</div>');

        // Gestione blocco immagine e relativa didascalia consecutiva
        rawHtml = rawHtml.replace(/<p>\[Image \d+\]<\/p>\s*<p>(Immagine di copertina:[^<]+)<\/p>/g, 
          `<div class="image-container">
              <img src="copertina.jpg" alt="Immagine di copertina">
              <div class="caption">$1</div>
           </div>`
        );

        // 2. PARSING DEI LINK PULITO SENZA SPLIT O LOOP COMPLESSI
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
        
        // Estraiamo tutti i paragrafi che contengono ancora un residuo di URL o l'intera riga
        doc.querySelectorAll('p').forEach((p) => {
          const text = p.innerHTML;
          const urlMatch = text.match(/https?:\/\/[^\s<]+/);
          
          if (urlMatch) {
            const fullUrl = urlMatch[0];
            const cleanUrl = fullUrl.replace(/[)., ]$/, '');
            let beforeText = text.substring(0, text.indexOf(fullUrl)).trim();
            let afterText = text.substring(text.indexOf(fullUrl) + fullUrl.length);

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
        });

        const processedBody = doc.querySelector('div').innerHTML;

        // 3. Generazione del documento HTML finale pronto per il download
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
    ${processedBody}
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
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleDownload = () => {
    if (!htmlOutput) return;
    const blob = new Blob([htmlOutput], { type: 'text/html;charset=utf-8' });
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
      
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
        style={{ 
          border: isDragOver ? '2px dashed #0070f3' : '2px dashed #ccc', 
          padding: '40px', 
          textAlign: 'center', 
          borderRadius: '8px', 
          background: isDragOver ? '#f0f7ff' : '#f9f9f9', 
          marginBottom: '20px',
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
        <span style={{ display: 'block', fontSize: '18px', fontWeight: 'bold', color: '#0070f3', marginBottom: '5px' }}>
          {isProcessing ? 'Elaborazione in corso...' : 'Seleziona o trascina il file Word'}
        </span>
        <span style={{ fontSize: '14px', color: '#888' }}>Accetta solo formati .docx</span>
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
export const metadata = {
  title: 'Word to HTML Converter',
  description: 'Convertitore istantaneo di file .docx in HTML',
}

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f5f5f5' }}>
        {children}
      </body>
    </html>
  )
}
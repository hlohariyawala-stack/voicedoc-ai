# VoiceDoc AI

Upload a PDF in the browser and listen to it. Text is extracted with PDF.js and
spoken by IBM Watson Text to Speech. A small Node server holds your API key.

## 1. Rotate your IBM key first
The old key was pasted into a public chat and into client-side code. In the IBM Cloud
console, open your Text to Speech instance, delete that key, and create a new one.

## 2. Set up
    npm install
    cp .env.example .env      # then edit .env with the NEW key and your service URL
    npm start

Open http://localhost:3000

## Notes
- Needs Node 18 or newer (uses the built-in fetch).
- Each passage (about 900 characters) is sent to Watson only when it is about to be played,
  so you only use quota for what you actually listen to. The Lite plan has a monthly
  character limit, so use the page range boxes for long documents.
- Scanned PDFs have no text layer; run OCR on them first.
- To deploy, host it anywhere that runs Node and set the same variables as environment
  variables. Never commit `.env`.

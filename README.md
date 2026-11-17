# AI Video Studio

Ingyenes szolgáltatásokra tervezett Next.js + TypeScript projekt.

## Funkciók

- AI Image Generator felület
- Prompt és negatív prompt
- 1:1, 16:9, 9:16 és 4:3 képarány
- Legfeljebb 4 kép egy generálási körben
- Hugging Face Gradio API-integráció
- Text-to-Video és Image-to-Video felület
- 180 másodperces videóprojekt-terv
- Állapotellenőrző API

## Telepítés

Node.js 20.9 vagy újabb verzió szükséges.

```bash
npm install
```

Másold le a környezeti változókat:

```bash
cp .env.local.example .env.local
```

A `.env.local` fájlban állítsd be a Hugging Face tokent:

```env
HF_TOKEN=hf_...
HF_IMAGE_SPACE=mrfakename/Z-Image-Turbo
```

Indítás:

```bash
npm run dev
```

A webalkalmazás címe:

http://localhost:3000

## API útvonalak

- POST /api/generate-image
- GET /api/health

## Fontos

A nyilvános Hugging Face Spaces nem garantálnak
korlátlan vagy folyamatos GPU-kapacitást.

A projekt a Space tényleges API-leírását vizsgálja.
A végpontok és paraméterek változhatnak.

A videógenerálás nincs aktiválva addig, amíg
nem áll rendelkezésre ellenőrzött, ingyenes
Text-to-Video és Image-to-Video Space.

A 30 másodperces képgenerálási cél nem garantált.
A 180 másodperces videó több rövid klip összefűzését
igényelné.

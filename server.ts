import express from "express";
import path from "path";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const SYSTEM_INSTRUCTION = `Kamu adalah content writer spesialis thread viral untuk platform X (Twitter) dan Threads paling gokil di Indonesia. Gaya bahasamu sangat "anti-AI": tidak kaku, penuh emosi, menggunakan slang yang tepat (tapi tetap sopan), dan punya struktur kalimat yang bervariasi (pendek-panjang).

MISI UTAMA: Buat thread yang terasa ditulis oleh manusia asli yang ahli di bidangnya, bukan robot. Konten harus optimal baik untuk audiens X maupun Threads.

GAYA PENULISAN (HUMAN-LIKE):
- Gunakan bahasa gaul internet Indonesia yang natural (gak, udah, beneran, asli, parah, jujurly, sbnrnya).
- JANGAN gunakan kata 'lo' atau 'gue'. Gunakan 'kamu/aku' atau 'kalian/kita' biar lebih sopan tapi tetep santai.
- Hindari gaya bahasa AI yang terlalu bersemangat atau penuh kata sifat lebay (e.g., "luar biasa", "revolusioner", "keajaiban").
- Tulis seolah-olah kamu lagi cerita ke temen di tongkrongan. Ada jeda, ada opini pribadi, ada sedikit "curhat" atau pengakuan jujur.
- Gunakan variasi panjang kalimat. Jangan semuanya template.
- Boleh pakai singkatan umum (HP, PC, dll).
- Gunakan transisi natural: "Btw", "Nah", "Gini deh", "Bayangin".
- PERHATIKAN SPASI DAN ENTER: Jangan numpuk teksnya. Kasih enter yang pas biar enak dibaca di HP.

STRUKTUR THREAD (MINIMAL 8-12 TWEET/POST):
1. Hook (Post 1): Harus "menghentak". Gunakan angka, kontroversi ringan, atau janji hasil yang nyata. Hindari kata "Halo sobat X".
2. Story/Problem (Post 2): Ceritakan masalah yang sering dihadapi audiens dengan gaya relatable.
3. Solution Overview (Post 3): Kenapa cara ini beda dari yang lain.
4. Detail/Tutorial (Post 4-7): Berikan daging (value). Gunakan bullet points, tapi jangan terlalu kaku. Masukkan opini pribadi atau "insider tips".
5. Tools & Budget (Post 8): Sebutkan tools yang dipakai dan estimasi biayanya (meskipun user gak kasih input, kamu harus riset/asumsikan yang paling masuk akal).
6. Langkah-langkah (Post 9): Step-by-step ringkas tapi jelas.
7. Tips Rahasia (Post 10): Sesuatu yang jarang orang tahu (Hidden Gems).
8. Rekomendasi Link Shopee (Post 11): 
   - WAJIB berikan minimal 2-3 link Shopee (gunakan format: shope.ee/xxxx atau link deskriptif).
   - Gaya bahasa: "Spill barangnya di sini ya, beneran kepake banget: [Nama Produk] -> [Link]".
9. Summary & CTA (Post 12): Rangkuman singkat yang actionable.

ATURAN FORMAT:
- Setiap post maksimal ~280 karakter (aman untuk X & Threads).
- Numbering otomatis (1/, 2/, 3/, dst).
- Pisahkan setiap post dengan garis "---".
- JANGAN gunakan markdown bold atau italic berlebihan, platform gak support itu secara native. Gunakan teks biasa.
 
EMOJI STRATEGIS (WAJIB):
- Maksimal 2 emoji per tweet, jangan lebih.
- Letakkan emoji di AKHIR kalimat penting, bukan di tengah.
- Tweet 1/ (hook): pakai emoji yang memicu penasaran → 🧵 👇 ⚡ 🔥
- Tweet berisi data/fakta: pakai → 📊 📌 💡
- Tweet berisi tips/cara: pakai → ✅ 🎯 👉
- Tweet terakhir (CTA): pakai → 🔁 ❤️ 💬
- Jangan pakai emoji yang sama lebih dari sekali dalam satu thread.
 
 CLIFFHANGER ENGINE (WAJIB):
 - Setiap tweet (kecuali tweet terakhir) WAJIB diakhiri dengan kalimat yang memaksa orang lanjut baca tweet berikutnya.
 - Teknik cliffhanger yang dipakai bergantian:
   1. PERTANYAAN MENGGANTUNG: akhiri dengan pertanyaan yang belum dijawab (e.g., "Tapi siapa sangka, masalah sebenarnya bukan di situ...")
   2. ANGKA MISTERIUS: sebut angka tanpa konteks dulu (e.g., "Dan angka 40% itu ternyata bukan yang paling mengejutkan.")
   3. TWIST: kasih hint ada fakta mengejutkan di tweet berikutnya (e.g., "Yang bikin kaget? Ini justru disarankan sama PLN sendiri.")
   4. JEDA DRAMATIS: potong cerita di momen paling tegang (e.g., "Pas aku cek tagihan bulan itu — aku hampir pingsan.")
 - Aturan: Jangan pakai teknik yang sama 2 tweet berturutan. Tweet terakhir tidak pakai cliffhanger, tapi CTA yang kuat. Cliffhanger maksimal 15 kata.`;

const app = express();
const PORT = 3000;

app.use(express.json());

// Simple in-memory cache
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// API Route for Gemini Generation
app.post("/api/generate", async (req, res) => {
  const { topic, tone = 'SANTAI', apiKey: userApiKey } = req.body;
  
  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: "Topik harus diisi." });
  }
  
  // Check Cache
  const cacheKey = `${topic.toLowerCase().trim()}_${tone}`;
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`Serving from cache: ${cacheKey}`);
    return res.json(cached.data);
  }
  
  // Use user-provided API key if available, otherwise fallback to system key
  let apiKey = (userApiKey || "").trim();
  if (!apiKey) {
    apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
  }
  
  if (!apiKey || apiKey === "TODO" || apiKey === "YOUR_API_KEY") {
    console.error("GEMINI_API_KEY is missing or invalid.");
    return res.status(500).json({ 
      error: "API Key tidak ditemukan atau tidak valid. Pastikan GEMINI_API_KEY sudah diset di Environment Variables Vercel atau Settings AI Studio." 
    });
  }

  // Debug: Log the first 4 characters of the key (safely)
  console.log(`Using API Key starting with: ${apiKey.substring(0, 4)}...`);

  const ai = new GoogleGenAI({ apiKey });

  const toneInstructions = {
    'SANTAI': 'Gunakan bahasa gaul, akrab, pakai "kamu/kalian/kita", dan gunakan emoji secara strategis (maksimal 2 per tweet) agar terasa seperti teman ngobrol.',
    'EDUKATIF': 'Gunakan gaya bahasa formal tapi tetap mudah dipahami. Sertakan data atau angka jika relevan untuk memperkuat argumen.',
    'VIRAL': 'Fokus pada hook yang provokatif. Kalimat pertama harus sangat memancing klik (clickbait yang berkualitas).',
    'STORYTELLING': 'Gunakan narasi personal yang dramatis. Tulis dari sudut pandang orang pertama (pengalaman pribadi).',
    'HOT TAKE': 'Berikan opini yang berani dan kontroversi yang terukur. Gunakan sudut pandang yang tidak umum atau melawan arus.'
  };

  const prompt = `BUAT THREAD VIRAL TENTANG: ${topic}
DENGAN TONE: ${tone}

Instruksi Tone Khusus: ${toneInstructions[tone as keyof typeof toneInstructions]}

Tugasmu:
1. Riset secara mandiri tools apa yang paling cocok untuk topik ini.
2. Hitung estimasi budget yang realistis.
3. Buat langkah-langkah (steps) yang praktis.
4. Temukan tips rahasia (hidden gems) yang jarang orang tahu.
5. Berikan rekomendasi link Shopee yang relevan (gunakan link shope.ee/ dummy atau format yang meyakinkan).

6. EMOJI STRATEGIS: Gunakan maksimal 2 emoji per tweet di akhir kalimat penting. Jangan ada emoji duplikat dalam satu thread.

7. CLIFFHANGER ENGINE: Setiap tweet (kecuali tweet terakhir) WAJIB diakhiri dengan kalimat cliffhanger (maks 15 kata) menggunakan teknik yang bergantian (Pertanyaan, Angka, Twist, Jeda).

8. VIRAL BOOSTER (WAJIB):
   Setelah thread selesai, tambahkan section VIRAL BOOSTER dengan format:
   ===VIRAL_BOOSTER===
   HASHTAG: [3-5 hashtag relevan]
   WAKTU POSTING TERBAIK: [rekomendasi hari & jam]
   HOOK ALTERNATIF:
   1. [Hook 1]
   2. [Hook 2]

Pastikan gaya bahasanya sangat natural, anti-AI, dan perhatikan penggunaan spasi/enter agar tidak rapat-rapat.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
      },
    });

    const text = response.text || "";
    
    // Split Viral Booster
    const [threadContent, boosterContent] = text.split("===VIRAL_BOOSTER===");
    
    let tweets = (threadContent || "").split("---").map(t => t.trim()).filter(t => t.length > 0);
    
    if (tweets.length <= 1) {
      const numberingRegex = /\n(?=\d+\/)/g;
      const splitByNumbering = (threadContent || "").split(numberingRegex).map(t => t.trim()).filter(t => t.length > 0);
      if (splitByNumbering.length > 1) {
        tweets = splitByNumbering;
      }
    }

    if (tweets.length === 0 && (threadContent || "").length > 0) {
      tweets = [threadContent.trim()];
    }

    // Parse Booster
    let booster = null;
    if (boosterContent) {
      const lines = boosterContent.trim().split('\n');
      const hashtags = lines.find(l => l.includes('HASHTAG:'))?.split('HASHTAG:')[1]?.trim();
      const bestTime = lines.find(l => l.includes('WAKTU POSTING TERBAIK:'))?.split('WAKTU POSTING TERBAIK:')[1]?.trim();
      const hooks = lines.filter(l => l.match(/^\d\./)).map(l => l.replace(/^\d\.\s*/, '').trim());
      
      booster = {
        hashtags,
        bestTime,
        hooks
      };
    }

    const result = { tweets, booster };
    
    // Store in cache
    const cacheKey = `${topic.toLowerCase().trim()}_${tone}`;
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    res.json(result);
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message || "Gagal generate thread." });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV });
});

// Server setup
async function startApp() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamic import Vite only in development
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Dev server running on http://localhost:${PORT}`);
    });
  } else {
    // In production (Vercel), static files are handled by vercel.json
    // We just serve them as a fallback if needed
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // Only listen if not on Vercel (e.g. local production test)
    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Prod server running on port ${PORT}`);
      });
    }
  }
}

startApp();

export default app;

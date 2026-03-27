import express from "express";
import path from "path";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const SYSTEM_INSTRUCTION = `Kamu adalah content writer spesialis thread viral untuk platform X (Twitter) dan Threads paling gokil di Indonesia. Gaya bahasamu sangat "anti-AI": tidak kaku, penuh emosi, menggunakan slang yang tepat (tapi tetap sopan), dan punya struktur kalimat yang bervariasi (pendek-panjang).

MISI UTAMA: Buat thread yang terasa ditulis oleh manusia asli yang ahli di bidangnya, bukan robot. Konten harus optimal baik untuk audiens X maupun Threads.

GAYA PENULISAN (HUMAN-LIKE):
- Gunakan bahasa gaul internet Indonesia yang natural (gak, udah, beneran, asli, parah, jujurly, sbnrnya).
- JANGAN gunakan kata 'lo' atau 'gue' KECUALI jika tone yang dipilih adalah "CAREER HACK". Untuk tone lain, gunakan 'kamu/aku' atau 'kalian/kita' biar lebih sopan tapi tetep santai.
- Hindari gaya bahasa AI yang terlalu bersemangat atau penuh kata sifat lebay (e.g., "luar biasa", "revolusioner", "keajaiban").
- Tulis seolah-olah kamu lagi cerita ke temen di tongkrongan. Ada jeda, ada opini pribadi, ada sedikit "curhat" atau pengakuan jujur.
- Gunakan variasi panjang kalimat. Jangan semuanya template.
- Boleh pakai singkatan umum (HP, PC, dll).
- Gunakan transisi natural: "Btw", "Nah", "Gini deh", "Bayangin".
- JANGAN pernah menuliskan kata "Hot Take" secara eksplisit di awal thread. Tunjukkan keberanian opinimu lewat kalimat, bukan label.

PANJANG THREAD (WAJIB DIPATUHI):
Sesuaikan jumlah tweet berdasarkan pilihan user:
- PENDEK: 3 tweet
  → Struktur: Situasi/Hook + Solusi langsung + Insight penutup
- SEDANG: 5 tweet (default)
  → Struktur: Situasi/Hook + Kenapa ini masalah + Solusi bernomor (dibagi 2 tweet) + Kenapa works + Insight penutup
- PANJANG: 10 tweet
  → Struktur: Situasi/Hook + Kenapa ini masalah + Solusi bernomor (dibagi 4 tweet) + Kenapa works + Contoh nyata + Kemungkinan terburuk vs terbaik + Bonus tip + Pertanyaan ke audiens + CTA follow

Jika user tidak menyebut panjang, gunakan SEDANG (5 tweet).

Tampilkan pilihan ini di awal output (sebagai metadata, sebelum tweet pertama):
Panjang dipilih: [PENDEK/SEDANG/PANJANG] ([jumlah] tweet)

TONE KHUSUS - INFLUENCER STYLE:
Jika user memilih tone "INFLUENCER", gunakan gaya berikut:
- Hook berupa situasi/pertanyaan yang relatable di kehidupan sehari-hari.
- Struktur: Situasi → Masalah → Solusi bernomor → Alasan kenapa works.
- Pakai angka dan data spesifik sebagai argumen (misal: "90% orang salah...", "Hemat 5 jam seminggu...").
- Kalimat pendek, tegas, tidak bertele-tele.
- Framing selalu win-win (menguntungkan semua pihak).
- Tweet terakhir selalu diakhiri dengan pertanyaan ke audiens untuk memicu interaksi.
- Boleh sisipkan 1 soft CTA follow di tweet terakhir (misal: "Follow @username buat tips harian kayak gini").
- Tone tegas tapi tetap approachable, seperti teman yang lebih berpengalaman (mentor-like).

TONE KHUSUS - CAREER HACK:
Jika user memilih tone "CAREER HACK", gunakan gaya berikut:
- Buka dengan situasi jebakan yang relatable (e.g., "Lo kira rajin lembur bakal bikin lo dipromosi? Salah besar.").
- Langsung kasih solusi bernomor dengan alasan logis.
- Pakai data/angka spesifik untuk memperkuat argumen.
- Framing win-win (menguntungkan karyawan & perusahaan).
- Bahasa campuran Indonesia-Inggris natural (Indoglish). Gunakan kata seperti "lo/gue", "confident", "deliver", "market rate", "value", "impact".
- Akhiri dengan insight singkat + perbandingan "Kemungkinan Terburuk vs Terbaik".

STRUKTUR THREAD (UMUM):
1. Hook (Post 1): Harus "menghentak". Gunakan angka, kontroversi ringan, atau janji hasil yang nyata. Hindari kata "Halo sobat X".
   - KHUSUS POST 1: Setelah teks tweet selesai, tambahkan baris baru dengan format:
     [GAMBAR]: [deskripsi visual singkat maksimal 15 kata, gaya flat illustration, bold colors, minimal, tanpa teks di dalam gambar, ukuran 1:1]
2. Story/Problem (Post 2): Ceritakan masalah yang sering dihadapi audiens dengan gaya relatable.
3. Solution Overview (Post 3): Kenapa cara ini beda dari yang lain.
4. Detail/Tutorial (Post 4-7): Berikan daging (value). Gunakan bullet points, tapi jangan terlalu kaku. Masukkan opini pribadi atau "insider tips".
5. Hidden Gems (Post 8): Sesuatu yang jarang orang tahu.
6. Summary (Post 9): Rangkuman singkat yang actionable.
7. Rekomendasi Produk & CTA (Post 10): 
   - WAJIB sertakan minimal 3 rekomendasi barang/produk terkait topik ini.
   - Gaya bahasa: "Soft sell" banget. Seolah-olah kamu pakai sendiri dan beneran suka.
   - Contoh: "Btw, banyak yang nanya spill barangnya. Gue pake ini sih: [Nama Produk] karena [Alasan Jujur]. Cek aja sendiri."
   - Jangan pakai link placeholder jika tidak ada, cukup deskripsi produk yang menggoda.

ATURAN FORMAT & SPASI (SANGAT KETAT):
- Setiap post WAJIB maksimal 280 karakter. JANGAN PERNAH LEBIH.
- ATURAN HITUNG KARAKTER (WAJIB):
  * Karakter biasa = 1.
  * Emoji = 2 karakter.
  * URL (link shope.ee/dll) = 23 karakter.
- Setiap tweet WAJIB berisi ide yang sudah tuntas dan selesai. JANGAN memindahkan sisa kalimat ke tweet berikutnya.
- Jika konten terlalu panjang, ringkas dan padatkan kalimatnya sampai muat dan tetap utuh dalam satu tweet (maks 280 karakter).
- Lebih baik kalimat lebih pendek tapi tuntas daripada panjang tapi nanggung.
- DILARANG KERAS memotong di tengah kata. Setiap tweet harus berakhir di kata yang sudah lengkap.
- Jangan pernah menampilkan tweet yang melebihi 280 karakter.
- Gunakan format "baris per baris" (line by line). Jangan buat paragraf panjang.
- Gunakan double enter untuk memisahkan setiap poin atau kalimat agar teks terasa "bernafas" dan sangat enak dibaca di layar HP.
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
 - Aturan: Jangan pakai teknik yang sama 2 tweet berturutan. Tweet terakhir tidak pakai cliffhanger, tapi CTA yang kuat. Cliffhanger maksimal 15 kata.

KESINAMBUNGAN ANTAR TWEET (WAJIB):
- Setiap tweet harus terhubung secara alur dengan tweet sebelumnya.
- Tweet 2 harus menjawab atau melanjutkan cliffhanger dari tweet 1.
- Tweet 3 harus membangun dari poin yang ada di tweet 2, dan seterusnya.
- Jangan ada tweet yang bisa dipindah posisinya tanpa merusak alur cerita.
- Gunakan kata transisi natural di awal tweet: "Nah, dari situ...", "Dan ini yang bikin menarik...", "Balik lagi ke tadi...", "Faktanya...", "Tapi tunggu dulu...".
- Keseluruhan thread harus terasa seperti satu cerita utuh yang mengalir, bukan sekadar kumpulan tips yang berdiri sendiri.`;

const app = express();
const PORT = 3000;

app.use(express.json());

// Simple in-memory cache
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// API Route for Gemini Generation
app.post("/api/generate", async (req, res) => {
  const { topic, tone = 'SANTAI', length = 'SEDANG', apiKey: userApiKey } = req.body;
  
  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: "Topik harus diisi." });
  }
  
  // Check Cache
  const cacheKey = `${topic.toLowerCase().trim()}_${tone}_${length}`;
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
    'HOT TAKE': 'Berikan opini yang berani dan kontroversi yang terukur. Gunakan sudut pandang yang tidak umum atau melawan arus.',
    'INFLUENCER': 'Gunakan gaya mentor yang tegas tapi approachable. Fokus pada win-win solution, data spesifik, dan akhiri dengan pertanyaan interaktif.',
    'CAREER HACK': 'Gunakan gaya profesional yang blak-blakan. Pakai bahasa Indoglish (lo/gue, confident, deliver, market rate). Buka dengan situasi jebakan, kasih solusi logis dengan data, framing win-win, dan akhiri dengan perbandingan worst vs best case.'
  };

  const lengthTweetCount = {
    'PENDEK': 3,
    'SEDANG': 5,
    'PANJANG': 10
  };

  const prompt = `BUAT THREAD VIRAL TENTANG: ${topic}
DENGAN TONE: ${tone}
PANJANG THREAD: ${length} (${lengthTweetCount[length as keyof typeof lengthTweetCount]} tweet)

Instruksi Tone Khusus: ${toneInstructions[tone as keyof typeof toneInstructions]}

Tugasmu:
1. Patuhi PANJANG THREAD yang diminta: ${lengthTweetCount[length as keyof typeof lengthTweetCount]} tweet.
2. Riset secara mandiri tools apa yang paling cocok untuk topik ini.
3. Hitung estimasi budget yang realistis.
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
    const cacheKey = `${topic.toLowerCase().trim()}_${tone}_${length}`;
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

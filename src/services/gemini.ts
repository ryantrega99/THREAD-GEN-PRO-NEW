import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export interface ThreadParams {
  topic: string;
  tools?: string;
  cost?: string;
  steps?: string;
  tips?: string;
}

const SYSTEM_INSTRUCTION = `Kamu adalah content writer spesialis thread viral untuk platform X (Twitter) dan Threads paling gokil di Indonesia. Gaya bahasamu sangat "anti-AI": tidak kaku, penuh emosi, menggunakan slang yang tepat (tapi tetap sopan), dan punya struktur kalimat yang bervariasi (pendek-panjang).

MISI UTAMA: Buat thread yang terasa ditulis oleh manusia asli yang ahli di bidangnya, bukan robot. Konten harus optimal baik untuk audiens X maupun Threads.

GAYA PENULISAN (HUMAN-LIKE):
- Gunakan bahasa gaul internet Indonesia yang natural (gak, udah, beneran, asli, parah, jujurly, sbnrnya).
- JANGAN gunakan kata 'lo' atau 'gue'. Gunakan 'kamu/aku' atau 'kalian/ita' biar lebih sopan tapi tetep santai.
- Hindari gaya bahasa AI yang terlalu bersemangat atau penuh kata sifat lebay (e.g., "luar biasa", "revolusioner", "keajaiban").
- Tulis seolah-olah kamu lagi cerita ke temen di tongkrongan. Ada jeda, ada opini pribadi, ada sedikit "curhat" atau pengakuan jujur.
- Gunakan variasi panjang kalimat. Jangan semuanya template.
- Boleh pakai singkatan umum (HP, PC, dll).
- Gunakan transisi natural: "Btw", "Nah", "Gini deh", "Bayangin".

STRUKTUR THREAD (MINIMAL 7-10 TWEET/POST):
1. Hook (Post 1): Harus "menghentak". Gunakan angka, kontroversi ringan, atau janji hasil yang nyata. Hindari kata "Halo sobat X".
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

ATURAN FORMAT:
- Setiap post maksimal ~280 karakter (aman untuk X & Threads).
- Numbering otomatis (1/, 2/, 3/, dst).
- Pisahkan setiap post dengan garis "---".
- JANGAN gunakan markdown bold atau italic berlebihan, platform gak support itu secara native. Gunakan teks biasa.`;

export async function generateThread(params: ThreadParams): Promise<string[]> {
  // Create instance inside function to ensure we use the latest key and avoid initialization issues
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing. Please check your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `BUAT THREAD TENTANG: ${params.topic}

Informasi tambahan:
- Tools/produk: ${params.tools || "N/A"}
- Estimasi biaya/penghematan: ${params.cost || "N/A"}
- Steps: ${params.steps || "N/A"}
- Tips: ${params.tips || "N/A"}`;

  try {
    console.log("Generating thread with prompt:", prompt);
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
      },
    });

    console.log("Full response object:", response);
    const text = response.text || "";
    console.log("Model response text:", text);
    
    // If the model didn't use "---", try to split by numbering (e.g., "1/", "2/")
    let tweets = text.split("---").map(t => t.trim()).filter(t => t.length > 0);
    
    if (tweets.length <= 1) {
      // Fallback: try to split by numbering if "---" is missing
      const numberingRegex = /\n(?=\d+\/)/g;
      const splitByNumbering = text.split(numberingRegex).map(t => t.trim()).filter(t => t.length > 0);
      if (splitByNumbering.length > 1) {
        tweets = splitByNumbering;
      }
    }

    if (tweets.length === 0 && text.length > 0) {
      // If we couldn't split but have text, just return the whole thing as one tweet
      tweets = [text];
    }

    console.log("Final tweets array:", tweets);
    return tweets;
  } catch (error) {
    console.error("Error generating thread:", error);
    throw error;
  }
}

import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const dbName = "telegramBotDB";
const collectionName = "users";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const body = req.body;
  if (!body.message) return res.status(200).json({ ok: true });

  const chatId = body.message.chat.id;
  const text = body.message.text || "";

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection(collectionName);

    // Simpan chatId (auto register user)
    await users.updateOne(
      { chatId },
      { $set: { chatId } },
      { upsert: true }
    );

    if (text === "/start") {
      await sendMessage(chatId, "👋 Selamat datang!\n\nMenu:\n/cekid - Cek ID kamu\n/cekidch - Cek ID group/channel");
    }

    else if (text === "/cekid") {
      await sendMessage(chatId, `🆔 ID kamu: \`${chatId}\``, "Markdown");
    }

    else if (text === "/cekidch") {
      await sendMessage(chatId, `🆔 ID chat ini: \`${chatId}\``, "Markdown");
    }

    else if (text.startsWith("/broadcast ")) {
      const ADMIN_ID = Number(process.env.ADMIN_ID);
      if (chatId !== ADMIN_ID) {
        await sendMessage(chatId, "🚫 Kamu tidak punya izin broadcast.");
      } else {
        const msg = text.replace("/broadcast ", "").trim();
        const allUsers = await users.find({}).toArray();

        for (let u of allUsers) {
          await sendMessage(u.chatId, `📢 Broadcast:\n\n${msg}`);
        }
        await sendMessage(chatId, `✅ Broadcast terkirim ke ${allUsers.length} user.`);
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }

  return res.status(200).json({ ok: true });
}

// Helper kirim pesan
async function sendMessage(chatId, text, parse_mode = null) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode
    })
  });
    }

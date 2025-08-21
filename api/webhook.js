import { MongoClient } from "mongodb";
import fetch from "node-fetch";

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const MONGO_URL = process.env.MONGO_URL;

let cachedDb = null;
async function connectToDB() {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  cachedDb = client.db("telegram_bot");
  return cachedDb;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ status: "ok" });
  }

  const update = req.body;
  const message = update.message;

  if (!message) return res.status(200).end();

  const chatId = message.chat.id;
  const text = message.text?.trim();

  const db = await connectToDB();
  const users = db.collection("users");

  // simpan user yg pernah start bot
  await users.updateOne({ chatId }, { $set: { chatId } }, { upsert: true });

  // perintah bot
  if (text === "/start") {
    await sendMessage(chatId, "👋 Halo! Selamat datang di bot.\n\nPerintah:\n/cekid → cek id kamu\n/cekidch → cek id channel (forward pesan)\n/cekidgrup → cek id grup (pakai di grup)\n\nKhusus owner:\n/broadcast <teks>");
  }

  if (text === "/cekid") {
    await sendMessage(chatId, `🆔 ID kamu: \`${chatId}\``);
  }

  if (message.forward_from_chat) {
    await sendMessage(chatId, `🆔 ID chat ini: \`${message.forward_from_chat.id}\``);
  }

  if (text?.startsWith("/broadcast") && String(chatId) === OWNER_ID) {
    const bcText = text.replace("/broadcast", "").trim();
    if (!bcText) {
      await sendMessage(chatId, "❌ Teks broadcast kosong!");
    } else {
      const allUsers = await users.find({}).toArray();
      for (let u of allUsers) {
        await sendMessage(u.chatId, `📢 Broadcast:\n${bcText}`);
      }
      await sendMessage(chatId, `✅ Broadcast terkirim ke ${allUsers.length} user`);
    }
  }

  return res.status(200).end();
}

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
  });
}

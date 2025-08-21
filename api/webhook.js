import { MongoClient } from "mongodb";

// langsung hardcode
const BOT_TOKEN = "8447727647:AAGuI6p63uXC6MbNXyZqyqIJVjOsitvk1tE";
const ADMIN_ID = "6629230649";
const MONGO_URL = "mongodb+srv://bimaputra436123:jp42Qm5YaDITRHkM@cluster0.ymijlka.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ status: "ok" });
  }

  const update = req.body;

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text || "";

    // simpan user ke MongoDB
    try {
      const client = await MongoClient.connect(MONGO_URL);
      const db = client.db("telegrambot");
      const users = db.collection("users");
      await users.updateOne(
        { chatId },
        { $set: { chatId } },
        { upsert: true }
      );
      client.close();
    } catch (err) {
      console.error("Mongo error:", err);
    }

    // handle command
    if (text === "/start") {
      await sendMessage(chatId, "Selamat datang di bot 🚀\nGunakan /cekid untuk lihat ID.");
    } else if (text === "/cekid") {
      await sendMessage(chatId, `ID kamu: ${chatId}`);
    } else if (text === "/cekidch" && update.message.chat.type === "channel") {
      await sendMessage(chatId, `ID channel ini: ${update.message.chat.id}`);
    } else if (text === "/cekidgr" && update.message.chat.type.endsWith("group")) {
      await sendMessage(chatId, `ID grup ini: ${update.message.chat.id}`);
    } else if (text.startsWith("/broadcast") && String(chatId) === ADMIN_ID) {
      const broadcastText = text.replace("/broadcast", "").trim();
      if (!broadcastText) {
        await sendMessage(chatId, "Teks broadcast kosong!");
      } else {
        try {
          const client = await MongoClient.connect(MONGO_URL);
          const db = client.db("telegrambot");
          const users = db.collection("users");
          const allUsers = await users.find({}).toArray();

          for (const user of allUsers) {
            await sendMessage(user.chatId, `📢 Broadcast:\n\n${broadcastText}`);
          }

          client.close();
          await sendMessage(chatId, "✅ Broadcast terkirim.");
        } catch (err) {
          console.error("Broadcast error:", err);
          await sendMessage(chatId, "❌ Gagal broadcast.");
        }
      }
    }
  }

  return res.status(200).json({ ok: true });
        }

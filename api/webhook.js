import { createClient } from '@supabase/supabase-js'

// Config Supabase (GANTI DENGAN MILIKMU!)
const SUPABASE_URL = 'https://your-project-id.supabase.co'
const SUPABASE_KEY = 'your-anon-key'
const BOT_TOKEN = '8447727647:AAGuI6p63uXC6MbNXyZqyqIJVjOsitvk1tE'
const ADMIN_ID = '6629230649'

// Inisialisasi Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Helper: Kirim pesan ke Telegram
async function sendMessage(chatId, text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text,
        parse_mode: 'HTML'
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Telegram API error:', error)
    }
  } catch (error) {
    console.error('❌ Error sendMessage:', error)
  }
}

// Helper: Simpan user diam-diam (NO LOG TO USER)
async function saveUserSilently(chatId, userData = {}) {
  try {
    // HANYA simpan jika ini adalah user (private chat)
    if (chatId > 0 && update.message.chat.type === 'private') {
      const { error } = await supabase
        .from('users')
        .upsert({
          chat_id: chatId.toString(),
          username: userData.username || null,
          first_name: userData.first_name || null,
          last_name: userData.last_name || null,
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'chat_id'
        })
      
      if (error) {
        console.error('❌ Supabase error (silent):', error.message)
      }
    }
  } catch (err) {
    // Jangan kasih tau user ada error
    console.error('❌ Error save user (silent):', err.message)
  }
}

// Helper: Ambil semua user dari Supabase
async function getAllUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('chat_id')
    
    if (error) {
      console.error('❌ Error get users:', error.message)
      return []
    }
    
    return data || []
  } catch (err) {
    console.error('❌ Error getAllUsers:', err.message)
    return []
  }
}

// Handler untuk broadcast
async function handleBroadcast(adminChatId, messageText) {
  try {
    const broadcastText = messageText.replace('/broadcast', '').trim()
    
    if (!broadcastText) {
      await sendMessage(adminChatId, '❌ <b>Format salah!</b>\n\nGunakan: <code>/broadcast [pesan]</code>')
      return
    }
    
    await sendMessage(adminChatId, '📢 <b>Memulai broadcast...</b>')
    
    // Ambil semua user
    const allUsers = await getAllUsers()
    console.log(`📊 Total USER di DB: ${allUsers.length}`)
    
    let successCount = 0
    let failCount = 0
    
    // Kirim ke setiap USER
    for (const user of allUsers) {
      try {
        if (user.chat_id) {
          await sendMessage(user.chat_id, `📢 <b>BROADCAST</b>\n\n${broadcastText}`)
          successCount++
          
          // Delay biar ga kena rate limit
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      } catch (error) {
        failCount++
        // Silent error, jangan ganggu user
      }
    }
    
    // Report ke admin
    await sendMessage(
      adminChatId,
      `✅ <b>Broadcast selesai!</b>\n\n` +
      `📊 Statistik:\n` +
      `• Berhasil: ${successCount}\n` +
      `• Gagal: ${failCount}\n` +
      `• Total USER: ${allUsers.length}`
    )
  } catch (err) {
    console.error('❌ Broadcast error:', err.message)
    await sendMessage(adminChatId, '❌ <b>Gagal broadcast:</b> ' + err.message)
  }
}

// Helper: Kirim pesan hanya jika perlu
async function sendResponse(chatId, text) {
  // Hanya kirim jika ada text (tidak untuk silent save)
  if (text) {
    await sendMessage(chatId, text)
  }
}

// Main handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ 
      status: 'ok',
      message: 'Bot is running'
    })
  }

  try {
    const update = req.body
    
    if (update.message) {
      const chatId = update.message.chat.id
      const text = update.message.text || ''
      const userInfo = update.message.from || {}
      const chatType = update.message.chat.type
      
      // SIMPAN USER DIAM-DIAM (tanpa kasih tau user)
      await saveUserSilently(chatId, userInfo)
      
      // Handle commands (hanya kasih response untuk command yang perlu)
      if (text === '/start') {
        await sendResponse(
          chatId,
          '✨ <b>Selamat datang di Bot Telegram!</b> ✨\n\n' +
          '📋 <b>Perintah yang tersedia:</b>\n' +
          '• /start - Memulai bot\n' +
          '• /cekid - Lihat ID Anda\n' +
          '• /cekidch - Lihat ID channel\n' +
          '• /cekidgr - Lihat ID grup'
        )
      } 
      else if (text === '/cekid') {
        await sendResponse(chatId, `🔑 <b>ID Anda:</b> <code>${chatId}</code>`)
      }
      else if (text === '/cekidch') {
        if (chatType === 'channel') {
          await sendResponse(chatId, `📢 <b>ID Channel:</b> <code>${chatId}</code>`)
        } else {
          await sendResponse(chatId, '❌ Perintah ini hanya untuk channel!')
        }
      }
      else if (text === '/cekidgr') {
        if (chatType.endsWith('group')) {
          await sendResponse(chatId, `👥 <b>ID Grup:</b> <code>${chatId}</code>`)
        } else {
          await sendResponse(chatId, '❌ Perintah ini hanya untuk grup!')
        }
      }
      else if (text.startsWith('/broadcast')) {
        if (String(chatId) === ADMIN_ID) {
          await handleBroadcast(chatId, text)
        } else {
          // Kasih pesan umum biar user ga curiga
          await sendResponse(chatId, '❌ Perintah tidak dikenali')
        }
      }
      // Untuk pesan biasa (bukan command), DIAM SAJA
      // Tidak perlu kirim response apapun
    }
    
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('❌ Handler error:', error.message)
    return res.status(200).json({ ok: true }) // Tetap return success biar Telegram ga kirim ulang
  }
}

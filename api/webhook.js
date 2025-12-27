import { createClient } from '@supabase/supabase-js'

// CONFIG (GANTI INI!)
const BOT_TOKEN = '8447727647:AAGuI6p63uXC6MbNXyZqyqIJVjOsitvk1tE'
const ADMIN_ID = '6629230649'

// SUPABASE (KOSONGIN DULU, ISI NANTI)
const SUPABASE_URL = ''  // nanti diisi
const SUPABASE_KEY = ''  // nanti diisi

// Inisialisasi Supabase (kalo credentials ada)
let supabase = null
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  console.log('✅ Supabase terhubung')
} else {
  console.log('⚠️  Supabase belum dikonfigurasi')
}

// ========== HELPER FUNCTIONS ==========

// Kirim pesan ke Telegram
async function sendMessage(chatId, text, parseMode = 'HTML') {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: parseMode
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Kirim pesan gagal:', error)
    }
    
    return response
  } catch (error) {
    console.error('❌ Error sendMessage:', error.message)
    return null
  }
}

// Simpan user ke database (SILENT - user ga tau)
async function saveUserSilently(chatId, userData) {
  // Hanya simpan user pribadi, bukan grup/channel
  if (chatId > 0) {
    try {
      if (supabase) {
        await supabase
          .from('users')
          .upsert({
            chat_id: chatId.toString(),
            username: userData.username || null,
            first_name: userData.first_name || null,
            last_name: userData.last_name || null,
            last_active: new Date().toISOString()
          }, {
            onConflict: 'chat_id'
          })
        console.log(`📝 User ${chatId} tersimpan (silent)`)
      }
    } catch (error) {
      // Diam saja, jangan ganggu user
      console.error('❌ Error save user (silent):', error.message)
    }
  }
}

// Ambil semua user dari database (untuk broadcast)
async function getAllUsers() {
  try {
    if (!supabase) {
      console.log('⚠️  Supabase belum setup, return empty array')
      return []
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('chat_id')
      .not('chat_id', 'is', null)
    
    if (error) {
      console.error('❌ Error get users:', error.message)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('❌ Error getAllUsers:', error.message)
    return []
  }
}

// Handle broadcast command
async function handleBroadcast(adminChatId, messageText) {
  const broadcastText = messageText.replace('/broadcast', '').trim()
  
  if (!broadcastText) {
    await sendMessage(adminChatId, '❌ <b>Format salah!</b>\n\nGunakan: <code>/broadcast [pesan]</code>')
    return
  }
  
  await sendMessage(adminChatId, '📢 <b>Memulai broadcast...</b>')
  
  const allUsers = await getAllUsers()
  console.log(`📊 Total user di DB: ${allUsers.length}`)
  
  if (allUsers.length === 0) {
    await sendMessage(adminChatId, '❌ <b>Tidak ada user di database!</b>\n\nCoba /start dulu dari akun lain.')
    return
  }
  
  let successCount = 0
  let failCount = 0
  
  for (const user of allUsers) {
    try {
      if (user.chat_id && user.chat_id !== adminChatId.toString()) {
        await sendMessage(user.chat_id, `📢 <b>BROADCAST</b>\n\n${broadcastText}`)
        successCount++
        
        // Delay kecil biar ga kena rate limit
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    } catch (error) {
      failCount++
      // Silent error
    }
  }
  
  // Report ke admin
  await sendMessage(
    adminChatId,
    `✅ <b>Broadcast selesai!</b>\n\n` +
    `📊 Statistik:\n` +
    `• Berhasil: ${successCount}\n` +
    `• Gagal: ${failCount}\n` +
    `• Total user: ${allUsers.length}`
  )
}

// Handle /cekidgr (grup) dan /cekidch (channel)
async function handleSpecialIds(chatId, text, chatType) {
  if (text === '/cekidgr') {
    if (chatType.endsWith('group')) {
      await sendMessage(chatId, `👥 <b>ID Grup:</b> <code>${chatId}</code>`)
    } else {
      await sendMessage(chatId, '❌ Perintah ini hanya untuk grup!')
    }
  } 
  else if (text === '/cekidch') {
    if (chatType === 'channel') {
      await sendMessage(chatId, `📢 <b>ID Channel:</b> <code>${chatId}</code>`)
    } else {
      await sendMessage(chatId, '❌ Perintah ini hanya untuk channel!')
    }
  }
}

// ========== MAIN HANDLER ==========
export default async function handler(req, res) {
  console.log('🤖 Bot dipanggil - Method:', req.method)
  
  // Handle GET request (testing)
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'Bot aktif!',
      bot: '@Cekidtelegrambimxyz_bot',
      supabase: supabase ? 'TERHUBUNG' : 'BELUM DIKONFIGURASI',
      time: new Date().toISOString()
    })
  }
  
  // Handle POST (webhook Telegram)
  if (req.method === 'POST') {
    try {
      const update = req.body
      
      if (!update || !update.message) {
        console.log('⚠️  Update tanpa message')
        return res.status(200).json({ ok: true })
      }
      
      const chatId = update.message.chat.id
      const text = update.message.text || ''
      const userInfo = update.message.from || {}
      const chatType = update.message.chat.type
      
      console.log(`📨 Dari: ${userInfo.first_name || 'User'} (${chatId})`)
      console.log(`💬 Pesan: "${text}"`)
      console.log(`🏷️  Tipe: ${chatType}`)
      
      // SIMPAN USER (SILENT) - hanya untuk private chat
      if (chatType === 'private') {
        await saveUserSilently(chatId, userInfo)
      }
      
      // HANDLE COMMANDS
      if (text === '/start') {
        let response = '✨ <b>Selamat datang di Bot Telegram!</b> ✨\n\n'
        response += '📋 <b>Perintah yang tersedia:</b>\n'
        response += '• /start - Memulai bot\n'
        response += '• /cekid - Lihat ID Anda\n'
        response += '• /cekidch - Lihat ID channel\n'
        response += '• /cekidgr - Lihat ID grup\n'
        
        if (supabase) {
          response += '• /broadcast [pesan] - Kirim broadcast (admin only)'
        } else {
          response += '\n⚠️ <i>Broadcast belum aktif (database belum setup)</i>'
        }
        
        await sendMessage(chatId, response)
      }
      else if (text === '/cekid') {
        await sendMessage(chatId, `🔑 <b>ID Anda:</b> <code>${chatId}</code>`)
      }
      else if (text === '/cekidgr' || text === '/cekidch') {
        await handleSpecialIds(chatId, text, chatType)
      }
      else if (text.startsWith('/broadcast')) {
        if (!supabase) {
          await sendMessage(chatId, '❌ <b>Broadcast belum aktif!</b>\n\nSetup database Supabase terlebih dahulu.')
        } else if (String(chatId) === ADMIN_ID) {
          await handleBroadcast(chatId, text)
        } else {
          // Kasih pesan umum biar user ga curiga
          await sendMessage(chatId, '❌ Perintah tidak dikenali')
        }
      }
      else if (text.startsWith('/')) {
        await sendMessage(chatId, `❌ Command "<code>${text}</code>" tidak dikenal\n\nCoba /start`)
      }
      // Untuk pesan biasa: DIAM SAJA (no response)
      
      return res.status(200).json({ ok: true })
      
    } catch (error) {
      console.error('🔥 ERROR:', error.message)
      console.error('Stack:', error.stack)
      return res.status(200).json({ ok: true }) // Tetap 200 ke Telegram
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
      }

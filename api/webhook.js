// api/bot.js - KODE MINIMAL YANG PASTI JALAN
const BOT_TOKEN = '8447727647:AAGuI6p63uXC6MbNXyZqyqIJVjOsitvk1tE'

export default async function handler(req, res) {
  console.log('🚀 Bot dipanggil - Method:', req.method)
  
  // Handle GET request (buat testing)
  if (req.method === 'GET') {
    console.log('✅ GET request berhasil')
    return res.status(200).json({ 
      status: 'Bot aktif!',
      bot: '@Cekidtelegrambimxyz_bot',
      time: new Date().toISOString()
    })
  }
  
  // Handle POST (webhook dari Telegram)
  if (req.method === 'POST') {
    console.log('📨 POST request dari Telegram')
    
    try {
      // Parse body
      const update = req.body
      console.log('📦 Update data:', JSON.stringify(update, null, 2))
      
      // Pastikan ada message
      if (!update || !update.message) {
        console.log('⚠️  Tidak ada message dalam update')
        return res.status(200).json({ ok: true })
      }
      
      const chatId = update.message.chat.id
      const text = update.message.text || ''
      const firstName = update.message.from?.first_name || 'User'
      
      console.log(`👤 Dari: ${firstName} (${chatId})`)
      console.log(`💬 Pesan: "${text}"`)
      
      // Default response
      let responseText = `Hai ${firstName}!`
      
      if (text === '/start') {
        responseText = `👋 <b>Selamat datang!</b>\n\n` +
          `ID kamu: <code>${chatId}</code>\n` +
          `Coba ketik /cekid`
      } 
      else if (text === '/cekid') {
        responseText = `🔑 <b>ID Kamu:</b> <code>${chatId}</code>`
      }
      else if (text.startsWith('/')) {
        responseText = `Command "${text}" tidak dikenal\nCoba /start`
      }
      else {
        responseText = `Kamu bilang: "${text}"`
      }
      
      // Kirim ke Telegram
      console.log(`📤 Mengirim response ke ${chatId}`)
      
      const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: responseText,
          parse_mode: 'HTML'
        })
      })
      
      const result = await telegramResponse.json()
      console.log('✅ Telegram API response:', result.ok ? 'SUCCESS' : 'FAILED')
      
      if (!result.ok) {
        console.error('❌ Telegram error:', result)
      }
      
      // SELALU return 200 ke Telegram
      return res.status(200).json({ ok: true })
      
    } catch (error) {
      console.error('🔥 CATCH ERROR:', error.message)
      console.error('Stack:', error.stack)
      
      // Tetap return 200 ke Telegram biar ga spam
      return res.status(200).json({ 
        ok: false,
        error: error.message 
      })
    }
  }
  
  // Method tidak didukung
  console.log('❌ Method tidak didukung:', req.method)
  return res.status(405).json({ error: 'Method not allowed' })
        }

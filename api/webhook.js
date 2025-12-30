const BOT_TOKEN = '8412001654:AAFpqXhx8oOuyLtAn0-1i1GXz8asO7W9B_8'
const ADMINS = ['6629230649', '862542772'] // Dua admin sekarang

// GitHub Config
const GITHUB_TOKEN_PART1 = 'github_pat_'
const GITHUB_TOKEN_PART2 = '11BTL4JUA0Kju9k9D639IG_AY53fblhTV3br5UC738nCCAqYIcZx9EFE4kpZ1zXx4KAR6W5GF2tQKrllq4'
const REPO_OWNER = 'BimxyzDev'
const REPO_NAME = 'Tele'
const DATA_FILE = 'users.json'

// Helper: Gabung token
function getGitHubToken() {
  return GITHUB_TOKEN_PART1 + GITHUB_TOKEN_PART2
}

// Helper: Cek apakah admin
function isAdmin(userId) {
  return ADMINS.includes(String(userId))
}

// Helper: Kirim pesan
async function sendTG(chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    })
  } catch(e) {}
}

// Helper: Simpan user ke GitHub
async function saveUser(chatId, userData) {
  if (chatId <= 0) return false
  try {
    const token = getGitHubToken()
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE}`
    
    let users = {}, sha = ''
    const getRes = await fetch(url, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    })
    
    if (getRes.ok) {
      const data = await getRes.json()
      users = JSON.parse(Buffer.from(data.content, 'base64').toString() || '{}')
      sha = data.sha
    } else if (getRes.status === 404) {
      users = {}
    } else return false
    
    users[chatId] = {
      first_name: userData.first_name || '',
      username: userData.username || '',
      saved_at: new Date().toISOString()
    }
    
    await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' },
      body: JSON.stringify({
        message: `Update user ${chatId}`,
        content: Buffer.from(JSON.stringify(users)).toString('base64'),
        sha: sha || undefined
      })
    })
    return true
  } catch(e) {
    return false
  }
}

// Helper: Ambil semua user
async function getAllUsers() {
  try {
    const token = getGitHubToken()
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE}`
    const res = await fetch(url, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    })
    
    if (!res.ok) return []
    const data = await res.json()
    const content = Buffer.from(data.content, 'base64').toString()
    const users = JSON.parse(content || '{}')
    return Object.keys(users).map(id => ({ chat_id: id }))
  } catch(e) {
    return []
  }
}

// Helper: Ban user di grup
async function banUser(chatId, userId) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/banChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
        revoke_messages: true
      })
    })
    return res.ok
  } catch(e) {
    return false
  }
}

// Helper: Kick user dari grup
async function kickUser(chatId, userId) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/banChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
        revoke_messages: true,
        until_date: Math.floor(Date.now() / 1000) + 30 // Unban setelah 30 detik = kick
      })
    })
    return res.ok
  } catch(e) {
    return false
  }
}

// Helper: Mute user
async function muteUser(chatId, userId, duration = 0) {
  try {
    let untilDate = 0
    if (duration > 0) {
      untilDate = Math.floor(Date.now() / 1000) + duration
    }
    
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/restrictChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
        permissions: {
          can_send_messages: false,
          can_send_media_messages: false,
          can_send_other_messages: false,
          can_add_web_page_previews: false
        },
        until_date: untilDate || undefined
      })
    })
    return res.ok
  } catch(e) {
    return false
  }
}

// Helper: Unmute user
async function unmuteUser(chatId, userId) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/restrictChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
        permissions: {
          can_send_messages: true,
          can_send_media_messages: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true
        }
      })
    })
    return res.ok
  } catch(e) {
    return false
  }
}

// Helper: Get user info
async function getUserInfo(chatId, userId) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, user_id: userId })
    })
    
    if (res.ok) {
      const data = await res.json()
      return data.result
    }
    return null
  } catch(e) {
    return null
  }
}

// Helper: Parse durasi mute
function parseDuration(durationStr) {
  if (!durationStr) return 0
  if (durationStr.toLowerCase() === 'perma') return 0 // Permanent
  
  const match = durationStr.match(/^(\d+)([dhms])$/i)
  if (!match) return 0
  
  const value = parseInt(match[1])
  const unit = match[2].toLowerCase()
  
  switch(unit) {
    case 'd': return value * 24 * 60 * 60 // hari ke detik
    case 'h': return value * 60 * 60      // jam ke detik
    case 'm': return value * 60           // menit ke detik
    case 's': return value                // detik
    default: return 0
  }
}

// Broadcast handler
async function handleBroadcast(adminId, text) {
  const msg = text.replace('/broadcast', '').trim()
  if (!msg) return
  
  await sendTG(adminId, '📢 Broadcast dimulai...')
  const users = await getAllUsers()
  let success = 0
  
  for (const user of users) {
    try {
      if (user.chat_id !== adminId.toString()) {
        await sendTG(user.chat_id, `📢 <b>Pesan Penting</b>\n\n${msg}`)
        success++
        await new Promise(r => setTimeout(r, 50))
      }
    } catch(e) {}
  }
  
  await sendTG(adminId, `✅ Selesai\nBerhasil: ${success}\nTotal: ${users.length}`)
}

// Main handler
export default async function handler(req, res) {
  // GET untuk test
  if (req.method === 'GET') {
    return res.status(200).json({ 
      bot: '@@Cekidprobot',
      admins: ADMINS,
      status: 'active'
    })
  }
  
  // POST dari Telegram
  if (req.method === 'POST') {
    const update = req.body
    
    if (update.message) {
      const chatId = update.message.chat.id
      const text = update.message.text || ''
      const userInfo = update.message.from || {}
      const chatType = update.message.chat.type
      const messageId = update.message.message_id
      const replyTo = update.message.reply_to_message
      
      // Simpan user (private only)
      if (chatType === 'private') {
        saveUser(chatId, userInfo)
      }
      
      // Handle commands
      if (text === '/start') {
        let response = '✨ <b>Bot ID & Group Management</b> ✨\n\n'
        
        if (chatType === 'private') {
          response += '📋 <b>Perintah Umum:</b>\n'
          response += '• /start - Menu\n'
          response += '• /cekid - Lihat ID\n'
          response += '• /cekidch - ID channel\n'
          response += '• /cekidgr - ID grup\n'
          
          if (isAdmin(String(chatId))) {
            response += '\n👑 <b>Perintah Admin:</b>\n'
            response += '• /broadcast [pesan]\n'
            response += '• /totaluser - Total user tersimpan\n'
          }
        } else if (chatType.endsWith('group') || chatType === 'supergroup') {
          response += '👥 <b>Perintah Group (Admin only):</b>\n'
          response += '• /ban @user - Ban user\n'
          response += '• /kick @user - Kick user\n'
          response += '• /mute @user 30m - Mute 30 menit\n'
          response += '• /mute @user 1d - Mute 1 hari\n'
          response += '• /mute @user perma - Mute permanent\n'
          response += '• /unmute @user - Unmute user\n'
          response += '• /user @user - Info user\n'
          response += '• /warn @user - Warning\n'
          response += '\n<b>Format durasi:</b> 30m, 2h, 1d, 60s\n'
        }
        
        await sendTG(chatId, response)
      }
      else if (text === '/cekid') {
        await sendTG(chatId, `🔑 <b>ID Anda:</b> <code>${chatId}</code>`)
      }
      else if (text === '/cekidch') {
        const msg = chatType === 'channel' 
          ? `📢 <b>ID Channel:</b> <code>${chatId}</code>`
          : '❌ Hanya untuk channel!'
        await sendTG(chatId, msg)
      }
      else if (text === '/cekidgr') {
        const msg = chatType.endsWith('group')
          ? `👥 <b>ID Grup:</b> <code>${chatId}</code>`
          : '❌ Hanya untuk grup!'
        await sendTG(chatId, msg)
      }
      else if (text === '/totaluser' && isAdmin(String(chatId))) {
        const users = await getAllUsers()
        await sendTG(chatId, `📊 <b>Total User Tersimpan:</b> ${users.length}`)
      }
      else if (text.startsWith('/broadcast') && isAdmin(String(chatId))) {
        await handleBroadcast(chatId, text)
      }
      // ========== GROUP MANAGEMENT COMMANDS ==========
      else if (text.startsWith('/ban ') && (chatType.endsWith('group') || chatType === 'supergroup')) {
        if (!isAdmin(String(chatId))) {
          await sendTG(chatId, '❌ Hanya admin grup yang bisa!')
          return res.status(200).json({ ok: true })
        }
        
        const target = text.split(' ')[1]
        const userId = target.startsWith('@') ? target.slice(1) : target
        
        if (await banUser(chatId, userId)) {
          await sendTG(chatId, `✅ User <code>${target}</code> telah di-banned`)
        } else {
          await sendTG(chatId, '❌ Gagal ban user')
        }
      }
      else if (text.startsWith('/kick ') && (chatType.endsWith('group') || chatType === 'supergroup')) {
        if (!isAdmin(String(chatId))) {
          await sendTG(chatId, '❌ Hanya admin grup yang bisa!')
          return res.status(200).json({ ok: true })
        }
        
        const target = text.split(' ')[1]
        const userId = target.startsWith('@') ? target.slice(1) : target
        
        if (await kickUser(chatId, userId)) {
          await sendTG(chatId, `✅ User <code>${target}</code> telah di-kick`)
        } else {
          await sendTG(chatId, '❌ Gagal kick user')
        }
      }
      else if (text.startsWith('/mute ') && (chatType.endsWith('group') || chatType === 'supergroup')) {
        if (!isAdmin(String(chatId))) {
          await sendTG(chatId, '❌ Hanya admin grup yang bisa!')
          return res.status(200).json({ ok: true })
        }
        
        const parts = text.split(' ')
        if (parts.length < 2) {
          await sendTG(chatId, '❌ Format: <code>/mute @user 30m</code>\nContoh: /mute @user 1d (1 hari)')
          return res.status(200).json({ ok: true })
        }
        
        const target = parts[1]
        const durationStr = parts[2] || '30m'
        const userId = target.startsWith('@') ? target.slice(1) : target
        const duration = parseDuration(durationStr)
        
        if (await muteUser(chatId, userId, duration)) {
          const msg = duration === 0 
            ? `✅ User <code>${target}</code> di-mute permanent`
            : `✅ User <code>${target}</code> di-mute selama ${durationStr}`
          await sendTG(chatId, msg)
        } else {
          await sendTG(chatId, '❌ Gagal mute user')
        }
      }
      else if (text.startsWith('/unmute ') && (chatType.endsWith('group') || chatType === 'supergroup')) {
        if (!isAdmin(String(chatId))) {
          await sendTG(chatId, '❌ Hanya admin grup yang bisa!')
          return res.status(200).json({ ok: true })
        }
        
        const target = text.split(' ')[1]
        const userId = target.startsWith('@') ? target.slice(1) : target
        
        if (await unmuteUser(chatId, userId)) {
          await sendTG(chatId, `✅ User <code>${target}</code> telah di-unmute`)
        } else {
          await sendTG(chatId, '❌ Gagal unmute user')
        }
      }
      else if (text.startsWith('/user ') && (chatType.endsWith('group') || chatType === 'supergroup')) {
        if (!isAdmin(String(chatId))) {
          await sendTG(chatId, '❌ Hanya admin grup yang bisa!')
          return res.status(200).json({ ok: true })
        }
        
        const target = text.split(' ')[1]
        const userId = target.startsWith('@') ? target.slice(1) : target
        const userInfo = await getUserInfo(chatId, userId)
        
        if (userInfo) {
          const user = userInfo.user
          const statusMap = {
            'creator': 'Pemilik',
            'administrator': 'Admin',
            'member': 'Member',
            'restricted': 'Restricted',
            'left': 'Left',
            'kicked': 'Banned'
          }
          
          const response = `👤 <b>User Info:</b>\n` +
            `├ ID: <code>${user.id}</code>\n` +
            `├ Nama: ${user.first_name || ''} ${user.last_name || ''}\n` +
            `├ Username: @${user.username || 'tidak ada'}\n` +
            `└ Status: ${statusMap[userInfo.status] || userInfo.status}`
          
          await sendTG(chatId, response)
        } else {
          await sendTG(chatId, '❌ User tidak ditemukan')
        }
      }
      else if (text.startsWith('/warn ') && (chatType.endsWith('group') || chatType === 'supergroup')) {
        if (!isAdmin(String(chatId))) {
          await sendTG(chatId, '❌ Hanya admin grup yang bisa!')
          return res.status(200).json({ ok: true })
        }
        
        const target = text.split(' ')[1]
        const userId = target.startsWith('@') ? target.slice(1) : target
        const userInfo = await getUserInfo(chatId, userId)
        
        if (userInfo) {
          const user = userInfo.user
          await sendTG(chatId, `⚠️ <b>PERINGATAN</b>\n\nUser @${user.username || user.first_name} mendapat peringatan dari admin!`)
          await sendTG(userId, `⚠️ <b>Kamu mendapat peringatan</b> di grup!\n\nHarap patuhi rules grup.`)
        } else {
          await sendTG(chatId, '❌ User tidak ditemukan')
        }
      }
    }
    
    return res.status(200).json({ ok: true })
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
  }

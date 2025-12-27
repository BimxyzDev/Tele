const BOT_TOKEN = '8447727647:AAGuI6p63uXC6MbNXyZqyqIJVjOsitvk1tE'
const ADMIN_ID = '6629230649'

// GitHub Config - TOKEN SPLIT 2 BAGIAN
const GITHUB_TOKEN_PART1 = 'github_pat_'  // Part 1 (tetap)
const GITHUB_TOKEN_PART2 = '11BTL4JUA0Kju9k9D639IG_AY53fblhTV3br5UC738nCCAqYIcZx9EFE4kpZ1zXx4KAR6W5GF2tQKrllq4'  // Part 2 (isi token lu setelah github_pat_)
const REPO_OWNER = 'BimxyzDev'       // GitHub username lu
const REPO_NAME = 'Tele'             // Nama repo 
const DATA_FILE = 'users.json'           // File JSON

// Helper: Gabung token
function getGitHubToken() {
  return GITHUB_TOKEN_PART1 + GITHUB_TOKEN_PART2
}

// Helper: Kirim pesan
async function sendTG(chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    })
  } catch(e) {
    // silent
  }
}

// Helper: Simpan user ke GitHub
async function saveUser(chatId, userData) {
  if (chatId <= 0) return false
  
  try {
    const token = getGitHubToken()
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE}`
    
    // 1. Get current file
    let users = {}
    let sha = ''
    
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    
    if (getRes.ok) {
      const data = await getRes.json()
      const content = Buffer.from(data.content, 'base64').toString()
      users = JSON.parse(content || '{}')
      sha = data.sha
    } else if (getRes.status === 404) {
      // File belum ada, buat baru
      users = {}
    } else {
      return false
    }
    
    // 2. Update data
    users[chatId] = {
      first_name: userData.first_name || '',
      username: userData.username || '',
      saved_at: new Date().toISOString()
    }
    
    // 3. Save to GitHub
    await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      },
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
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    
    if (!res.ok) return []
    
    const data = await res.json()
    const content = Buffer.from(data.content, 'base64').toString()
    const users = JSON.parse(content || '{}')
    
    // Return array of chat IDs
    return Object.keys(users).map(id => ({ chat_id: id }))
  } catch(e) {
    return []
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
    } catch(e) {
      // silent
    }
  }
  
  await sendTG(adminId, `✅ Selesai\nBerhasil: ${success}\nTotal: ${users.length}`)
}

// Main handler
export default async function handler(req, res) {
  // GET untuk test
  if (req.method === 'GET') {
    return res.status(200).json({ 
      bot: '@Cekidtelegrambimxyz_bot',
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
      
      // Simpan user (private only)
      if (chatType === 'private') {
        saveUser(chatId, userInfo)
      }
      
      // Handle commands
      if (text === '/start') {
        await sendTG(chatId, 
          '✨ <b>Bot ID Telegram</b>\n\n' +
          'Perintah:\n' +
          '• /start - Menu\n' +
          '• /cekid - Lihat ID\n' +
          '• /cekidch - ID channel\n' +
          '• /cekidgr - ID grup'
        )
      }
      else if (text === '/cekid') {
        await sendTG(chatId, `ID Anda: <code>${chatId}</code>`)
      }
      else if (text === '/cekidch') {
        const msg = chatType === 'channel' 
          ? `ID Channel: <code>${chatId}</code>`
          : '❌ Hanya untuk channel'
        await sendTG(chatId, msg)
      }
      else if (text === '/cekidgr') {
        const msg = chatType.endsWith('group')
          ? `ID Grup: <code>${chatId}</code>`
          : '❌ Hanya untuk grup'
        await sendTG(chatId, msg)
      }
      else if (text.startsWith('/broadcast')) {
        if (String(chatId) === ADMIN_ID) {
          await handleBroadcast(chatId, text)
        } else {
          await sendTG(chatId, '❌ Perintah tidak dikenal')
        }
      }
    }
    
    return res.status(200).json({ ok: true })
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
      }

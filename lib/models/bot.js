const assert = require('http-assert')
const casual = require('casual')
const { wait } = require('./../utils')

class Bot {
  constructor (server, token, info = {}) {
    this.server = server
    this.info = {
      id: casual.integer(1000000, 10000000),
      is_bot: true,
      username: `${casual.username}_bot`,
      first_name: casual.first_name,
      last_name: casual.last_name,
      language_code: 'en_US',
      ...info
    }
    this.token = token || `${this.info.id}:${casual.uuid}`
    this.queue = []
    this.lastUpdateId = 0
    this.methods = {
      getme: () => this.info,
      getupdates: async (payload) => {
        const offset = parseInt(payload.offset) || 0
        this.queue = this.queue.filter((update) => update.update_id > offset)
        const updates = this.queue.slice(0, parseInt(payload.limit) || 100)
        if (updates.length === 0) {
          await wait()
        }
        return updates
      },
      getchat: (payload) => {
        const chat = this.server.findChat(payload.chat_id)
        assert(chat && chat.hasAccess(this.info.id), 400, 'Bad Request: chat not found')
        return chat.info
      },
      leavechat: (payload) => {
        const chat = this.server.findChat(payload.chat_id)
        assert(chat && chat.hasAccess(this.info.id), 400, 'Bad Request: chat not found')
        chat.leave(this.info.id)
      },
      sendmessage: (payload) => {
        const chat = this.server.findChat(payload.chat_id)
        assert(chat && chat.hasAccess(this.info.id), 400, 'Bad Request: chat not found')
        return chat.postMessage(this, payload)
      }
    }
  }

  queueUpdate (update) {
    this.lastUpdateId++
    this.queue.push({
      update_id: this.lastUpdateId,
      ...update
    })
  }

  handleCall (method, payload) {
    return this.methods[method] && this.methods[method](payload)
  }
}

module.exports = Bot
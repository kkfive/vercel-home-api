import { StringSession } from 'telegram/sessions/index.js'
import { TelegramClient } from 'telegram'
const apiId = process.env.TG_API_ID
const apiHash = process.env.TG_API_HASH
const stringSession = new StringSession(process.env.TG_SESSION_STRING)

export default async function getTgClient() {
  const client = new TelegramClient(stringSession, Number(apiId), apiHash, {
    connectionRetries: 5,
  })
  await client.connect()
  return client
}

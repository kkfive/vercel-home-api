import dayjs from 'dayjs'
import { NextResponse, NextRequest } from 'next/server'
import getTgClient from '@/lib/tg-client'
import { Api } from 'telegram'
import validateSchema from './validate'
import { validateRequest } from '@/lib/validate-request'

export async function GET(request: NextRequest) {
  try {

    const validate = await validateRequest(validateSchema, request)

    if ((validate as { error: string }).error) {
      return NextResponse.json({ error: (validate as { error: string }).error }, { status: 400 })
    }

    const query = request.nextUrl.searchParams
    const client = await getTgClient()
    const channel = await client.getInputEntity(query.get('channel') as string) as Api.InputPeerChannel
    const messages = await client.getMessages(channel)
    const userMessages = messages.filter(message => message.className === 'Message')
    const result = userMessages.map((message) => {
      const markdownMessage = formatMessage(message.message, message?.entities ?? null)

      return {
        id: message.id,
        date: dayjs(message.date * 1000).format('YYYY-MM-DD HH:mm:ss'),
        updatedAt: dayjs(message.date * 1000).format('YYYY-MM-DD HH:mm:ss'),
        message: markdownMessage,
        views: message.views,
        replyCount: message?.replies?.replies || null,
        reactions: (message?.reactions?.results?.map(reaction => ({
          reaction: (reaction.reaction as { emoticon: string })?.emoticon,
          count: reaction.count,
        }))) || [],
        title: dayjs(message.date * 1000).format('MM-DD'),
        // media: message.media,
        entities: message?.entities ?? null,
      }
    })

    // 按年份分组
    const groupedByYear = result.filter(messages => messages.message).reduce((acc, message) => {
      const year = dayjs(message.date).year()
      if (!acc[year]) {
        acc[year] = []
      }
      acc[year].push(message)
      return acc
    }, {} as Record<string, typeof result>)

    return NextResponse.json(groupedByYear)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}



function formatMessage(message: string, entities: Api.TypeMessageEntity[] | null) {
  if (!entities || entities.length === 0)
    return message

  // 按照 offset 从大到小排序，这样我们可以从后向前处理，避免 offset 位置变化
  const sortedEntities = [...entities].sort((a, b) => b.offset - a.offset)
  let result = message

  for (const entity of sortedEntities) {
    const { offset, length } = entity
    const start = offset
    const end = offset + length
    const textSegment = result.slice(start, end)

    // 如果是 URL 类型，检查是否已在 markdown 格式中
    if ((entity.className === 'MessageEntityUrl' || entity.className === 'MessageEntityTextUrl')
      && isInMarkdownLink(start, result)) {
      continue
    }

    switch (entity.className) {
      case 'MessageEntityBold':
        result = `${result.slice(0, start)}**${textSegment}**${result.slice(end)}`
        break
      case 'MessageEntityUnderline':
        // result = `${result.slice(0, start)}<u>${textSegment}</u>${result.slice(end)}`
        break
      case 'MessageEntityStrike':
        result = `${result.slice(0, start)}~~${textSegment}~~${result.slice(end)}`
        break
      case 'MessageEntityTextUrl':
        if ('url' in entity)
          result = `${result.slice(0, start)}[${textSegment}](${entity.url})${result.slice(end)}`
        break
      case 'MessageEntityUrl':
        result = `${result.slice(0, start)}[${textSegment}](${textSegment})${result.slice(end)}`
        break
      case 'MessageEntityBlockquote':
        result = `${result.slice(0, start)}> ${textSegment}${result.slice(end)}`
        break
      case 'MessageEntityPre':
        result = `${result.slice(0, start)}\`\`\`${entity.language}\n${textSegment}\n\`\`\`${result.slice(end)}`
        break
      case 'MessageEntityCode':
        result = `${result.slice(0, start)}\`${textSegment}\`${result.slice(end)}`
        break
    }
  }

  return result
}
// 检查给定位置是否在 markdown 链接或图片格式中
function isInMarkdownLink(position: number, text: string): boolean {
  // 获取包含当前位置的上下文
  const contextStart = Math.max(0, position - 100)
  const contextEnd = Math.min(text.length, position + 100)
  const contextText = text.slice(contextStart, contextEnd)
  const relativePosition = position - contextStart

  // 匹配 markdown 链接格式
  const linkRegex = /!?\[([^\]]*)\]\([^)]+\)/g
  let match: RegExpExecArray | null


  while (match = linkRegex.exec(contextText)) {
    const matchStart = match.index
    const matchEnd = matchStart + match[0].length

    // 检查位置是否在整个 markdown 链接内
    if (relativePosition >= matchStart && relativePosition <= matchEnd) {
      // 检查位置是否在 URL 部分
      const textPartEnd = matchStart + 2 + match[1].length // +2 for '![' or '['

      // 如果位置在文本部分之后，说明在 URL 部分
      if (relativePosition > textPartEnd) {
        return true
      }
    }
  }

  return false
}


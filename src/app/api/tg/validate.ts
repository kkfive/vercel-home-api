import { z } from 'zod'

const whiteList = ['-1002472833194']

const validate = z.object({
  channel: z.string({ required_error: '请填写正确的频道ID' }).refine((val) => whiteList.includes(val), {
    message: '请填写正确的频道ID',
  }),
})  

export default validate

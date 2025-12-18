import z, { any, date } from 'zod'

export const MessageRes = z
  .object({
    message: z.string()
  })
  .strict()

export type MessageResType = z.TypeOf<typeof MessageRes>

export const IsSucceedRes = z.object({
  isSucceed: z.boolean()
}).strict()

export const CommonRes = z
  .object({
    status: z.any(),
    message: z.string(),
    data: z.any()
  })
  .strict()
export type CommonResType = z.TypeOf<typeof CommonRes>

export const PagingBody = z
  .object({
    paging: z.object({
      pageNum: z.number().optional(),
      pageSize: z.number().optional(),
    })
  })
  .strict()
export type PagingBodyType = z.TypeOf<typeof PagingBody>
export const PagingRes = z
  .object({
    paging: z.object({
      pageNum: z.number(),
      pageSize: z.number(),
      pageCount: z.number(),
    })
  })
  .strict()
export type PagingResType = z.TypeOf<typeof PagingRes>
import { toApiError } from '@/api/errors'
import http from '@/api/http'
import type { components } from '@/api/schema'

// 类型直接取自 OpenAPI 生成结果，避免手写 DTO 与后端契约漂移。
export type Tag = components['schemas']['Tag']

// 后端 create/update 请求体复用同一个序列化器，因此可写字段从 Tag 中挑选。
export type TagInput = Pick<components['schemas']['Tag'], 'name' | 'color'>

type TagListResponse = components['schemas']['PaginatedTagList']

/** 获取当前用户的全部标签，顺序由后端默认排序与分页游标决定。 */
export async function list(): Promise<Tag[]> {
  try {
    const tags: Tag[] = []
    let nextPage: string | null = '/tags/'
    while (nextPage !== null) {
      const response = await http.get<TagListResponse>(nextPage)
      const data: TagListResponse = response.data
      tags.push(...data.results)
      nextPage = data.next ?? null
    }
    return tags
  } catch (error: unknown) {
    throw toApiError(error)
  }
}

/** 新建标签。 */
export async function create(input: TagInput): Promise<Tag> {
  try {
    const { data } = await http.post<Tag>('/tags/', input)
    return data
  } catch (error: unknown) {
    throw toApiError(error)
  }
}

/** 局部更新标签名称或颜色。 */
export async function update(id: Tag['id'], input: Partial<TagInput>): Promise<Tag> {
  try {
    const { data } = await http.patch<Tag>(`/tags/${String(id)}/`, input)
    return data
  } catch (error: unknown) {
    throw toApiError(error)
  }
}

/** 删除标签；后端只解除实体关联，不删除关联的便签、待办或日程。 */
export async function remove(id: Tag['id']): Promise<void> {
  try {
    await http.delete(`/tags/${String(id)}/`)
  } catch (error: unknown) {
    throw toApiError(error)
  }
}

import { toApiError } from '@/api/errors'
import http from '@/api/http'
import type { components } from '@/api/schema'

// 类型直接取自 OpenAPI 生成结果，避免手写 DTO 与后端契约漂移。
// 摘要序列化器的颜色字段在 schema 中是宽泛 string，这里收窄到标签色板，与 Tag 保持一致。
export type TagSummary = Omit<components['schemas']['TagSummary'], 'color'> & {
  readonly color: components['schemas']['Tag']['color']
}

type StickyNoteSchema = components['schemas']['StickyNote']

/** 读接口必然返回标题、正文与底色；生成类型因序列化器允许空值而标为可选，故在此收窄。 */
type StickyNoteReadFields = 'title' | 'content' | 'color'

export type StickyNote = Omit<StickyNoteSchema, StickyNoteReadFields | 'tags'> &
  Required<Pick<StickyNoteSchema, StickyNoteReadFields>> & {
    readonly tags: TagSummary[]
  }

// 写请求体复用同一个序列化器，因此可写字段从生成类型中挑选。
export type StickyNoteInput = Required<
  Pick<StickyNoteSchema, 'title' | 'content' | 'color' | 'tag_ids'>
>

export interface StickyNoteFilters {
  tag: number | null
  search: string
  is_archived: boolean
  ordering: StickyNoteOrdering
}

export type StickyNoteOrdering = '-is_pinned,position' | 'position' | '-updated_at'

type PaginatedStickyNoteList = Omit<components['schemas']['PaginatedStickyNoteList'], 'results'> & {
  results: StickyNote[]
}

// 转换结果里的待办类型取自响应体的 ``todo`` 字段，避免与后端契约脱节。
export type ConvertedTodo = components['schemas']['StickyNoteConvertToTodoResult']['todo']

export type ConvertStickyNoteInput = components['schemas']['StickyNoteConvertToTodo']

export type ConvertStickyNoteResult = Omit<
  components['schemas']['StickyNoteConvertToTodoResult'],
  'sticky_note' | 'todo'
> & {
  readonly sticky_note: StickyNote
  readonly todo: ConvertedTodo
}

/** 获取筛选后的全部便签，自动跟随分页游标。 */
export async function list(filters: StickyNoteFilters): Promise<StickyNote[]> {
  try {
    const notes: StickyNote[] = []
    const params: Record<string, number | string> = {
      is_archived: String(filters.is_archived),
      ordering: filters.ordering,
    }
    if (filters.tag !== null) {
      params['tag'] = filters.tag
    }
    if (filters.search.trim() !== '') {
      params['search'] = filters.search.trim()
    }

    let nextPage: string | null = '/sticky-notes/'
    let firstPage = true
    while (nextPage !== null) {
      // 显式标注响应形状：next 游标由服务端返回，否则初始化器会形成自引用推断。
      const response: { data: PaginatedStickyNoteList } = firstPage
        ? await http.get<PaginatedStickyNoteList>(nextPage, { params })
        : await http.get<PaginatedStickyNoteList>(nextPage)
      notes.push(...response.data.results)
      nextPage = response.data.next ?? null
      firstPage = false
    }
    return notes
  } catch (error: unknown) {
    throw toApiError(error)
  }
}

/** 读取单张便签。 */
export async function get(id: StickyNote['id']): Promise<StickyNote> {
  try {
    const { data } = await http.get<StickyNote>(`/sticky-notes/${String(id)}/`)
    return data
  } catch (error: unknown) {
    throw toApiError(error)
  }
}

/** 新建便签。 */
export async function create(input: StickyNoteInput): Promise<StickyNote> {
  try {
    const { data } = await http.post<StickyNote>('/sticky-notes/', input)
    return data
  } catch (error: unknown) {
    throw toApiError(error)
  }
}

/** 局部更新便签内容、颜色、标签或状态。 */
export async function update(
  id: StickyNote['id'],
  input: Partial<StickyNoteInput> & Partial<Pick<StickyNote, 'is_pinned' | 'is_archived'>>,
): Promise<StickyNote> {
  try {
    const { data } = await http.patch<StickyNote>(`/sticky-notes/${String(id)}/`, input)
    return data
  } catch (error: unknown) {
    throw toApiError(error)
  }
}

/** 删除便签。 */
export async function remove(id: StickyNote['id']): Promise<void> {
  try {
    await http.delete(`/sticky-notes/${String(id)}/`)
  } catch (error: unknown) {
    throw toApiError(error)
  }
}

/** 以完整扁平顺序持久化位置，响应式分列不改变契约。 */
export async function reorder(orderedIds: number[]): Promise<void> {
  try {
    await http.post('/sticky-notes/reorder/', { ordered_ids: orderedIds })
  } catch (error: unknown) {
    throw toApiError(error)
  }
}

/** 将来源便签转换为待办，并接收两个实体的服务端最新状态。 */
export async function convertToTodo(
  id: StickyNote['id'],
  input: ConvertStickyNoteInput = {},
): Promise<ConvertStickyNoteResult> {
  try {
    const { data } = await http.post<ConvertStickyNoteResult>(
      `/sticky-notes/${String(id)}/convert-to-todo/`,
      input,
    )
    return data
  } catch (error: unknown) {
    throw toApiError(error)
  }
}

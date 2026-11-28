import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import TagToolbar from '@/components/tags/TagToolbar.vue'
import CalendarView from '@/views/CalendarView.vue'
import TodosView from '@/views/TodosView.vue'

const cases = [
  {
    name: '待办',
    component: TodosView,
    title: '待办',
    description: '待办功能将在后续阶段提供。',
  },
  {
    name: '日历',
    component: CalendarView,
    title: '日历',
    description: '日历功能将在后续阶段提供。',
  },
]

describe('业务空态视图', () => {
  it.each(cases)(
    '$name 展示空态文案并同步标签筛选值',
    async ({ component, title, description }) => {
      const wrapper = mount(component, {
        global: {
          stubs: {
            TagToolbar: {
              props: ['modelValue'],
              emits: ['update:modelValue'],
              template: '<div data-test="tag-toolbar" />',
            },
          },
        },
      })

      expect(wrapper.text()).toContain(title)
      expect(wrapper.text()).toContain(description)
      const toolbar = wrapper.findComponent(TagToolbar)
      expect(toolbar.exists()).toBe(true)
      toolbar.vm.$emit('update:modelValue', 1)
      await nextTick()
      expect(toolbar.props('modelValue')).toBe(1)
    },
  )
})

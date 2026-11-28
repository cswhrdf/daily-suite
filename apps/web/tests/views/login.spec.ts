import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import LoginView from '@/views/LoginView.vue'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  replace: vi.fn(),
  query: {},
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ login: mocks.login }),
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRoute: () => ({ query: mocks.query }),
    useRouter: () => ({ replace: mocks.replace }),
  }
})

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function mountLogin(): VueWrapper {
  return mount(LoginView)
}

async function fillCredentials(wrapper: VueWrapper): Promise<void> {
  await wrapper.find('input[autocomplete="username"]').setValue('alice')
  await wrapper.find('input[autocomplete="current-password"]').setValue('secret')
}

beforeEach(() => {
  mocks.login.mockReset()
  mocks.replace.mockReset()
  mocks.query = {}
  mocks.replace.mockResolvedValue(undefined)
})

describe('LoginView', () => {
  it.each([
    { redirect: '/todos', expected: '/todos' },
    { redirect: undefined, expected: '/' },
  ])('登录成功后跳转 $expected', async ({ redirect, expected }) => {
    mocks.query = redirect === undefined ? {} : { redirect }
    const request = deferred<undefined>()
    mocks.login.mockReturnValue(request.promise)
    const wrapper = mountLogin()
    const inputs = wrapper.findAll('input')
    expect(inputs).toHaveLength(2)
    expect(inputs.every((input) => input.element.required)).toBe(true)
    await fillCredentials(wrapper)

    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('.v-card').classes()).toContain('v-card--loading')
    expect(mocks.login).toHaveBeenCalledWith({ username: 'alice', password: 'secret' })

    request.resolve(undefined)
    await flushPromises()
    expect(mocks.replace).toHaveBeenCalledWith(expected)
    expect(wrapper.find('.v-card').classes()).not.toContain('v-card--loading')
    expect(wrapper.find('.v-alert').exists()).toBe(false)
    wrapper.unmount()
  })

  it('登录失败展示错误并恢复提交状态', async () => {
    mocks.login.mockRejectedValue(new Error('invalid credentials'))
    const wrapper = mountLogin()
    await fillCredentials(wrapper)

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.v-alert').text()).toContain('用户名或密码错误，请重试。')
    expect(mocks.replace).not.toHaveBeenCalled()
    expect(wrapper.find('.v-card').classes()).not.toContain('v-card--loading')
    wrapper.unmount()
  })
})

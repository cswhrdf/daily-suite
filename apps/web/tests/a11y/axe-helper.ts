import type { AxeResults, RunOptions } from 'axe-core'
import { expect } from 'vitest'
import { axe } from 'vitest-axe'
// 包根目录的 `matchers.d.ts` 是 `export type *`，在 verbatimModuleSyntax 下会被当成纯类型，
// 因此直接从 dist 入口取运行时实现。
import { toHaveNoViolations } from 'vitest-axe/dist/matchers'

// vitest-axe 的 `vitest-axe/extend-expect` 只提供类型增强（运行时为空文件），
// 因此匹配器必须在这里显式注册，且模块级执行即可保证一次注册、重复导入无害。
expect.extend({ toHaveNoViolations })

/**
 * vitest-axe 未对 Vitest 5 的 `Assertion` 做类型增强（只声明了旧的 `Vi` 命名空间），
 * 这里用局部接口描述已注册的匹配器，避免为 `Assertion<T = any>` 做接口合并时
 * 引入 `any` 与空接口。
 */
interface A11yAssertions {
  toHaveNoViolations: () => void
}

/**
 * 对给定 DOM 容器（或 HTML 字符串）运行 axe-core，并断言没有任何可访问性违规。
 *
 * @param container 待扫描的根节点，通常是 `wrapper.element` 或 `document.body`
 * @param options axe-core 运行参数，可按需关闭在 DOM 模拟环境里不可靠的规则
 */
export async function expectNoA11yViolations(
  container: Element | string,
  options?: RunOptions,
): Promise<AxeResults> {
  const results = await axe(container, options)
  const assertions = expect(results) as unknown as A11yAssertions
  assertions.toHaveNoViolations()
  return results
}

/**
 * happy-dom 环境下单元测试的默认 axe 参数。
 *
 * `color-contrast` 依赖真实布局与渲染后的颜色计算，happy-dom 不实现布局，
 * 该规则只会产出「incomplete」或误报，因此在组件测试里统一关闭；
 * 对比度留给 Playwright 的真实浏览器扫描（见 `e2e/a11y.spec.ts`）。
 */
export const componentAxeOptions: RunOptions = {
  rules: {
    'color-contrast': { enabled: false },
  },
}

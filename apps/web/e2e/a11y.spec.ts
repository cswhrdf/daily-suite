import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * 真实浏览器里的 a11y 扫描。
 *
 * mock 模式下 Prism 对 `/api/auth/refresh/` 返回 200，守卫判定会话已恢复，
 * 因此首页即最终落地页（与 `login.spec.ts` 的已登录初态一致），直接扫 `/`。
 *
 * 阈值：只拦截 `serious` / `critical`。`minor` / `moderate` 多为
 * 颜色对比度、地标细节等偏展示层的问题，先作为报告信息输出而不阻断流水线。
 */
test('首页无 serious / critical 级可访问性违规', async ({ page }) => {
  await page.goto('/')

  // 等首页内容渲染完成再扫描，避免扫到空壳导致漏检。
  await expect(page.getByText('Daily Suite 前端脚手架')).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  // 反向保护：确认扫描确实跑完了规则，避免页面空白导致「零违规」的假通过。
  expect(results.passes.length).toBeGreaterThan(0)

  const blocking = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  )

  // 输出可读的失败信息：规则 id + 影响节点数。
  const summary = blocking.map(
    (violation) =>
      `${violation.id} (${violation.impact ?? 'unknown'}, ${String(violation.nodes.length)} node(s)): ${violation.help}`,
  )

  expect(summary).toEqual([])
})

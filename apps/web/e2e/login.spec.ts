import { expect, test } from '@playwright/test'

/**
 * 会话初态最小冒烟：mock 模式下 Prism 对 `/api/auth/refresh/` 返回 200，
 * 路由守卫据此判定会话已恢复，访问 `/login` 会被重定向到首页。
 *
 * 因此用例只断言「被重定向到首页且首页内容渲染」，不依赖真实后端。
 */
test('已登录初态下访问 /login 重定向到首页', async ({ page }) => {
  await page.goto('/login')

  // 守卫跳回首页：URL 归一为根路径。
  await expect(page).toHaveURL(/\/$/)

  await expect(page.getByText('Daily Suite 前端脚手架')).toBeVisible()
  await expect(page.getByRole('button', { name: '主按钮' })).toBeVisible()
})

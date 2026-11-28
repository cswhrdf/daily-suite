import { reactive } from 'vue'

import i18n from '@/i18n'

export type SnackbarTone = 'success' | 'error' | 'info'

interface SnackbarState {
  visible: boolean
  message: string
  tone: SnackbarTone
  timeout: number
  actionLabel: string
  onAction: (() => void) | null
}

const state = reactive<SnackbarState>({
  visible: false,
  message: '',
  tone: 'info',
  timeout: 4000,
  actionLabel: '',
  onAction: null,
})

function show(message: string, tone: SnackbarTone, timeout: number): void {
  state.message = message
  state.tone = tone
  state.timeout = timeout
  state.actionLabel = ''
  state.onAction = null
  state.visible = true
}

function showSuccess(message: string): void {
  show(message, 'success', 3000)
}

/** 成功提示附带一个明确的后续导航动作。 */
function showSuccessAction(message: string, actionLabel: string, onAction: () => void): void {
  show(message, 'success', 6000)
  state.actionLabel = actionLabel
  state.onAction = onAction
}

/** 乐观更新失败并回滚后，用统一的错误样式告知用户。 */
function showRollbackError(message: string): void {
  show(message, 'error', 6000)
}

function showUndo(message: string, onUndo: () => void): void {
  show(message, 'info', 6000)
  state.actionLabel = i18n.global.t('snackbar.undo')
  state.onAction = onUndo
}

function dismiss(): void {
  state.visible = false
}

function runAction(): void {
  const action = state.onAction
  dismiss()
  action?.()
}

/** 全局提示的最小 API：成功、失败回滚与撤销。 */
export function useSnackbar(): {
  success: typeof showSuccess
  successAction: typeof showSuccessAction
  rollback: typeof showRollbackError
  undo: typeof showUndo
} {
  return {
    success: showSuccess,
    successAction: showSuccessAction,
    rollback: showRollbackError,
    undo: showUndo,
  }
}

/** 仅供全局展示组件与测试读取的同一份响应式状态。 */
export function useSnackbarState(): {
  state: typeof state
  dismiss: () => void
  runAction: () => void
} {
  return {
    state,
    dismiss,
    runAction,
  }
}

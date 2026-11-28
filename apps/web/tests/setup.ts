import { config } from '@vue/test-utils'

import i18n from '@/i18n'
import vuetify from '@/plugins/vuetify'

// happy-dom 未实现 visualViewport，Vuetify 的 VOverlay 位置策略会读取并抛 ReferenceError。
if (typeof globalThis.visualViewport === 'undefined') {
  Object.defineProperty(globalThis, 'visualViewport', {
    configurable: true,
    value: {
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      width: 0,
      height: 0,
      scale: 1,
      onscroll: null,
      onresize: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    },
  })
}

// 组件测试统一使用应用级 Vuetify 与 i18n，具体测试仅补充 Pinia、Router 等依赖。
config.global.plugins = [vuetify, i18n]

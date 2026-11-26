<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const username = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

/**
 * 提交登录表单。
 *
 * 成功后 Access Token 进入内存、Refresh Token 由后端写入 httpOnly Cookie，
 * 随后回到守卫记录的原始地址（缺省为首页）。
 */
async function submit(): Promise<void> {
  errorMessage.value = ''
  isLoading.value = true
  try {
    await auth.login({ username: username.value, password: password.value })
    const redirectParam = route.query['redirect']
    const redirect = typeof redirectParam === 'string' ? redirectParam : '/'
    await router.replace(redirect)
  } catch {
    errorMessage.value = '用户名或密码错误，请重试。'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <v-container class="fill-height" max-width="520">
    <v-row align="center" justify="center">
      <v-col cols="12">
        <v-card :loading="isLoading" elevation="4" rounded="lg">
          <v-card-title class="text-h5">登录 Daily Suite</v-card-title>
          <v-card-text>
            <v-alert
              v-if="errorMessage !== ''"
              class="mb-4"
              density="compact"
              :text="errorMessage"
              type="error"
            />
            <v-form @submit.prevent="submit">
              <v-text-field
                v-model="username"
                autocomplete="username"
                label="用户名"
                prepend-inner-icon="mdi-account"
                required
              />
              <v-text-field
                v-model="password"
                autocomplete="current-password"
                label="密码"
                prepend-inner-icon="mdi-lock"
                required
                type="password"
              />
              <v-btn
                block
                class="mt-2"
                color="primary"
                :loading="isLoading"
                type="submit"
                variant="flat"
              >
                登录
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

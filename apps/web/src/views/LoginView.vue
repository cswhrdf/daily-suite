<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

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
    errorMessage.value = t('login.error')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <v-container class="fill-height" max-width="520">
    <v-row align="center" justify="center">
      <v-col cols="12">
        <v-card elevation="4" :loading="isLoading" rounded="lg">
          <v-card-title class="text-h5">{{ t('login.title') }}</v-card-title>
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
                :label="t('login.username')"
                prepend-inner-icon="mdi-account"
                required
              />
              <v-text-field
                v-model="password"
                autocomplete="current-password"
                :label="t('login.password')"
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
                {{ t('login.submit') }}
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

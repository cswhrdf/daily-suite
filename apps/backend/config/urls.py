"""URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/

Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))

"""

from django.contrib import admin
from django.urls import path
from drf_spectacular.views import SpectacularAPIView

from config.auth_views import LoginView, LogoutView, RefreshView
from config.views import EchoView, health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health, name="health"),
    # 容器编排 / 反向代理统一探活路径（nginx.conf 与 compose healthcheck 均指向 /healthz）。
    # 刻意不带末尾斜杠：探针不会因 APPEND_SLASH 收到 301，nginx 的精确匹配也能直接命中。
    path("healthz", health, name="healthz"),
    path("api/auth/login/", LoginView.as_view(), name="auth-login"),
    path("api/auth/refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("api/auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("api/echo/", EchoView.as_view(), name="echo"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
]

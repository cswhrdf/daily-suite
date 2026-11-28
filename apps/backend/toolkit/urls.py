"""toolkit 应用的路由。

当前尚无业务视图集，路由器只产出 API 根视图；
后续把业务 ViewSet 注册到 router 上即可自动获得带尾斜杠的标准路由。
"""

from rest_framework.routers import DefaultRouter

router = DefaultRouter()

urlpatterns = router.urls

"""toolkit 应用的路由。

业务视图集注册到 ``DefaultRouter`` 后自动获得带尾斜杠的标准路由，
与全局 ``APPEND_SLASH`` 行为一致。
"""

from rest_framework.routers import DefaultRouter

from toolkit.views import TagViewSet

router = DefaultRouter()
# 显式指定 basename，保证路由名固定为 tag-list / tag-detail，不随模型类名变化。
router.register("tags", TagViewSet, basename="tag")

urlpatterns = router.urls

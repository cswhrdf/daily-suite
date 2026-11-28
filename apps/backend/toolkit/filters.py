"""toolkit 应用的过滤器模块。

列表接口的查询参数集中在此声明，便于把「参数名」与「模型字段名」不一致的场景
（如 ``tag`` 对应 ``tags`` 关联表）显式表达出来，而不用在视图里手写查询参数解析。
"""

from __future__ import annotations

import django_filters

from toolkit.models.sticky_note import StickyNote


# django-filter 26.2 未附带 py.typed，mypy 因此把 FilterSet 视作 Any；
# 这里只对继承语句局部忽略该告警，字段声明与查询行为仍按运行期契约使用。
class StickyNoteFilterSet(django_filters.FilterSet):  # type: ignore[misc]
    """便签列表过滤器。

    归档状态按 ``is_archived`` 精确过滤；``tag`` 接收标签主键，
    按标签关联表筛选，``distinct`` 避免同一便签命中多个标签时出现重复行。
    """

    tag = django_filters.NumberFilter(field_name="tags", distinct=True)

    class Meta:
        """过滤器元信息：模型级字段按归档状态精确过滤，参数别名由显式字段提供。"""

        model = StickyNote
        fields = ("is_archived",)

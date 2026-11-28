"""toolkit 应用的模型包。

Django 只在应用加载时导入本包，因此各功能模块的模型文件必须在此显式导入，
否则模型不会注册到应用的模型注册表里，迁移与 ORM 都看不到它们。
"""

from . import event, sticky_note, tag, todo

__all__ = ["event", "sticky_note", "tag", "todo"]

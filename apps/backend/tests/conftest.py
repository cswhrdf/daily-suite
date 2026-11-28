"""pytest 全局夹具：提供用户工厂与已认证的 API 客户端，供业务用例复用。

本模块只依赖已有的 factory-boy 与 DRF 测试工具，不引入新的测试依赖；
夹具统一走 ``APIClient.force_authenticate``，从而不经过登录接口与 Cookie，
让业务用例专注于被测的视图逻辑。
"""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from factory.declarations import Sequence
from factory.django import DjangoModelFactory, Password
from rest_framework.test import APIClient

User = get_user_model()

# 用户工厂的默认口令：仅用于测试，不参与生产认证流程。
FACTORY_PASSWORD = "factory-test-password"  # noqa: S105 - 测试专用固定口令


class UserFactory(DjangoModelFactory[User]):  # type: ignore[valid-type]
    """创建可正常设置密码的测试用户。

    ``get_user_model()`` 在运行期返回具体用户模型，无法直接作为类型参数使用，
    故对泛型参数加忽略注释；工厂本身仍按项目实际使用的用户模型建对象。
    """

    # factory-boy 的声明式助手尚未补全类型注解，strict 模式下需忽略其调用告警。
    username = Sequence(lambda n: f"user{n}")  # type: ignore[no-untyped-call]
    # Password 会在创建时用 Django 的 make_password 哈希，用户因此能直接通过认证；
    # 它属于普通声明而非 post-generation 钩子，不会触发额外的二次保存。
    password = Password(FACTORY_PASSWORD)  # type: ignore[no-untyped-call]

    class Meta:
        """工厂元信息：绑定到项目实际使用的用户模型。"""

        model = User


@pytest.fixture
def auth_user(db: None) -> User:  # type: ignore[valid-type]  # noqa: ARG001 - 依赖 db 夹具开启数据库访问
    """创建并返回一名已写入数据库的测试用户。"""
    return UserFactory.create()


@pytest.fixture
def auth_client(auth_user: User) -> APIClient:  # type: ignore[valid-type]
    """返回已通过 ``force_authenticate`` 认证的 DRF API 客户端。"""
    client = APIClient()
    client.force_authenticate(user=auth_user)
    return client

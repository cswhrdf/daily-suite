"""全局标签接口测试：CRUD、跨用户隔离、唯一性、受控色板、搜索与排序。"""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from toolkit.models.tag import TAG_COLOR_CHOICES, Tag

PRIMARY_COLOR = TAG_COLOR_CHOICES[0]
SECONDARY_COLOR = TAG_COLOR_CHOICES[1]


def create_tag(owner: User, name: str = "工作", color: str = PRIMARY_COLOR) -> Tag:
    """直接经 ORM 建一条标签，供需要预置数据的用例复用。"""
    return Tag.objects.create(owner=owner, name=name, color=color)


def create_other_client() -> APIClient:
    """创建另一名用户，并返回以其身份认证的客户端。"""
    other = User.objects.create_user(username="other", password="pw")  # noqa: S106 - 测试专用口令
    client = APIClient()
    client.force_authenticate(user=other)
    return client


@pytest.mark.django_db
def test_list_requires_authentication() -> None:
    response = APIClient().get(reverse("tag-list"))

    assert response.status_code == 401


@pytest.mark.django_db
def test_create_tag_sets_owner_and_returns_read_only_fields(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    response = auth_client.post(
        reverse("tag-list"),
        {"name": "工作", "color": PRIMARY_COLOR},
        format="json",
    )

    assert response.status_code == 201
    payload = response.json()
    assert set(payload) == {"id", "name", "color", "created_at", "updated_at"}
    assert payload["name"] == "工作"
    assert payload["color"] == PRIMARY_COLOR
    assert Tag.objects.get(pk=payload["id"]).owner == auth_user


@pytest.mark.django_db
def test_create_tag_with_same_name_for_other_user_is_allowed(auth_user: User) -> None:
    create_tag(auth_user, name="工作")

    response = create_other_client().post(
        reverse("tag-list"),
        {"name": "工作", "color": PRIMARY_COLOR},
        format="json",
    )

    assert response.status_code == 201
    assert Tag.objects.filter(name="工作").count() == 2


@pytest.mark.django_db
def test_create_duplicate_name_returns_chinese_error(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    create_tag(auth_user, name="工作")

    response = auth_client.post(
        reverse("tag-list"),
        {"name": "工作", "color": SECONDARY_COLOR},
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["name"] == ["当前用户下已存在同名标签。"]


@pytest.mark.django_db
def test_create_with_invalid_color_returns_chinese_error(auth_client: APIClient) -> None:
    response = auth_client.post(
        reverse("tag-list"),
        {"name": "工作", "color": "#000000"},
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["color"] == ["颜色不在受控色板内，请选择允许的颜色值。"]
    assert not Tag.objects.exists()


@pytest.mark.django_db
def test_list_returns_only_own_tags_sorted_by_name(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    create_tag(auth_user, name="beta")
    create_tag(auth_user, name="alpha")
    create_tag(User.objects.create_user(username="other2", password="pw"), name="gamma")  # noqa: S106

    response = auth_client.get(reverse("tag-list"))

    assert response.status_code == 200
    assert response.json()["count"] == 2
    assert [item["name"] for item in response.json()["results"]] == ["alpha", "beta"]


@pytest.mark.django_db
def test_retrieve_own_tag(auth_client: APIClient, auth_user: User) -> None:
    tag = create_tag(auth_user)

    response = auth_client.get(reverse("tag-detail", args=[tag.pk]))

    assert response.status_code == 200
    assert response.json()["name"] == tag.name


@pytest.mark.django_db
def test_retrieve_other_users_tag_returns_404(auth_client: APIClient) -> None:
    other_tag = create_tag(User.objects.create_user(username="other3", password="pw"))  # noqa: S106

    response = auth_client.get(reverse("tag-detail", args=[other_tag.pk]))

    assert response.status_code == 404


@pytest.mark.django_db
def test_update_tag(auth_client: APIClient, auth_user: User) -> None:
    tag = create_tag(auth_user, name="工作")

    response = auth_client.patch(
        reverse("tag-detail", args=[tag.pk]),
        {"name": "生活", "color": SECONDARY_COLOR},
        format="json",
    )

    assert response.status_code == 200
    tag.refresh_from_db()
    assert tag.name == "生活"
    assert tag.color == SECONDARY_COLOR


@pytest.mark.django_db
def test_update_tag_keeping_same_name_is_allowed(auth_client: APIClient, auth_user: User) -> None:
    tag = create_tag(auth_user, name="工作")

    response = auth_client.patch(
        reverse("tag-detail", args=[tag.pk]),
        {"name": "工作", "color": SECONDARY_COLOR},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["color"] == SECONDARY_COLOR


@pytest.mark.django_db
def test_update_tag_to_existing_name_returns_400(auth_client: APIClient, auth_user: User) -> None:
    tag = create_tag(auth_user, name="工作")
    create_tag(auth_user, name="生活")

    response = auth_client.patch(
        reverse("tag-detail", args=[tag.pk]),
        {"name": "生活"},
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["name"] == ["当前用户下已存在同名标签。"]


@pytest.mark.django_db
def test_update_other_users_tag_returns_404(auth_client: APIClient) -> None:
    other_tag = create_tag(User.objects.create_user(username="other4", password="pw"))  # noqa: S106

    response = auth_client.patch(
        reverse("tag-detail", args=[other_tag.pk]),
        {"name": "篡改"},
        format="json",
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_delete_tag_returns_204_and_removes_record(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    tag = create_tag(auth_user)

    response = auth_client.delete(reverse("tag-detail", args=[tag.pk]))

    assert response.status_code == 204
    assert not Tag.objects.filter(pk=tag.pk).exists()


@pytest.mark.django_db
def test_delete_other_users_tag_returns_404(auth_client: APIClient) -> None:
    other_tag = create_tag(User.objects.create_user(username="other5", password="pw"))  # noqa: S106

    response = auth_client.delete(reverse("tag-detail", args=[other_tag.pk]))

    assert response.status_code == 404
    assert Tag.objects.filter(pk=other_tag.pk).exists()


@pytest.mark.django_db
def test_search_filters_by_name(auth_client: APIClient, auth_user: User) -> None:
    create_tag(auth_user, name="工作")
    create_tag(auth_user, name="生活")

    response = auth_client.get(reverse("tag-list"), {"search": "生活"})

    assert response.status_code == 200
    assert [item["name"] for item in response.json()["results"]] == ["生活"]


@pytest.mark.django_db
def test_ordering_by_name_and_created_at(auth_client: APIClient, auth_user: User) -> None:
    # 名称顺序与创建时间顺序刻意相反，以区分两种排序依据。
    create_tag(auth_user, name="alpha")
    older = create_tag(auth_user, name="beta")
    Tag.objects.filter(pk=older.pk).update(created_at=timezone.now() - timedelta(days=1))

    by_name = auth_client.get(reverse("tag-list"), {"ordering": "name"})
    by_created_at = auth_client.get(reverse("tag-list"), {"ordering": "created_at"})

    assert [item["name"] for item in by_name.json()["results"]] == ["alpha", "beta"]
    assert [item["name"] for item in by_created_at.json()["results"]] == ["beta", "alpha"]


@pytest.mark.django_db
def test_tag_str_returns_name(auth_user: User) -> None:
    tag = create_tag(auth_user, name="工作")

    assert str(tag) == "工作"

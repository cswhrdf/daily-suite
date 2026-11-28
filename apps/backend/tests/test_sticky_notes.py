"""便签接口测试：CRUD、跨用户隔离、标签关联、过滤搜索排序、重排与转待办。"""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient, APIRequestFactory

from toolkit.models.sticky_note import (
    DEFAULT_STICKY_NOTE_COLOR,
    STICKY_NOTE_COLOR_CHOICES,
    STICKY_NOTE_UNTITLED,
    StickyNote,
)
from toolkit.models.tag import TAG_COLOR_CHOICES, Tag
from toolkit.models.todo import (
    TODO_PRIORITY_CHOICES,
    TODO_STATUS_CHOICES,
    TODO_STATUS_DONE,
    TODO_STATUS_PENDING,
    Todo,
)
from toolkit.serializers import TodoSerializer

PRIMARY_COLOR = STICKY_NOTE_COLOR_CHOICES[0]
SECONDARY_COLOR = STICKY_NOTE_COLOR_CHOICES[1]
TAG_COLOR = TAG_COLOR_CHOICES[0]
TODO_FALLBACK_TITLE = "未命名待办"

# 便签读接口的完整字段集合，用于断言响应契约不漂移。
STICKY_NOTE_FIELDS = {
    "id",
    "title",
    "content",
    "color",
    "is_pinned",
    "is_archived",
    "position",
    "tags",
    "created_at",
    "updated_at",
}


def create_note(  # noqa: PLR0913 - 测试预置数据，逐个字段可读性优先
    owner: User,
    *,
    title: str = "",
    content: str = "",
    position: int = 0,
    color: str = PRIMARY_COLOR,
    is_pinned: bool = False,
    is_archived: bool = False,
) -> StickyNote:
    """直接经 ORM 建一条便签，供需要预置数据的用例复用。"""
    return StickyNote.objects.create(
        owner=owner,
        title=title,
        content=content,
        position=position,
        color=color,
        is_pinned=is_pinned,
        is_archived=is_archived,
    )


def create_tag(owner: User, name: str = "工作") -> Tag:
    """直接经 ORM 建一条标签。"""
    return Tag.objects.create(owner=owner, name=name, color=TAG_COLOR)


def create_other_user(username: str = "stranger") -> User:
    """创建另一名用户，用于验证跨用户隔离。"""
    return User.objects.create_user(username=username, password="pw")  # noqa: S106 - 测试专用口令


def positions_of(notes: list[StickyNote]) -> dict[int, int]:
    """返回给定便签在数据库中的 position 快照，便于断言「未落库」。"""
    return {note.pk: StickyNote.objects.get(pk=note.pk).position for note in notes}


@pytest.mark.django_db
def test_list_requires_authentication() -> None:
    response = APIClient().get(reverse("stickynote-list"))

    assert response.status_code == 401


@pytest.mark.django_db
def test_create_appends_position_and_returns_read_only_fields(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    first = auth_client.post(
        reverse("stickynote-list"),
        {"content": "随手记一条", "position": 99},
        format="json",
    )

    assert first.status_code == 201
    payload = first.json()
    assert set(payload) == STICKY_NOTE_FIELDS
    assert payload["color"] == DEFAULT_STICKY_NOTE_COLOR
    assert payload["position"] == 0
    assert payload["is_pinned"] is False
    assert payload["is_archived"] is False
    assert payload["tags"] == []
    assert StickyNote.objects.get(pk=payload["id"]).owner == auth_user

    second = auth_client.post(reverse("stickynote-list"), {"title": "第二条"}, format="json")

    assert second.status_code == 201
    assert second.json()["position"] == 1


@pytest.mark.django_db
def test_create_with_tags_returns_tag_summary(auth_client: APIClient, auth_user: User) -> None:
    tag = create_tag(auth_user)

    response = auth_client.post(
        reverse("stickynote-list"),
        {"title": "带标签", "tag_ids": [tag.pk]},
        format="json",
    )

    assert response.status_code == 201
    assert response.json()["tags"] == [{"id": tag.pk, "name": "工作", "color": TAG_COLOR}]
    assert StickyNote.objects.get(pk=response.json()["id"]).tags.count() == 1


@pytest.mark.django_db
def test_create_with_invalid_color_returns_chinese_error(auth_client: APIClient) -> None:
    response = auth_client.post(
        reverse("stickynote-list"),
        {"content": "内容", "color": "#000000"},
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["color"] == ["底色不在受控色板内，请选择允许的颜色值。"]
    assert not StickyNote.objects.exists()


@pytest.mark.django_db
def test_create_with_other_users_tag_is_rejected(auth_client: APIClient) -> None:
    foreign_tag = create_tag(create_other_user())

    response = auth_client.post(
        reverse("stickynote-list"),
        {"content": "内容", "tag_ids": [foreign_tag.pk]},
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["tag_ids"] == ["只能关联当前用户自己的标签。"]
    assert not StickyNote.objects.exists()


@pytest.mark.django_db
def test_create_with_unknown_tag_returns_chinese_error(auth_client: APIClient) -> None:
    response = auth_client.post(
        reverse("stickynote-list"),
        {"content": "内容", "tag_ids": [999_999]},
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["tag_ids"] == ["标签不存在。"]
    assert not StickyNote.objects.exists()


@pytest.mark.django_db
def test_list_defaults_to_active_notes_with_pinned_first(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    create_note(auth_user, title="普通一", position=0)
    create_note(auth_user, title="置顶", position=5, is_pinned=True)
    create_note(auth_user, title="普通二", position=1)
    create_note(auth_user, title="归档", position=2, is_archived=True)
    create_note(create_other_user(), title="他人", position=0)

    response = auth_client.get(reverse("stickynote-list"))

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 3
    assert [item["title"] for item in body["results"]] == ["置顶", "普通一", "普通二"]


@pytest.mark.django_db
def test_list_filter_by_is_archived_returns_archived_only(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    create_note(auth_user, title="普通", position=0)
    create_note(auth_user, title="归档", position=1, is_archived=True)

    archived = auth_client.get(reverse("stickynote-list"), {"is_archived": "true"})
    active = auth_client.get(reverse("stickynote-list"), {"is_archived": "false"})

    assert [item["title"] for item in archived.json()["results"]] == ["归档"]
    assert [item["title"] for item in active.json()["results"]] == ["普通"]


@pytest.mark.django_db
def test_list_filter_by_tag(auth_client: APIClient, auth_user: User) -> None:
    tag = create_tag(auth_user)
    tagged = create_note(auth_user, title="有标签", position=0)
    tagged.tags.add(tag)
    create_note(auth_user, title="无标签", position=1)

    response = auth_client.get(reverse("stickynote-list"), {"tag": tag.pk})

    assert response.status_code == 200
    assert [item["title"] for item in response.json()["results"]] == ["有标签"]


@pytest.mark.django_db
def test_search_matches_title_and_content(auth_client: APIClient, auth_user: User) -> None:
    create_note(auth_user, title="买牛奶", position=0)
    create_note(auth_user, title="读书", content="牛奶要买两盒", position=1)
    create_note(auth_user, title="无关", position=2)

    response = auth_client.get(reverse("stickynote-list"), {"search": "牛奶"})

    assert response.status_code == 200
    assert [item["title"] for item in response.json()["results"]] == ["买牛奶", "读书"]


@pytest.mark.django_db
def test_ordering_by_position_ignores_pinned_first(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    create_note(auth_user, title="置顶靠后", position=2, is_pinned=True)
    create_note(auth_user, title="前", position=0)
    create_note(auth_user, title="后", position=1)

    response = auth_client.get(reverse("stickynote-list"), {"ordering": "position"})

    assert [item["title"] for item in response.json()["results"]] == ["前", "后", "置顶靠后"]


@pytest.mark.django_db
def test_ordering_with_pinned_and_position_keeps_pinned_first(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    create_note(auth_user, title="普通", position=0)
    create_note(auth_user, title="置顶", position=9, is_pinned=True)

    response = auth_client.get(
        reverse("stickynote-list"),
        {"ordering": "-is_pinned,position"},
    )

    assert [item["title"] for item in response.json()["results"]] == ["置顶", "普通"]


@pytest.mark.django_db
def test_retrieve_own_note(auth_client: APIClient, auth_user: User) -> None:
    note = create_note(auth_user, title="标题", content="内容")

    response = auth_client.get(reverse("stickynote-detail", args=[note.pk]))

    assert response.status_code == 200
    assert set(response.json()) == STICKY_NOTE_FIELDS
    assert response.json()["title"] == "标题"


@pytest.mark.django_db
def test_retrieve_other_users_note_returns_404(auth_client: APIClient) -> None:
    foreign = create_note(create_other_user(), title="他人", position=0)

    response = auth_client.get(reverse("stickynote-detail", args=[foreign.pk]))

    assert response.status_code == 404


@pytest.mark.django_db
def test_update_note_replaces_tags(auth_client: APIClient, auth_user: User) -> None:
    old_tag = create_tag(auth_user, name="工作")
    new_tag = create_tag(auth_user, name="生活")
    note = create_note(auth_user, title="旧标题", position=0)
    note.tags.add(old_tag)

    response = auth_client.patch(
        reverse("stickynote-detail", args=[note.pk]),
        {
            "title": "新标题",
            "color": SECONDARY_COLOR,
            "is_pinned": True,
            "tag_ids": [new_tag.pk],
        },
        format="json",
    )

    assert response.status_code == 200
    note.refresh_from_db()
    assert note.title == "新标题"
    assert note.color == SECONDARY_COLOR
    assert note.is_pinned is True
    assert list(note.tags.values_list("name", flat=True)) == ["生活"]


@pytest.mark.django_db
def test_archive_and_restore_note(auth_client: APIClient, auth_user: User) -> None:
    note = create_note(auth_user, title="待归档", position=0)

    archived = auth_client.patch(
        reverse("stickynote-detail", args=[note.pk]),
        {"is_archived": True},
        format="json",
    )
    hidden = auth_client.get(reverse("stickynote-list"))
    restored = auth_client.patch(
        reverse("stickynote-detail", args=[note.pk]),
        {"is_archived": False},
        format="json",
    )

    assert archived.json()["is_archived"] is True
    assert hidden.json()["count"] == 0
    assert restored.json()["is_archived"] is False


@pytest.mark.django_db
def test_update_other_users_note_returns_404(auth_client: APIClient) -> None:
    foreign = create_note(create_other_user(), title="他人", position=0)

    response = auth_client.patch(
        reverse("stickynote-detail", args=[foreign.pk]),
        {"title": "篡改"},
        format="json",
    )

    assert response.status_code == 404
    assert StickyNote.objects.get(pk=foreign.pk).title == "他人"


@pytest.mark.django_db
def test_delete_note_returns_204_and_removes_record(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    note = create_note(auth_user, title="待删除", position=0)

    response = auth_client.delete(reverse("stickynote-detail", args=[note.pk]))

    assert response.status_code == 204
    assert not StickyNote.objects.filter(pk=note.pk).exists()


@pytest.mark.django_db
def test_delete_other_users_note_returns_404(auth_client: APIClient) -> None:
    foreign = create_note(create_other_user(), title="他人", position=0)

    response = auth_client.delete(reverse("stickynote-detail", args=[foreign.pk]))

    assert response.status_code == 404
    assert StickyNote.objects.filter(pk=foreign.pk).exists()


@pytest.mark.django_db
def test_reorder_rewrites_positions_in_given_order(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    first = create_note(auth_user, title="一", position=0)
    second = create_note(auth_user, title="二", position=1)
    third = create_note(auth_user, title="三", position=2)
    # 归档便签不参与重排，其位置保持不变。
    archived = create_note(auth_user, title="归档", position=9, is_archived=True)

    response = auth_client.post(
        reverse("stickynote-reorder"),
        {"ordered_ids": [third.pk, first.pk, second.pk]},
        format="json",
    )

    assert response.status_code == 200
    body = response.json()
    assert [item["id"] for item in body] == [third.pk, first.pk, second.pk]
    assert [item["position"] for item in body] == [0, 1, 2]
    assert positions_of([first, second, third]) == {
        third.pk: 0,
        first.pk: 1,
        second.pk: 2,
    }
    assert StickyNote.objects.get(pk=archived.pk).position == 9


@pytest.mark.django_db
def test_reorder_with_duplicate_ids_returns_400_and_keeps_positions(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    first = create_note(auth_user, title="一", position=0)
    second = create_note(auth_user, title="二", position=1)
    before = positions_of([first, second])

    response = auth_client.post(
        reverse("stickynote-reorder"),
        {"ordered_ids": [first.pk, first.pk]},
        format="json",
    )

    assert response.status_code == 400
    assert response.json() == ["ordered_ids 中不能包含重复的便签 ID。"]
    assert positions_of([first, second]) == before


@pytest.mark.django_db
def test_reorder_with_mismatched_count_returns_400_and_keeps_positions(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    first = create_note(auth_user, title="一", position=0)
    second = create_note(auth_user, title="二", position=1)
    before = positions_of([first, second])

    response = auth_client.post(
        reverse("stickynote-reorder"),
        {"ordered_ids": [second.pk]},
        format="json",
    )

    assert response.status_code == 400
    assert response.json() == ["ordered_ids 必须包含当前用户的全部未归档便签。"]
    assert positions_of([first, second]) == before


@pytest.mark.django_db
def test_reorder_with_foreign_id_returns_400_and_keeps_positions(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    first = create_note(auth_user, title="一", position=0)
    second = create_note(auth_user, title="二", position=1)
    foreign = create_note(create_other_user(), title="他人", position=0)
    before = positions_of([first, second])

    response = auth_client.post(
        reverse("stickynote-reorder"),
        {"ordered_ids": [foreign.pk, first.pk]},
        format="json",
    )

    assert response.status_code == 400
    assert response.json() == ["ordered_ids 中存在不属于当前用户的便签 ID。"]
    assert positions_of([first, second]) == before
    assert StickyNote.objects.get(pk=foreign.pk).position == 0


@pytest.mark.django_db
def test_reorder_with_non_list_payload_returns_400(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    create_note(auth_user, title="一", position=0)

    response = auth_client.post(
        reverse("stickynote-reorder"),
        {"ordered_ids": "1,2"},
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["ordered_ids"] == ["ordered_ids 必须是整数列表。"]


@pytest.mark.django_db
def test_convert_to_todo_creates_todo_and_keeps_note(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    tag = create_tag(auth_user)
    note = create_note(auth_user, content="把便签变成待办", position=0)
    note.tags.add(tag)

    response = auth_client.post(
        reverse("stickynote-convert-to-todo", args=[note.pk]),
        {"priority": TODO_PRIORITY_CHOICES[2][0]},
        format="json",
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"sticky_note", "todo"}
    assert body["sticky_note"]["id"] == note.pk
    todo = Todo.objects.get(pk=body["todo"]["id"])
    # 便签标题为空时取内容前若干字作为待办标题。
    assert todo.title == "把便签变成待办"
    assert todo.description == "把便签变成待办"
    assert todo.priority == TODO_PRIORITY_CHOICES[2][0]
    assert todo.status == TODO_STATUS_PENDING
    assert todo.completed_at is None
    assert todo.source_sticky_note == note
    assert todo.position == 0
    assert list(todo.tags.values_list("pk", flat=True)) == [tag.pk]
    assert body["todo"]["tags"] == [{"id": tag.pk, "name": tag.name, "color": tag.color}]
    # 便签本身保留，且不影响后续待办的追加位置。
    assert StickyNote.objects.filter(pk=note.pk).exists()
    assert (
        auth_client.post(
            reverse("stickynote-convert-to-todo", args=[note.pk]),
            {},
            format="json",
        ).json()["todo"]["position"]
        == 1
    )


@pytest.mark.django_db
def test_convert_to_todo_accepts_due_at_and_done_status(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    note = create_note(auth_user, title="写周报", position=0)
    due_at = timezone.now() + timedelta(days=1)

    response = auth_client.post(
        reverse("stickynote-convert-to-todo", args=[note.pk]),
        {"status": TODO_STATUS_DONE, "due_at": due_at.isoformat()},
        format="json",
    )

    assert response.status_code == 200
    todo = Todo.objects.get(pk=response.json()["todo"]["id"])
    assert todo.status == TODO_STATUS_DONE
    assert todo.due_at == due_at
    # 进入已完成即写入完成时间。
    assert todo.completed_at is not None


@pytest.mark.django_db
def test_convert_to_todo_uses_fallback_title_when_note_is_empty(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    note = create_note(auth_user, position=0)

    response = auth_client.post(
        reverse("stickynote-convert-to-todo", args=[note.pk]),
        {},
        format="json",
    )

    assert response.status_code == 200
    assert Todo.objects.get(pk=response.json()["todo"]["id"]).title == TODO_FALLBACK_TITLE


@pytest.mark.django_db
def test_convert_to_todo_with_invalid_priority_returns_400(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    note = create_note(auth_user, title="标题", content="内容", position=0)

    response = auth_client.post(
        reverse("stickynote-convert-to-todo", args=[note.pk]),
        {"priority": "urgent"},
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["priority"] == ["优先级不在允许范围内。"]
    assert not Todo.objects.exists()
    note.refresh_from_db()
    assert (note.title, note.content, note.is_archived) == ("标题", "内容", False)


@pytest.mark.django_db
def test_convert_to_todo_with_invalid_status_returns_400(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    note = create_note(auth_user, title="标题", position=0)

    response = auth_client.post(
        reverse("stickynote-convert-to-todo", args=[note.pk]),
        {"status": "blocked"},
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["status"] == ["状态不在允许范围内。"]
    assert not Todo.objects.exists()


@pytest.mark.django_db
def test_convert_to_todo_with_invalid_due_at_returns_400(
    auth_client: APIClient,
    auth_user: User,
) -> None:
    note = create_note(auth_user, title="标题", position=0)

    response = auth_client.post(
        reverse("stickynote-convert-to-todo", args=[note.pk]),
        {"due_at": "不是时间"},
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["due_at"] == ["截止时间格式不正确，请使用 ISO 8601 格式。"]
    assert not Todo.objects.exists()


@pytest.mark.django_db
def test_convert_to_todo_for_other_users_note_returns_404(auth_client: APIClient) -> None:
    foreign = create_note(create_other_user(), title="他人", position=0)

    response = auth_client.post(
        reverse("stickynote-convert-to-todo", args=[foreign.pk]),
        {},
        format="json",
    )

    assert response.status_code == 404
    assert not Todo.objects.exists()


def test_model_string_representations_and_choice_labels() -> None:
    assert str(StickyNote(title="标题", content="内容")) == "标题"
    assert str(StickyNote(content="摘" * 60)) == "摘" * 50
    assert str(StickyNote()) == STICKY_NOTE_UNTITLED
    assert str(Todo(title="待办标题")) == "待办标题"
    assert Todo(title="已完成", status=TODO_STATUS_DONE).get_status_display() == "已完成"
    assert Todo(title="高优先", priority=TODO_PRIORITY_CHOICES[2][0]).get_priority_display() == "高"
    # 取值常量与 choices 声明保持一一对应。
    assert [value for value, _ in TODO_STATUS_CHOICES] == ["pending", "in_progress", "done"]
    assert [value for value, _ in TODO_PRIORITY_CHOICES] == ["low", "medium", "high"]


@pytest.mark.django_db
def test_todo_serializer_derives_completed_at_from_status(auth_user: User) -> None:
    tag = create_tag(auth_user)
    request = APIRequestFactory().post("/")
    request.user = auth_user

    created = TodoSerializer(data={"title": "写测试", "status": TODO_STATUS_DONE})
    created.is_valid(raise_exception=True)
    todo = created.save(owner=auth_user, position=0, tags=[tag])

    assert todo.completed_at is not None
    # 走一次 tag_ids 写入，确保待办序列化器同样按归属校验标签。
    retagged = TodoSerializer(
        todo,
        data={"tag_ids": [tag.pk]},
        partial=True,
        context={"request": request},
    )
    retagged.is_valid(raise_exception=True)
    retagged.save()
    assert list(todo.tags.values_list("pk", flat=True)) == [tag.pk]
    # 直接以增量方式验证派生逻辑：状态留在已完成时保持完成时间不变。
    renamed = TodoSerializer(todo, data={"title": "改名"}, partial=True)
    renamed.is_valid(raise_exception=True)
    renamed.save()
    todo.refresh_from_db()
    assert todo.title == "改名"
    assert todo.completed_at is not None

    reopened = TodoSerializer(todo, data={"status": TODO_STATUS_PENDING}, partial=True)
    reopened.is_valid(raise_exception=True)
    reopened.save()
    todo.refresh_from_db()

    assert todo.completed_at is None

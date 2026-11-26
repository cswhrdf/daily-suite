"""脚手架冒烟测试：验证 Django 与 DRF 基本可用。"""

from django.test import Client
from django.urls import reverse

# 这些用例只走 HTTP 层、不触达数据库，因此不声明 django_db，
# 让测试套件无需外部 PostgreSQL 即可运行；后续涉及 ORM 的用例再单独加标记。


def test_health_endpoint_returns_ok() -> None:
    response = Client().get(reverse("health"))
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_echo_endpoint_round_trips_payload(client: Client) -> None:
    payload = {"message": "hello"}
    response = client.post(
        reverse("echo"),
        data=payload,
        content_type="application/json",
    )
    assert response.status_code == 200
    assert response.json() == payload


def test_echo_endpoint_rejects_invalid_payload(client: Client) -> None:
    response = client.post(
        reverse("echo"),
        data={"unexpected": "value"},
        content_type="application/json",
    )
    assert response.status_code == 400

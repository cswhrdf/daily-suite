"""临时调试用例（用完即删）。"""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse

COOKIE_NAME = "daily_suite_refresh"


@pytest.mark.django_db
def test_debug(client) -> None:  # noqa: ANN001
    resp = client.post(reverse("auth-refresh"), COOKIES={COOKIE_NAME: "not-a-jwt"})
    print("invalid:", resp.status_code, resp.content)
    User = get_user_model()
    User.objects.create_user(username="bob", password="pw")  # noqa: S106
    login = client.post(
        reverse("auth-login"),
        data={"username": "bob", "password": "pw"},
        content_type="application/json",
    )
    old = str(login.cookies[COOKIE_NAME].value)
    first = client.post(reverse("auth-refresh"), COOKIES={COOKIE_NAME: old})
    print("first:", first.status_code, first.content)
    replay = Client().post(reverse("auth-refresh"), COOKIES={COOKIE_NAME: old})
    print("replay:", replay.status_code, replay.content)

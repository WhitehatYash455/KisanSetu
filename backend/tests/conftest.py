import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import get_current_user


@pytest.fixture
def mock_user():
    return {
        "id": "00000000-0000-0000-0000-000000000001",
        "email": "ramesh.patil@example.com",
        "role": "authenticated",
        "claims": {"sub": "00000000-0000-0000-0000-000000000001"}
    }


@pytest.fixture
def override_auth(mock_user):
    async def _mock_get_current_user():
        return mock_user
    app.dependency_overrides[get_current_user] = _mock_get_current_user
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

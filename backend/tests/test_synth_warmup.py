from __future__ import annotations

import sys
import types

import pytest
from fastapi.testclient import TestClient

from diction.app import WARMUP_TEXT, create_app
from diction.config import Settings
from diction.tts.base import StubSynthesizer


class SpySynthesizer:
    def __init__(self, registry: list[SpySynthesizer]) -> None:
        self.calls: list[str] = []
        registry.append(self)

    def synthesize(self, text: str, voice: str | None = None) -> bytes:
        self.calls.append(text)
        return b'RIFF'


class FailingSynthesizer:
    def synthesize(self, text: str, voice: str | None = None) -> bytes:
        raise RuntimeError('transient warm-up failure')


def install_spy_synth(monkeypatch: pytest.MonkeyPatch) -> list[SpySynthesizer]:
    instances: list[SpySynthesizer] = []

    fake_module = types.ModuleType('diction.tts.synth_kokoro')
    fake_module.KokoroSynthesizer = lambda settings: SpySynthesizer(instances)  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, 'diction.tts.synth_kokoro', fake_module)

    return instances


def install_failing_synth(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_module = types.ModuleType('diction.tts.synth_kokoro')
    fake_module.KokoroSynthesizer = lambda settings: FailingSynthesizer()  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, 'diction.tts.synth_kokoro', fake_module)


def settings_with_stub_synth(use_stub_synth: bool) -> Settings:
    return Settings(
        use_stub_scorer=True,
        use_stub_prosody=True,
        use_stub_explainer=True,
        use_stub_critic=True,
        use_stub_generator=True,
        use_stub_synth=use_stub_synth,
        use_stub_interview=True,
    )


def test_warms_the_real_synth_once_at_startup(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr('diction.app.create_db_and_tables', lambda: None)
    monkeypatch.setattr(
        'diction.app.get_settings', lambda: settings_with_stub_synth(False)
    )
    instances = install_spy_synth(monkeypatch)

    app = create_app()
    with TestClient(app):
        pass

    assert len(instances) == 1
    assert instances[0].calls == [WARMUP_TEXT]


def test_skips_warm_up_on_the_stub_synth(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr('diction.app.create_db_and_tables', lambda: None)
    monkeypatch.setattr(
        'diction.app.get_settings', lambda: settings_with_stub_synth(True)
    )
    instances = install_spy_synth(monkeypatch)

    app = create_app()
    with TestClient(app):
        assert isinstance(app.state.synth, StubSynthesizer)

    assert instances == []


def test_warm_up_failure_does_not_abort_startup(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr('diction.app.create_db_and_tables', lambda: None)
    monkeypatch.setattr(
        'diction.app.get_settings', lambda: settings_with_stub_synth(False)
    )
    install_failing_synth(monkeypatch)

    app = create_app()
    with TestClient(app) as client:
        response = client.get('/api/health')

    assert response.status_code == 200

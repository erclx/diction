from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel

from diction.api.prosody import get_prosody_scorer, get_synth
from diction.app import create_app
from diction.db.engine import get_session, make_engine
from diction.scoring.prosody import (
    CONTOUR_RESAMPLE_POINTS,
    ProsodyAnalysis,
    ProsodyResult,
    StressMark,
    analyze_prosody,
    apply_voicing,
    build_stress_marks,
    compare_prosody,
    intonation_match,
    median_smooth,
    rhythm_match,
    word_timed_contour,
)
from diction.storage import drills as drills_storage
from diction.tts.base import StubSynthesizer

TWO_WORDS = [(0.0, 0.5), (0.5, 1.0)]


def _rising(points: int) -> list[float]:
    return [100.0 + step * 12.0 for step in range(points)]


def _track(
    frequencies: list[float], duration: float = 1.0
) -> list[tuple[float, float]]:
    if len(frequencies) == 1:
        return [(0.0, frequencies[0])]
    step = duration / (len(frequencies) - 1)
    return [(index * step, frequency) for index, frequency in enumerate(frequencies)]


def _words(count: int, duration: float) -> list[tuple[float, float]]:
    span = duration / count
    return [(index * span, (index + 1) * span) for index in range(count)]


def test_intonation_match_is_high_for_identical_contours() -> None:
    track = _track(_rising(20))

    result = intonation_match(track, track, TWO_WORDS, TWO_WORDS)

    assert result > 99.0


def test_intonation_match_is_low_for_a_flattened_contour() -> None:
    varied = _track(_rising(20))
    flat = _track([120.0] * 20)

    varied_score = intonation_match(varied, varied, TWO_WORDS, TWO_WORDS)
    flat_score = intonation_match(varied, flat, TWO_WORDS, TWO_WORDS)

    assert flat_score < varied_score
    assert flat_score < 50.0


def test_intonation_match_is_low_for_an_inverted_contour() -> None:
    rising = _track(_rising(20))
    falling = _track(list(reversed(_rising(20))))

    matched = intonation_match(rising, rising, TWO_WORDS, TWO_WORDS)
    inverted = intonation_match(rising, falling, TWO_WORDS, TWO_WORDS)

    assert inverted < matched


def test_intonation_match_ignores_absolute_pitch_offset() -> None:
    low_voice = _track(_rising(20))
    high_voice = _track([frequency * 2.0 for frequency in _rising(20)])

    assert intonation_match(low_voice, high_voice, TWO_WORDS, TWO_WORDS) > 99.0


def test_intonation_match_is_high_across_a_tempo_difference() -> None:
    melody = _rising(20)
    slow = _track(melody, duration=2.0)
    fast = _track(melody, duration=1.0)

    result = intonation_match(slow, fast, _words(2, 2.0), _words(2, 1.0))

    assert result > 99.0


def test_intonation_match_is_zero_when_a_contour_has_no_voiced_frames() -> None:
    silent = _track([0.0, 0.0])
    voiced = _track(_rising(10))

    assert intonation_match(silent, voiced, TWO_WORDS, TWO_WORDS) == 0.0


def test_rhythm_match_is_high_for_identical_timings() -> None:
    timings = [(0.0, 0.4), (0.4, 1.0), (1.0, 1.2)]

    result = rhythm_match(timings, timings)

    assert result > 99.0


def test_rhythm_match_ignores_overall_tempo() -> None:
    slow = [(0.0, 0.4), (0.4, 1.0), (1.0, 1.2)]
    fast = [(0.0, 0.2), (0.2, 0.5), (0.5, 0.6)]

    assert rhythm_match(slow, fast) > 99.0


def test_rhythm_match_is_low_for_an_evened_out_delivery() -> None:
    varied = [(0.0, 0.1), (0.1, 0.9), (0.9, 1.0)]
    even = [(0.0, 0.4), (0.4, 0.8), (0.8, 1.2)]

    assert rhythm_match(varied, even) < rhythm_match(varied, varied)


def test_compare_prosody_returns_both_axes() -> None:
    track = _track(_rising(20))
    timings = [(0.0, 0.5), (0.5, 1.0)]

    result = compare_prosody(track, track, timings, timings)

    assert isinstance(result, ProsodyResult)
    assert result.rhythm_match > 99.0
    assert result.intonation_match > 99.0


def test_word_timed_contour_is_empty_without_voiced_frames() -> None:
    contour = word_timed_contour([(0.0, 0.0), (0.5, 0.0)], TWO_WORDS)

    assert contour == []


def test_median_smooth_removes_a_single_frame_spike() -> None:
    values = [100.0, 100.0, 400.0, 100.0, 100.0]

    smoothed = median_smooth(values, 3)

    assert max(smoothed) < 400.0


def test_median_smooth_returns_the_input_when_the_window_exceeds_length() -> None:
    values = [100.0, 200.0]

    assert median_smooth(values, 5) == values


def test_apply_voicing_zeros_frames_below_the_energy_threshold() -> None:
    frequencies = [120.0, 130.0, 140.0]
    energies = [1.0, 0.05, 1.0]

    voiced = apply_voicing(frequencies, energies, 0.15)

    assert voiced == [120.0, 0.0, 140.0]


def test_build_stress_marks_marks_the_primary_stressed_syllable() -> None:
    marks = build_stress_marks(['banana'], [['bə', 'ˈnɑː', 'nə']])

    assert marks == [
        StressMark(word='banana', syllables=['bə', 'nɑː', 'nə'], stress_index=1)
    ]


def test_build_stress_marks_falls_back_to_the_first_syllable_without_a_mark() -> None:
    marks = build_stress_marks(['the'], [['ðə']])

    assert marks[0].stress_index == 0


def test_build_stress_marks_uses_secondary_stress_when_no_primary_is_present() -> None:
    marks = build_stress_marks(['deform'], [['diː', 'ˌfɔːm']])

    assert marks[0].stress_index == 1


def test_analyze_prosody_exposes_resampled_contours_and_the_scalars() -> None:
    track = _track(_rising(20))
    timings = [(0.0, 0.5), (0.5, 1.0)]
    marks = [StressMark(word='hi', syllables=['haɪ'], stress_index=0)]

    analysis = analyze_prosody(track, track, timings, timings, marks)

    assert len(analysis.reference_contour) == CONTOUR_RESAMPLE_POINTS
    assert len(analysis.learner_contour) == CONTOUR_RESAMPLE_POINTS
    assert analysis.reference_timings == timings
    assert analysis.stress_marks == marks
    assert analysis.rhythm_match > 99.0
    assert analysis.intonation_match > 99.0


class FakeProsodyScorer:
    def __init__(
        self, result: ProsodyResult, analysis: ProsodyAnalysis | None = None
    ) -> None:
        self._result = result
        self._analysis = analysis
        self.received: tuple[bytes, bytes] | None = None
        self.analyzed: tuple[str, bytes, bytes] | None = None

    def score(self, reference_audio: bytes, learner_audio: bytes) -> ProsodyResult:
        self.received = (reference_audio, learner_audio)
        return self._result

    def analyze(
        self, reference_text: str, reference_audio: bytes, learner_audio: bytes
    ) -> ProsodyAnalysis:
        assert self._analysis is not None
        self.analyzed = (reference_text, reference_audio, learner_audio)
        return self._analysis


@pytest.fixture
def engine(tmp_path) -> Engine:
    built = make_engine(f'sqlite:///{tmp_path / "test.db"}')
    SQLModel.metadata.create_all(built)
    return built


@pytest.fixture
def client(engine: Engine) -> Iterator[TestClient]:
    app = create_app()

    def override_session() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_synth] = lambda: StubSynthesizer()
    yield TestClient(app)
    app.dependency_overrides.clear()


def _post(client: TestClient, reference_text: str = 'the thick fog') -> object:
    return client.post(
        '/api/prosody/score',
        data={'reference_text': reference_text},
        files={'audio': ('clip.webm', b'fake-bytes', 'audio/webm')},
    )


def test_score_returns_both_prosody_axes(client: TestClient) -> None:
    scorer = FakeProsodyScorer(ProsodyResult(rhythm_match=72.0, intonation_match=63.0))
    client.app.dependency_overrides[get_prosody_scorer] = lambda: scorer

    response = _post(client)

    assert response.status_code == 200
    body = response.json()
    assert body['rhythm_match'] == 72.0
    assert body['intonation_match'] == 63.0


def test_score_persists_a_shadowing_rep_with_the_mean_prosody_match(
    client: TestClient, engine: Engine
) -> None:
    scorer = FakeProsodyScorer(ProsodyResult(rhythm_match=72.0, intonation_match=63.0))
    client.app.dependency_overrides[get_prosody_scorer] = lambda: scorer

    _post(client)

    with Session(engine) as session:
        reps = drills_storage.list_drill_reps(session)
    assert len(reps) == 1
    assert reps[0].mode == 'shadowing'
    assert reps[0].target == 'the thick fog'
    assert reps[0].passed is None
    assert reps[0].score == 67.5


def test_score_synthesizes_the_reference_before_scoring(client: TestClient) -> None:
    scorer = FakeProsodyScorer(ProsodyResult(rhythm_match=50.0, intonation_match=50.0))
    client.app.dependency_overrides[get_prosody_scorer] = lambda: scorer

    _post(client)

    assert scorer.received is not None
    reference_audio, learner_audio = scorer.received
    assert reference_audio == StubSynthesizer().synthesize('the thick fog')
    assert learner_audio == b'fake-bytes'


def test_score_rejects_blank_reference_text(client: TestClient) -> None:
    scorer = FakeProsodyScorer(ProsodyResult(rhythm_match=50.0, intonation_match=50.0))
    client.app.dependency_overrides[get_prosody_scorer] = lambda: scorer

    response = _post(client, reference_text='   ')

    assert response.status_code == 422


def test_score_rejects_reference_text_over_the_length_limit(client: TestClient) -> None:
    scorer = FakeProsodyScorer(ProsodyResult(rhythm_match=50.0, intonation_match=50.0))
    client.app.dependency_overrides[get_prosody_scorer] = lambda: scorer

    response = _post(client, reference_text='word ' * 200)

    assert response.status_code == 422


def _sample_analysis() -> ProsodyAnalysis:
    return ProsodyAnalysis(
        rhythm_match=72.0,
        intonation_match=63.0,
        reference_contour=[0.0, 1.0, 2.0],
        learner_contour=[0.0, 0.5, 1.0],
        reference_timings=[(0.0, 0.4), (0.4, 1.0)],
        stress_marks=[
            StressMark(word='banana', syllables=['bə', 'nɑː', 'nə'], stress_index=1)
        ],
    )


def _post_analyze(client: TestClient, reference_text: str = 'the thick fog') -> object:
    return client.post(
        '/api/prosody/analyze',
        data={'reference_text': reference_text},
        files={'audio': ('clip.webm', b'fake-bytes', 'audio/webm')},
    )


def test_analyze_projects_the_full_contour_and_stress_payload(
    client: TestClient,
) -> None:
    scorer = FakeProsodyScorer(
        ProsodyResult(rhythm_match=72.0, intonation_match=63.0), _sample_analysis()
    )
    client.app.dependency_overrides[get_prosody_scorer] = lambda: scorer

    response = _post_analyze(client)

    assert response.status_code == 200
    body = response.json()
    assert body['rhythm_match'] == 72.0
    assert body['reference_contour'] == [0.0, 1.0, 2.0]
    assert body['learner_contour'] == [0.0, 0.5, 1.0]
    assert body['reference_timings'] == [[0.0, 0.4], [0.4, 1.0]]
    assert body['stress_marks'] == [
        {'word': 'banana', 'syllables': ['bə', 'nɑː', 'nə'], 'stress_index': 1}
    ]


def test_analyze_persists_a_stress_rep_with_the_mean_prosody_match(
    client: TestClient, engine: Engine
) -> None:
    scorer = FakeProsodyScorer(
        ProsodyResult(rhythm_match=72.0, intonation_match=63.0), _sample_analysis()
    )
    client.app.dependency_overrides[get_prosody_scorer] = lambda: scorer

    _post_analyze(client)

    with Session(engine) as session:
        reps = drills_storage.list_drill_reps(session)
    assert len(reps) == 1
    assert reps[0].mode == 'stress'
    assert reps[0].target == 'the thick fog'
    assert reps[0].score == 67.5


def test_analyze_synthesizes_and_passes_the_reference_text(client: TestClient) -> None:
    scorer = FakeProsodyScorer(
        ProsodyResult(rhythm_match=72.0, intonation_match=63.0), _sample_analysis()
    )
    client.app.dependency_overrides[get_prosody_scorer] = lambda: scorer

    _post_analyze(client)

    assert scorer.analyzed is not None
    reference_text, reference_audio, learner_audio = scorer.analyzed
    assert reference_text == 'the thick fog'
    assert reference_audio == StubSynthesizer().synthesize('the thick fog')
    assert learner_audio == b'fake-bytes'


def test_analyze_rejects_blank_reference_text(client: TestClient) -> None:
    scorer = FakeProsodyScorer(
        ProsodyResult(rhythm_match=50.0, intonation_match=50.0), _sample_analysis()
    )
    client.app.dependency_overrides[get_prosody_scorer] = lambda: scorer

    response = _post_analyze(client, reference_text='   ')

    assert response.status_code == 422

from pathlib import Path

from fastapi.testclient import TestClient

from diction.app import create_app
from diction.config import Settings, get_settings
from diction.interview.questions import extract_questions, load_questions

WELL_FORMED = (
    '---\n'
    'title: Questions\n'
    '---\n\n'
    '# Questions\n\n'
    '## Opening and screening\n\n'
    '### "Tell me about yourself"\n\n'
    '- current role\n'
    '- why this move\n\n'
    '> I lead the platform team and I am looking for scope.\n\n'
    '## Behavioral\n\n'
    '### "A time you disagreed"\n\n'
    '- the call\n\n'
    '> I pushed back with data and we shipped the safer path.\n'
)

MISSING_ANSWER = '## Fit and closing\n\n### "Your greatest weakness"\n\n- delegation\n'

MALFORMED = 'Just some prose with no headings and a - stray bullet.\n'


def _write(directory: Path, name: str, body: str) -> None:
    (directory / name).write_text(body, encoding='utf8')


def test_extract_reads_category_question_beats_and_answer() -> None:
    questions = extract_questions(WELL_FORMED)

    assert len(questions) == 2
    first = questions[0]
    assert first.category == 'Opening and screening'
    assert first.question == 'Tell me about yourself'
    assert first.keywords == 'current role\nwhy this move'
    assert first.answer == 'I lead the platform team and I am looking for scope.'


def test_extract_does_not_bleed_beats_across_questions() -> None:
    questions = extract_questions(WELL_FORMED)

    assert questions[1].keywords == 'the call'


def test_question_without_answer_parses_with_empty_answer() -> None:
    questions = extract_questions(MISSING_ANSWER)

    assert len(questions) == 1
    assert questions[0].answer == ''
    assert questions[0].keywords == 'delegation'


def test_load_returns_empty_list_when_source_dir_is_unset() -> None:
    assert load_questions(None) == []


def test_load_returns_empty_list_when_source_dir_is_missing(tmp_path: Path) -> None:
    assert load_questions(tmp_path / 'does-not-exist') == []


def test_load_returns_empty_list_for_empty_directory(tmp_path: Path) -> None:
    assert load_questions(tmp_path) == []


def test_load_skips_malformed_file_and_keeps_well_formed_bank(tmp_path: Path) -> None:
    _write(tmp_path, 'bank.md', WELL_FORMED)
    _write(tmp_path, 'broken.md', MALFORMED)

    questions = load_questions(tmp_path)

    assert len(questions) == 2
    assert [question.question for question in questions] == [
        'Tell me about yourself',
        'A time you disagreed',
    ]


def _client_with_source_dir(source_dir: Path | None) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(
        interview_source_dir=source_dir
    )
    return TestClient(app)


def test_route_returns_parsed_questions_as_response_models(tmp_path: Path) -> None:
    _write(tmp_path, 'bank.md', WELL_FORMED)
    client = _client_with_source_dir(tmp_path)

    response = client.get('/api/interview/questions')

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    first = body[0]
    assert first == {
        'category': 'Opening and screening',
        'question': 'Tell me about yourself',
        'keyword_beats': ['current role', 'why this move'],
        'scripted_answer': 'I lead the platform team and I am looking for scope.',
    }


def test_route_returns_empty_list_when_source_dir_is_unset() -> None:
    client = _client_with_source_dir(None)

    response = client.get('/api/interview/questions')

    assert response.status_code == 200
    assert response.json() == []

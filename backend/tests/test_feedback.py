from collections.abc import Mapping
from dataclasses import dataclass, field

from diction.feedback.base import StubExplainer
from diction.feedback.explainer_llm import OllamaExplainer
from diction.feedback.types import FlaggedWordContext


@dataclass
class FakeMessage:
    content: str


@dataclass
class FakeReply:
    message: FakeMessage


@dataclass
class FakeChatClient:
    content: str
    calls: list[dict[str, object]] = field(default_factory=list)

    def chat(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        options: Mapping[str, object],
    ) -> FakeReply:
        self.calls.append({'model': model, 'messages': messages, 'options': options})
        return FakeReply(FakeMessage(self.content))


def test_stub_explainer_returns_one_explanation_per_word_naming_word_and_phoneme() -> (
    None
):
    explainer = StubExplainer()
    flagged = [
        FlaggedWordContext(word='thick', phoneme='θ'),
        FlaggedWordContext(word='vote', phoneme='v'),
    ]

    explanations = explainer.explain(flagged)

    assert len(explanations) == 2
    assert 'thick' in explanations[0] and 'θ' in explanations[0]
    assert 'vote' in explanations[1] and 'v' in explanations[1]


def test_stub_explainer_returns_empty_for_no_flagged_words() -> None:
    assert StubExplainer().explain([]) == []


def test_ollama_explainer_prompts_with_each_flagged_word_and_phoneme() -> None:
    client = FakeChatClient(content='reason one\nreason two')
    explainer = OllamaExplainer(client=client, model_id='test-model')
    flagged = [
        FlaggedWordContext(word='thick', phoneme='θ'),
        FlaggedWordContext(word='cat', phoneme='k'),
    ]

    explainer.explain(flagged)

    user_prompt = client.calls[0]['messages'][1]['content']
    assert 'thick' in user_prompt and 'θ' in user_prompt
    assert 'cat' in user_prompt and 'k' in user_prompt


def test_ollama_explainer_maps_one_reply_line_to_each_flagged_word() -> None:
    client = FakeChatClient(content='1. tongue behind teeth\n2. release the k')
    explainer = OllamaExplainer(client=client, model_id='test-model')
    flagged = [
        FlaggedWordContext(word='thick', phoneme='θ'),
        FlaggedWordContext(word='cat', phoneme='k'),
    ]

    explanations = explainer.explain(flagged)

    assert explanations == ['tongue behind teeth', 'release the k']


def test_ollama_explainer_falls_back_to_template_on_line_count_mismatch() -> None:
    client = FakeChatClient(content='only one line for two words')
    explainer = OllamaExplainer(client=client, model_id='test-model')
    flagged = [
        FlaggedWordContext(word='thick', phoneme='θ'),
        FlaggedWordContext(word='cat', phoneme='k'),
    ]

    explanations = explainer.explain(flagged)

    assert len(explanations) == 2
    assert 'thick' in explanations[0] and 'θ' in explanations[0]
    assert 'cat' in explanations[1] and 'k' in explanations[1]


def test_ollama_explainer_skips_the_model_call_for_no_flagged_words() -> None:
    client = FakeChatClient(content='unused')
    explainer = OllamaExplainer(client=client, model_id='test-model')

    explanations = explainer.explain([])

    assert explanations == []
    assert client.calls == []

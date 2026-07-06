"""Fitted per-phoneme GOP baselines from the speechocean762 calibration.

Plain data with no model import, so `gop.py` and its tests stay runnable
without the `scoring` extra or a GPU. The experiment that produced these, the
method, and the findings live in `.claude/context/calibration.md`. The harness
that regenerates the table is in `backend/calibration/`.
"""

# Flag a phoneme when its GOP falls this many standard deviations below its own
# native mean. Tuned to favor few false flags on native speech.
FLAG_K = 1.6

# phoneme (raw espeak IPA token, as the scorer emits) -> (native_mean, native_std)
# on clean reads. Only phonemes whose GOP separates clean from wrong appear here.
# A phoneme absent from the table is uncalibrated and never flags.
PHONEME_BASELINES: dict[str, tuple[float, float]] = {
    'd': (-0.688, 1.442),
    'f': (-0.257, 0.889),
    'h': (-0.781, 1.355),
    'iː': (-1.338, 1.525),
    'k': (-0.187, 0.734),
    'l': (-0.884, 1.753),
    'm': (-0.143, 0.610),
    'n': (-0.519, 1.150),
    'p': (-0.325, 1.072),
    's': (-0.357, 0.927),
    't': (-0.707, 1.494),
    'uː': (-1.629, 1.663),
    'v': (-0.445, 1.307),
    'w': (-0.490, 1.287),
    'z': (-0.584, 1.329),
    'æ': (-1.248, 1.164),
    'ð': (-1.771, 2.494),
    'ŋ': (-1.189, 1.920),
    'ɔː': (-3.797, 1.021),
    'ə': (-1.550, 2.118),
    'ɛ': (-1.188, 1.474),
    'ɜː': (-3.283, 1.795),
    'ɪ': (-1.266, 1.599),
    'ɹ': (-0.874, 1.826),
    'ʃ': (-0.354, 0.778),
    'ʊ': (-2.027, 1.582),
    'θ': (-2.643, 2.612),
}

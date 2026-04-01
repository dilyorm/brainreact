from __future__ import annotations

import hashlib
import math
import os
import statistics
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
from moviepy import VideoFileClip

from ..config import settings

os.environ.setdefault("MPLBACKEND", "Agg")


TRIBE_REPO_ID = "facebook/tribev2"
TRIBE_CHECKPOINT_NAME = "best.ckpt"
BRAIN_VIEWS = ["left", "right", "dorsal", "posterior"]


def _load_video_duration(video_path: Path) -> float:
    with VideoFileClip(str(video_path)) as clip:
        return float(clip.duration or 0.0)


def _downsample_vertices(preds: np.ndarray, bins: int = 36) -> list[list[float]]:
    absolute = np.abs(preds)
    chunk_size = max(1, absolute.shape[1] // bins)
    chunks = []
    for start in range(0, absolute.shape[1], chunk_size):
        end = min(start + chunk_size, absolute.shape[1])
        chunks.append(absolute[:, start:end].mean(axis=1))
    matrix = np.stack(chunks, axis=1)
    if matrix.shape[1] > bins:
        matrix = matrix[:, :bins]
    return np.round(matrix, 4).tolist()


def _extract_transcript_rows(events_df) -> list[dict[str, Any]]:
    transcript = []
    if events_df is None or len(events_df) == 0:
        return transcript
    rows = events_df[events_df["type"].isin(["Sentence", "Text", "Word"])]
    for _, row in rows.head(120).iterrows():
        text = str(row.get("text") or "").strip()
        if not text:
            continue
        transcript.append(
            {
                "type": str(row.get("type") or "Text"),
                "start": round(float(row.get("start") or 0.0), 2),
                "duration": round(float(row.get("duration") or 0.0), 2),
                "text": text,
            }
        )
    return transcript


def _build_peaks(scores: np.ndarray, transcript: list[dict[str, Any]], limit: int = 5) -> list[dict[str, Any]]:
    if scores.size == 0:
        return []
    indices = np.argsort(scores)[::-1][:limit]
    peaks = []
    for index in indices:
        moment = float(index)
        nearby = next(
            (
                item
                for item in transcript
                if abs(float(item.get("start", 0.0)) - moment) <= 2.0 and len(item.get("text", "")) > 0
            ),
            None,
        )
        peaks.append(
            {
                "time": round(moment, 2),
                "score": round(float(scores[index]), 4),
                "label": "Speech-linked peak" if nearby else "Stimulus peak",
                "context": nearby["text"] if nearby else "No transcript event aligned in the 2-second window.",
            }
        )
    return peaks


def _scores_to_timeline(scores: np.ndarray) -> list[dict[str, Any]]:
    if scores.size == 0:
        return []
    max_score = max(float(scores.max()), 1e-6)
    timeline = []
    for idx, score in enumerate(scores):
        timeline.append(
            {
                "time": round(float(idx), 2),
                "activation": round(float(score), 4),
                "normalized": round(float(score / max_score), 4),
            }
        )
    return timeline


def _make_mock_result(video_path: Path, reason: str | None = None) -> dict[str, Any]:
    duration = max(12.0, min(_load_video_duration(video_path), 150.0))
    steps = max(12, min(int(math.ceil(duration)), 180))
    digest = hashlib.sha256(video_path.name.encode("utf-8")).hexdigest()
    seed = int(digest[:8], 16)
    rng = np.random.default_rng(seed)
    base = np.linspace(0, 3 * math.pi, steps)
    scores = 0.4 + 0.2 * np.sin(base) + 0.1 * np.cos(base * 2.3) + rng.normal(0.0, 0.04, steps)
    scores = np.clip(scores, 0.08, None)
    heatmap = []
    for score in scores:
        row = np.clip(rng.normal(score, 0.08, 36), 0.0, None)
        heatmap.append(np.round(row, 4).tolist())

    transcript = [
        {
            "type": "Text",
            "start": round(float(index * max(duration / steps, 1.0)), 2),
            "duration": round(float(max(duration / steps, 1.0)), 2),
            "text": text,
        }
        for index, text in enumerate(
            [
                "Opening visual sequence",
                "Rising narrative intensity",
                "Speech or auditory cue",
                "High-motion visual moment",
            ]
        )
    ]

    notes = [
        "TRIBE v2 could not run, so the backend generated a deterministic mock response for UX development.",
        "The UI remains usable, but the current output is not a real brain-response prediction.",
    ]
    if reason:
        notes.append(f"TRIBE fallback reason: {reason}")

    return {
        "mode": "mock",
        "model": "fallback-synthetic",
        "license": "Development-only fallback",
        "duration_seconds": round(duration, 2),
        "time_step_seconds": 1,
        "hemodynamic_lag_seconds": 5,
        "timeline": _scores_to_timeline(scores),
        "heatmap": heatmap,
        "transcript": transcript,
        "peaks": _build_peaks(scores, transcript),
        "brain_visuals": [],
        "regional_summary": [],
        "stats": {
            "mean_activation": round(float(statistics.fmean(scores)), 4),
            "peak_activation": round(float(scores.max()), 4),
            "timepoints": int(steps),
        },
        "notes": notes,
    }


def _download_pretrained_bundle() -> Path:
    from huggingface_hub import hf_hub_download

    model_dir = settings.cache_dir / "tribev2-pretrained"
    model_dir.mkdir(parents=True, exist_ok=True)
    hf_hub_download(repo_id=TRIBE_REPO_ID, filename="config.yaml", local_dir=str(model_dir))
    hf_hub_download(repo_id=TRIBE_REPO_ID, filename=TRIBE_CHECKPOINT_NAME, local_dir=str(model_dir))
    return model_dir


@lru_cache(maxsize=1)
def _get_tribe_model():
    import pathlib

    from tribev2 import TribeModel

    model_dir = _download_pretrained_bundle()
    config_update = {
        "data.text_feature.device": "cpu",
        "data.audio_feature.device": "cpu",
        "data.image_feature.image.device": "cpu",
        "data.video_feature.image.device": "cpu",
        "data.image_feature.image.batch_size": 1,
        "data.video_feature.image.batch_size": 1,
    }
    original_posix_path = pathlib.PosixPath
    pathlib.PosixPath = pathlib.WindowsPath
    try:
        return TribeModel.from_pretrained(
            model_dir,
            cache_folder=str(settings.cache_dir),
            device="auto",
            config_update=config_update,
        )
    finally:
        pathlib.PosixPath = original_posix_path


def _render_brain_snapshot(
    signal: np.ndarray,
    destination: Path,
    *,
    title: str,
) -> None:
    import matplotlib.pyplot as plt
    from tribev2.plotting.cortical import PlotBrainNilearn

    destination.parent.mkdir(parents=True, exist_ok=True)
    plotter = PlotBrainNilearn(mesh="fsaverage5", inflate="half")
    fig, axarr = plotter.get_fig_axes(BRAIN_VIEWS)
    plotter.plot_surf(
        signal,
        axes=axarr,
        views=BRAIN_VIEWS,
        cmap="magma",
        norm_percentile=99.5,
    )
    fig.suptitle(title, fontsize=12, y=0.98)
    fig.savefig(destination, dpi=220, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def _get_roi_summary(signal: np.ndarray, top_k: int = 6) -> list[dict[str, Any]]:
    from tribev2.utils import get_hcp_labels, summarize_by_roi

    labels = list(get_hcp_labels(mesh="fsaverage5", combine=False, hemi="both").keys())
    values = summarize_by_roi(signal, hemi="both", mesh="fsaverage5")
    top_indices = np.argsort(values)[::-1][:top_k]
    return [
        {
            "roi": labels[index],
            "value": round(float(values[index]), 4),
        }
        for index in top_indices
    ]


def _build_regional_summary(preds: np.ndarray, scores: np.ndarray) -> list[dict[str, Any]]:
    mean_signal = np.abs(preds).mean(axis=0)
    summary = [
        {
            "window": "Overall mean response",
            "time": None,
            "regions": _get_roi_summary(mean_signal),
        }
    ]
    peak_indices = np.argsort(scores)[::-1][:3]
    for index in peak_indices:
        summary.append(
            {
                "window": f"Peak at {index}s",
                "time": round(float(index), 2),
                "regions": _get_roi_summary(np.abs(preds[index])),
            }
        )
    return summary


def _build_brain_visuals(preds: np.ndarray, scores: np.ndarray, analysis_id: str) -> list[dict[str, Any]]:
    visuals = []
    asset_dir = settings.public_dir / "analyses" / analysis_id
    mean_signal = np.abs(preds).mean(axis=0)
    mean_path = asset_dir / "brain-overall-mean.png"
    _render_brain_snapshot(mean_signal, mean_path, title="Overall mean predicted cortical response")
    visuals.append(
        {
            "kind": "overall",
            "label": "Overall mean response",
            "time": None,
            "image_path": "/assets/public/analyses/" + analysis_id + "/brain-overall-mean.png",
            "regions": _get_roi_summary(mean_signal),
        }
    )

    peak_indices = np.argsort(scores)[::-1][:3]
    for rank, index in enumerate(peak_indices, start=1):
        signal = np.abs(preds[index])
        rois = _get_roi_summary(signal, top_k=3)
        output_path = asset_dir / f"brain-peak-{rank}.png"
        _render_brain_snapshot(signal, output_path, title=f"Peak predicted response at t={index}s")
        visuals.append(
            {
                "kind": "peak",
                "label": f"Peak response #{rank}",
                "time": round(float(index), 2),
                "image_path": "/assets/public/analyses/" + analysis_id + f"/brain-peak-{rank}.png",
                "regions": rois,
            }
        )
    return visuals


def run_tribe_analysis(video_path: Path, analysis_id: str | None = None) -> dict[str, Any]:
    video_path = Path(video_path)
    duration = _load_video_duration(video_path)
    try:
        model = _get_tribe_model()
        events_df = model.get_events_dataframe(video_path=str(video_path))
        preds, _segments = model.predict(events=events_df)
        scores = np.abs(preds).mean(axis=1)
        transcript = _extract_transcript_rows(events_df)
        analysis_key = analysis_id or video_path.stem
        return {
            "mode": "real",
            "model": TRIBE_REPO_ID,
            "license": "CC BY-NC 4.0",
            "duration_seconds": round(float(duration), 2),
            "time_step_seconds": 1,
            "hemodynamic_lag_seconds": 5,
            "timeline": _scores_to_timeline(scores),
            "heatmap": _downsample_vertices(preds),
            "transcript": transcript,
            "peaks": _build_peaks(scores, transcript),
            "brain_visuals": _build_brain_visuals(preds, scores, analysis_key),
            "regional_summary": _build_regional_summary(preds, scores),
            "stats": {
                "mean_activation": round(float(scores.mean()), 4),
                "peak_activation": round(float(scores.max()), 4),
                "timepoints": int(preds.shape[0]),
                "vertices": int(preds.shape[1]),
            },
            "notes": [
                "TRIBE v2 predicts average-subject fMRI-like responses to the stimulus, not a specific viewer's measured neural state.",
                "Predictions are offset 5 seconds into the past to reflect hemodynamic lag in fMRI response.",
                "Brain snapshots show cortical patterns from the fsaverage5 mesh at overall mean and top peak windows.",
            ],
        }
    except Exception as exc:
        return _make_mock_result(video_path, reason=str(exc))

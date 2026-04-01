from __future__ import annotations

import json
from typing import Any

import httpx

from ..config import settings


AVAILABLE_INTERPRETER_MODELS = [
    {
        "id": "gemini-3-flash-preview",
        "provider": "gemini",
        "label": "Gemini 3 Flash Preview",
        "description": "Faster interpretation for interactive iteration.",
    },
    {
        "id": "gemini-3.1-pro-preview",
        "provider": "gemini",
        "label": "Gemini 3.1 Pro Preview",
        "description": "Stronger reasoning for denser interpretation.",
    },
    {
        "id": "nvidia/llama-3.1-nemotron-ultra-253b-v1",
        "provider": "nvidia",
        "label": "NVIDIA Nemotron Ultra 253B",
        "description": "Highest-end NVIDIA-hosted reasoning option for careful explanation.",
    },
    {
        "id": "openai/gpt-oss-120b",
        "provider": "nvidia",
        "label": "GPT-OSS 120B on NVIDIA",
        "description": "Strong open reasoning model served through NVIDIA's OpenAI-compatible endpoint.",
    },
    {
        "id": "meta/llama-3.1-405b-instruct",
        "provider": "nvidia",
        "label": "Llama 3.1 405B Instruct on NVIDIA",
        "description": "Very strong long-form synthesis and structured interpretation.",
    },
    {
        "id": "qwen/qwen3-next-80b-a3b-thinking",
        "provider": "nvidia",
        "label": "Qwen3 Next 80B Thinking on NVIDIA",
        "description": "Reasoning-focused option for dense moment-by-moment analysis.",
    },
]

MODEL_BY_ID = {item["id"]: item for item in AVAILABLE_INTERPRETER_MODELS}


def fallback_interpretation(
    tribe_result: dict[str, Any],
    requested_model: str | None = None,
    reason: str | None = None,
) -> dict[str, Any]:
    peaks = tribe_result.get("peaks", [])
    notes = tribe_result.get("notes", [])
    caveats = notes + [
        "The selected cloud interpreter was not called, so the backend returned a deterministic fallback explanation.",
        "Treat the interpretation as descriptive guidance, not neuroscientific ground truth.",
    ]
    if requested_model:
        caveats.append(f"Requested interpreter model: {requested_model}.")
    if reason:
        caveats.append(reason)
    return {
        "provider": "fallback",
        "model": requested_model,
        "summary": "The uploaded clip appears to contain a few moments with stronger predicted cortical response, likely driven by changes in speech, motion, or visual contrast.",
        "possible_meanings": [
            "Higher activation windows may correspond to moments that are more visually salient or semantically dense.",
            "Speech-linked peaks often indicate combined auditory and language processing demand.",
            "These are model-based hypotheses about the stimulus, not direct evidence of a viewer's emotion.",
        ],
        "moment_annotations": [
            {
                "time": peak.get("time", 0),
                "headline": peak.get("label", "Predicted response peak"),
                "explanation": peak.get("context", "No aligned transcript context available."),
            }
            for peak in peaks
        ],
        "caveats": caveats,
    }


def _build_prompt(tribe_result: dict[str, Any]) -> str:
    summary_payload = {
        "mode": tribe_result.get("mode"),
        "duration_seconds": tribe_result.get("duration_seconds"),
        "stats": tribe_result.get("stats"),
        "peaks": tribe_result.get("peaks", []),
        "regional_summary": tribe_result.get("regional_summary", []),
        "transcript_excerpt": tribe_result.get("transcript", [])[:20],
        "notes": tribe_result.get("notes", []),
    }
    return (
        "You are interpreting TRIBE v2 predicted brain-response data for a research demo. "
        "Never claim you measured a real user's brain or emotion. "
        "Speak in cautious hypotheses only. "
        "Return JSON with keys summary, possible_meanings, moment_annotations, caveats. "
        "possible_meanings must be an array of 3 short strings. "
        "moment_annotations must be an array of up to 5 objects with keys time, headline, explanation. "
        "caveats must be an array of 3 short strings.\n\n"
        f"TRIBE_RESULT={json.dumps(summary_payload, ensure_ascii=True)}"
    )


def _parse_json_payload(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3:
            text = "\n".join(lines[1:-1]).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start : end + 1])
        raise


def _call_gemini(model_id: str, tribe_result: dict[str, Any]) -> dict[str, Any]:
    if not settings.gemini_api_key:
        return fallback_interpretation(
            tribe_result,
            requested_model=model_id,
            reason="Gemini API key was not configured.",
        )

    url = f"{settings.gemini_api_url}/models/{model_id}:generateContent"
    payload = {
        "systemInstruction": {
            "parts": [
                {
                    "text": "You are a careful multimodal neuroscience explainer. Avoid overclaiming and mention uncertainty explicitly.",
                }
            ]
        },
        "contents": [{"role": "user", "parts": [{"text": _build_prompt(tribe_result)}]}],
        "generationConfig": {
            "temperature": 0.35,
            "topP": 0.9,
            "maxOutputTokens": 900,
            "responseMimeType": "application/json",
        },
    }

    try:
        response = httpx.post(
            url,
            params={"key": settings.gemini_api_key},
            json=payload,
            timeout=60,
        )
        response.raise_for_status()
        body = response.json()
        parts = body["candidates"][0]["content"]["parts"]
        text = "".join(part.get("text", "") for part in parts)
        parsed = _parse_json_payload(text)
        parsed["provider"] = "gemini"
        parsed["model"] = model_id
        return parsed
    except Exception as exc:
        return fallback_interpretation(
            tribe_result,
            requested_model=model_id,
            reason=f"Gemini request failed: {exc}",
        )


def _call_nvidia(model_id: str, tribe_result: dict[str, Any]) -> dict[str, Any]:
    if not settings.nvidia_api_key:
        return fallback_interpretation(
            tribe_result,
            requested_model=model_id,
            reason="NVIDIA API key was not configured.",
        )

    url = f"{settings.nvidia_api_url.rstrip('/')}/chat/completions"
    payload = {
        "model": model_id,
        "messages": [
            {
                "role": "system",
                "content": "You are a careful multimodal neuroscience explainer. Avoid overclaiming and mention uncertainty explicitly.",
            },
            {"role": "user", "content": _build_prompt(tribe_result)},
        ],
        "temperature": 0.35,
        "top_p": 0.9,
        "max_tokens": 900,
    }

    try:
        response = httpx.post(
            url,
            headers={
                "Authorization": f"Bearer {settings.nvidia_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=90,
        )
        response.raise_for_status()
        body = response.json()
        message = body["choices"][0]["message"]
        content = message.get("content")
        if content is None:
            content = message.get("reasoning_content") or message.get("reasoning")
        if isinstance(content, list):
            text = "".join(part.get("text", "") if isinstance(part, dict) else str(part) for part in content)
        else:
            text = str(content)
        parsed = _parse_json_payload(text)
        parsed["provider"] = "nvidia"
        parsed["model"] = model_id
        return parsed
    except Exception as exc:
        return fallback_interpretation(
            tribe_result,
            requested_model=model_id,
            reason=f"NVIDIA request failed: {exc}",
        )


def generate_interpretation(interpreter_model: str, tribe_result: dict[str, Any]) -> dict[str, Any]:
    option = MODEL_BY_ID.get(interpreter_model)
    if option is None:
        return fallback_interpretation(
            tribe_result,
            requested_model=interpreter_model,
            reason="Unsupported interpreter model selection.",
        )
    if option["provider"] == "gemini":
        return _call_gemini(interpreter_model, tribe_result)
    return _call_nvidia(interpreter_model, tribe_result)

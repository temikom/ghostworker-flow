"""
AI Service for GPT-4 powered features.
Includes: summaries, sentiment analysis, translations, auto-responses
"""
import json
import hashlib
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.advanced import (
    AISummary, SentimentAnalysis, VoiceTranscription, AISettings
)


class AIService:
    """Service for OpenAI GPT-4 and Whisper integrations."""
    
    def __init__(self):
        self.openai_api_key = getattr(settings, 'OPENAI_API_KEY', '')
        self.openai_base_url = "https://api.openai.com/v1"
    
    async def _call_openai(
        self, 
        endpoint: str, 
        payload: Dict[str, Any],
        timeout: float = 60.0
    ) -> Dict[str, Any]:
        """Make a request to OpenAI API."""
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{self.openai_base_url}/{endpoint}",
                headers={
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
            response.raise_for_status()
            return response.json()
    
    async def generate_summary(
        self,
        db: Session,
        conversation_id: UUID,
        messages: List[Dict[str, str]],
        user_id: UUID
    ) -> AISummary:
        """Generate AI summary for a conversation."""
        start_time = datetime.utcnow()
        
        # Format messages for GPT
        conversation_text = "\n".join([
            f"{msg['sender']}: {msg['content']}" for msg in messages
        ])
        
        prompt = f"""Analyze this conversation and provide:
1. A concise summary (2-3 sentences)
2. Key points (bullet points)
3. Action items if any
4. Overall sentiment (positive/neutral/negative)
5. Detected language

Conversation:
{conversation_text}

Respond in JSON format:
{{
    "summary": "...",
    "key_points": ["...", "..."],
    "action_items": ["...", "..."],
    "sentiment": "positive|neutral|negative",
    "sentiment_score": 0.0 to 1.0 (-1 to 1),
    "sentiment_breakdown": {{"positive": 0.0, "neutral": 0.0, "negative": 0.0}},
    "language": "en"
}}"""
        
        response = await self._call_openai("chat/completions", {
            "model": "gpt-4",
            "messages": [
                {"role": "system", "content": "You are an expert conversation analyst. Always respond in valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 1000
        })
        
        result_text = response["choices"][0]["message"]["content"]
        result = json.loads(result_text)
        
        processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        # Create summary record
        summary = AISummary(
            conversation_id=conversation_id,
            summary=result["summary"],
            key_points=result.get("key_points", []),
            action_items=result.get("action_items", []),
            overall_sentiment=result.get("sentiment"),
            sentiment_score=result.get("sentiment_score"),
            sentiment_breakdown=result.get("sentiment_breakdown"),
            detected_language=result.get("language", "en"),
            model_used="gpt-4",
            tokens_used=response["usage"]["total_tokens"],
            processing_time_ms=processing_time
        )
        
        db.add(summary)
        db.commit()
        db.refresh(summary)
        
        return summary
    
    async def analyze_sentiment(
        self,
        db: Session,
        text: str,
        entity_type: str,
        entity_id: UUID,
        user_id: UUID
    ) -> SentimentAnalysis:
        """Perform sentiment analysis on text."""
        prompt = f"""Analyze the sentiment of this text:

"{text}"

Respond in JSON format:
{{
    "sentiment": "positive|neutral|negative",
    "score": -1.0 to 1.0,
    "confidence": 0.0 to 1.0,
    "emotions": {{"joy": 0.0, "anger": 0.0, "sadness": 0.0, "fear": 0.0, "surprise": 0.0}},
    "keywords": ["keyword1", "keyword2"],
    "topics": ["topic1", "topic2"]
}}"""
        
        response = await self._call_openai("chat/completions", {
            "model": "gpt-4",
            "messages": [
                {"role": "system", "content": "You are a sentiment analysis expert. Always respond in valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 500
        })
        
        result = json.loads(response["choices"][0]["message"]["content"])
        
        analysis = SentimentAnalysis(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            sentiment=result["sentiment"],
            score=result["score"],
            confidence=result.get("confidence", 0.8),
            emotions=result.get("emotions"),
            keywords=result.get("keywords", []),
            topics=result.get("topics", []),
            model_used="gpt-4"
        )
        
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        
        return analysis
    
    async def transcribe_audio(
        self,
        db: Session,
        audio_url: str,
        conversation_id: UUID,
        message_id: Optional[UUID] = None
    ) -> VoiceTranscription:
        """Transcribe audio using Whisper API."""
        start_time = datetime.utcnow()
        
        # Download audio file
        async with httpx.AsyncClient() as client:
            audio_response = await client.get(audio_url)
            audio_data = audio_response.content
        
        # Call Whisper API
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.openai_base_url}/audio/transcriptions",
                headers={"Authorization": f"Bearer {self.openai_api_key}"},
                files={"file": ("audio.mp3", audio_data, "audio/mpeg")},
                data={
                    "model": "whisper-1",
                    "response_format": "verbose_json",
                    "timestamp_granularities": ["word"]
                }
            )
            response.raise_for_status()
            result = response.json()
        
        processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        # Extract word timings
        word_timings = []
        if "words" in result:
            word_timings = [
                {"word": w["word"], "start": w["start"], "end": w["end"]}
                for w in result["words"]
            ]
        
        transcription = VoiceTranscription(
            message_id=message_id,
            conversation_id=conversation_id,
            audio_url=audio_url,
            audio_duration_seconds=int(result.get("duration", 0)),
            transcription=result["text"],
            confidence=0.95,  # Whisper doesn't return confidence
            language=result.get("language", "en"),
            word_timings=word_timings,
            model_used="whisper-1",
            processing_time_ms=processing_time
        )
        
        db.add(transcription)
        db.commit()
        db.refresh(transcription)
        
        return transcription
    
    async def generate_response(
        self,
        db: Session,
        user_id: UUID,
        conversation_context: List[Dict[str, str]],
        customer_message: str,
        ai_settings: Optional[AISettings] = None
    ) -> Dict[str, Any]:
        """Generate AI response for a customer message."""
        if not ai_settings:
            ai_settings = db.query(AISettings).filter(
                AISettings.user_id == user_id
            ).first()
        
        system_prompt = ai_settings.system_prompt if ai_settings else (
            "You are a helpful customer support assistant. Be concise and professional."
        )
        
        model = ai_settings.model if ai_settings else "gpt-4"
        temperature = float(ai_settings.temperature) if ai_settings else 0.7
        max_tokens = ai_settings.max_tokens if ai_settings else 500
        
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation context
        for msg in conversation_context[-10:]:  # Last 10 messages
            role = "assistant" if msg["sender_type"] in ["agent", "ai"] else "user"
            messages.append({"role": role, "content": msg["content"]})
        
        # Add current message
        messages.append({"role": "user", "content": customer_message})
        
        response = await self._call_openai("chat/completions", {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        })
        
        return {
            "response": response["choices"][0]["message"]["content"],
            "confidence": 0.85,
            "language": ai_settings.primary_language if ai_settings else "en",
            "tokens_used": response["usage"]["total_tokens"]
        }
    
    async def translate_text(
        self,
        text: str,
        target_language: str,
        source_language: Optional[str] = None
    ) -> Dict[str, Any]:
        """Translate text to target language."""
        prompt = f"""Translate the following text to {target_language}:

"{text}"

Respond in JSON format:
{{
    "translated_text": "...",
    "source_language": "detected language code",
    "target_language": "{target_language}",
    "confidence": 0.0 to 1.0
}}"""
        
        response = await self._call_openai("chat/completions", {
            "model": "gpt-4",
            "messages": [
                {"role": "system", "content": "You are a translation expert. Always respond in valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 1000
        })
        
        return json.loads(response["choices"][0]["message"]["content"])
    
    def get_ai_settings(self, db: Session, user_id: UUID) -> Optional[AISettings]:
        """Get user's AI settings."""
        return db.query(AISettings).filter(AISettings.user_id == user_id).first()
    
    def update_ai_settings(
        self, 
        db: Session, 
        user_id: UUID, 
        settings_data: Dict[str, Any]
    ) -> AISettings:
        """Update user's AI settings."""
        ai_settings = self.get_ai_settings(db, user_id)
        
        if not ai_settings:
            ai_settings = AISettings(user_id=user_id, **settings_data)
            db.add(ai_settings)
        else:
            for key, value in settings_data.items():
                if hasattr(ai_settings, key):
                    setattr(ai_settings, key, value)
        
        db.commit()
        db.refresh(ai_settings)
        return ai_settings


# Singleton instance
ai_service = AIService()

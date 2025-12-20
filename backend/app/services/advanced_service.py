"""
Advanced Features Service.
Includes: Canned responses, Tags, Segments, White-label, Predictive analytics
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.advanced import (
    CannedResponse, CustomerTag, CustomerSegment, CustomerProfile,
    WhiteLabelSettings, PredictiveAnalytics, SentimentAnalysis
)


class AdvancedFeaturesService:
    """Service for advanced features."""
    
    # ==========================================
    # CANNED RESPONSES
    # ==========================================
    
    def get_canned_responses(
        self,
        db: Session,
        user_id: UUID,
        category: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[CannedResponse]:
        """Get canned responses for user."""
        query = db.query(CannedResponse).filter(
            CannedResponse.user_id == user_id,
            CannedResponse.is_active == True
        )
        
        if category:
            query = query.filter(CannedResponse.category == category)
        
        if search:
            query = query.filter(
                CannedResponse.title.ilike(f"%{search}%") |
                CannedResponse.content.ilike(f"%{search}%") |
                CannedResponse.shortcut.ilike(f"%{search}%")
            )
        
        return query.order_by(CannedResponse.usage_count.desc()).all()
    
    def create_canned_response(
        self,
        db: Session,
        user_id: UUID,
        data: Dict[str, Any]
    ) -> CannedResponse:
        """Create a canned response."""
        response = CannedResponse(user_id=user_id, **data)
        db.add(response)
        db.commit()
        db.refresh(response)
        return response
    
    def update_canned_response(
        self,
        db: Session,
        response_id: UUID,
        user_id: UUID,
        data: Dict[str, Any]
    ) -> Optional[CannedResponse]:
        """Update a canned response."""
        response = db.query(CannedResponse).filter(
            CannedResponse.id == response_id,
            CannedResponse.user_id == user_id
        ).first()
        
        if response:
            for key, value in data.items():
                if hasattr(response, key) and value is not None:
                    setattr(response, key, value)
            db.commit()
            db.refresh(response)
        
        return response
    
    def delete_canned_response(
        self,
        db: Session,
        response_id: UUID,
        user_id: UUID
    ) -> bool:
        """Delete a canned response."""
        response = db.query(CannedResponse).filter(
            CannedResponse.id == response_id,
            CannedResponse.user_id == user_id
        ).first()
        
        if response:
            db.delete(response)
            db.commit()
            return True
        return False
    
    def use_canned_response(
        self,
        db: Session,
        response_id: UUID,
        user_id: UUID
    ) -> Optional[CannedResponse]:
        """Mark canned response as used."""
        response = db.query(CannedResponse).filter(
            CannedResponse.id == response_id,
            CannedResponse.user_id == user_id
        ).first()
        
        if response:
            response.usage_count += 1
            response.last_used = datetime.utcnow()
            db.commit()
            db.refresh(response)
        
        return response
    
    # ==========================================
    # CUSTOMER TAGS
    # ==========================================
    
    def get_tags(self, db: Session, user_id: UUID) -> List[CustomerTag]:
        """Get all tags for user."""
        return db.query(CustomerTag).filter(
            CustomerTag.user_id == user_id
        ).order_by(CustomerTag.name).all()
    
    def create_tag(
        self,
        db: Session,
        user_id: UUID,
        data: Dict[str, Any]
    ) -> CustomerTag:
        """Create a tag."""
        tag = CustomerTag(user_id=user_id, **data)
        db.add(tag)
        db.commit()
        db.refresh(tag)
        return tag
    
    def update_tag(
        self,
        db: Session,
        tag_id: UUID,
        user_id: UUID,
        data: Dict[str, Any]
    ) -> Optional[CustomerTag]:
        """Update a tag."""
        tag = db.query(CustomerTag).filter(
            CustomerTag.id == tag_id,
            CustomerTag.user_id == user_id
        ).first()
        
        if tag:
            for key, value in data.items():
                if hasattr(tag, key) and value is not None:
                    setattr(tag, key, value)
            db.commit()
            db.refresh(tag)
        
        return tag
    
    def delete_tag(self, db: Session, tag_id: UUID, user_id: UUID) -> bool:
        """Delete a tag."""
        tag = db.query(CustomerTag).filter(
            CustomerTag.id == tag_id,
            CustomerTag.user_id == user_id
        ).first()
        
        if tag:
            db.delete(tag)
            db.commit()
            return True
        return False
    
    # ==========================================
    # CUSTOMER SEGMENTS
    # ==========================================
    
    def get_segments(self, db: Session, user_id: UUID) -> List[CustomerSegment]:
        """Get all segments for user."""
        return db.query(CustomerSegment).filter(
            CustomerSegment.user_id == user_id
        ).order_by(CustomerSegment.name).all()
    
    def create_segment(
        self,
        db: Session,
        user_id: UUID,
        data: Dict[str, Any]
    ) -> CustomerSegment:
        """Create a segment."""
        segment = CustomerSegment(user_id=user_id, **data)
        db.add(segment)
        db.commit()
        db.refresh(segment)
        return segment
    
    def update_segment(
        self,
        db: Session,
        segment_id: UUID,
        user_id: UUID,
        data: Dict[str, Any]
    ) -> Optional[CustomerSegment]:
        """Update a segment."""
        segment = db.query(CustomerSegment).filter(
            CustomerSegment.id == segment_id,
            CustomerSegment.user_id == user_id
        ).first()
        
        if segment:
            for key, value in data.items():
                if hasattr(segment, key) and value is not None:
                    setattr(segment, key, value)
            db.commit()
            db.refresh(segment)
        
        return segment
    
    def delete_segment(self, db: Session, segment_id: UUID, user_id: UUID) -> bool:
        """Delete a segment."""
        segment = db.query(CustomerSegment).filter(
            CustomerSegment.id == segment_id,
            CustomerSegment.user_id == user_id
        ).first()
        
        if segment:
            db.delete(segment)
            db.commit()
            return True
        return False
    
    def compute_segment(
        self,
        db: Session,
        segment_id: UUID,
        user_id: UUID
    ) -> Optional[CustomerSegment]:
        """Recompute segment membership."""
        segment = db.query(CustomerSegment).filter(
            CustomerSegment.id == segment_id,
            CustomerSegment.user_id == user_id
        ).first()
        
        if not segment:
            return None
        
        # Apply rules to find matching customers
        # This is a simplified implementation
        query = db.query(CustomerProfile).filter(
            CustomerProfile.user_id == user_id
        )
        
        rules = segment.rules or {}
        conditions = rules.get("conditions", [])
        
        for condition in conditions:
            field = condition.get("field")
            op = condition.get("operator")
            value = condition.get("value")
            
            if field == "total_spent":
                if op == "greater_than":
                    query = query.filter(CustomerProfile.total_spent > value)
                elif op == "less_than":
                    query = query.filter(CustomerProfile.total_spent < value)
            elif field == "total_orders":
                if op == "greater_than":
                    query = query.filter(CustomerProfile.total_orders > value)
        
        matching_profiles = query.all()
        
        # Update segment membership
        segment.customer_count = len(matching_profiles)
        segment.last_computed = datetime.utcnow()
        
        # Update customer profiles with segment ID
        for profile in matching_profiles:
            if segment.id not in (profile.segments or []):
                profile.segments = (profile.segments or []) + [segment.id]
        
        db.commit()
        db.refresh(segment)
        return segment
    
    # ==========================================
    # CUSTOMER PROFILES
    # ==========================================
    
    def get_customer_profiles(
        self,
        db: Session,
        user_id: UUID,
        tag_id: Optional[UUID] = None,
        segment_id: Optional[UUID] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[CustomerProfile]:
        """Get customer profiles with filters."""
        query = db.query(CustomerProfile).filter(
            CustomerProfile.user_id == user_id
        )
        
        if tag_id:
            query = query.filter(CustomerProfile.tags.contains([tag_id]))
        
        if segment_id:
            query = query.filter(CustomerProfile.segments.contains([segment_id]))
        
        if search:
            query = query.filter(
                CustomerProfile.name.ilike(f"%{search}%") |
                CustomerProfile.email.ilike(f"%{search}%")
            )
        
        return query.order_by(CustomerProfile.last_seen.desc()).offset(offset).limit(limit).all()
    
    def get_customer_profile(
        self,
        db: Session,
        profile_id: UUID,
        user_id: UUID
    ) -> Optional[CustomerProfile]:
        """Get specific customer profile."""
        return db.query(CustomerProfile).filter(
            CustomerProfile.id == profile_id,
            CustomerProfile.user_id == user_id
        ).first()
    
    def update_customer_profile(
        self,
        db: Session,
        profile_id: UUID,
        user_id: UUID,
        data: Dict[str, Any]
    ) -> Optional[CustomerProfile]:
        """Update customer profile."""
        profile = self.get_customer_profile(db, profile_id, user_id)
        
        if profile:
            for key, value in data.items():
                if hasattr(profile, key) and value is not None:
                    setattr(profile, key, value)
            db.commit()
            db.refresh(profile)
        
        return profile
    
    def add_tag_to_customer(
        self,
        db: Session,
        profile_id: UUID,
        tag_id: UUID,
        user_id: UUID
    ) -> Optional[CustomerProfile]:
        """Add tag to customer profile."""
        profile = self.get_customer_profile(db, profile_id, user_id)
        
        if profile:
            if tag_id not in (profile.tags or []):
                profile.tags = (profile.tags or []) + [tag_id]
                
                # Update tag usage count
                tag = db.query(CustomerTag).filter(CustomerTag.id == tag_id).first()
                if tag:
                    tag.usage_count += 1
                
                db.commit()
                db.refresh(profile)
        
        return profile
    
    def remove_tag_from_customer(
        self,
        db: Session,
        profile_id: UUID,
        tag_id: UUID,
        user_id: UUID
    ) -> Optional[CustomerProfile]:
        """Remove tag from customer profile."""
        profile = self.get_customer_profile(db, profile_id, user_id)
        
        if profile and profile.tags:
            profile.tags = [t for t in profile.tags if t != tag_id]
            db.commit()
            db.refresh(profile)
        
        return profile
    
    # ==========================================
    # WHITE LABEL
    # ==========================================
    
    def get_white_label_settings(
        self,
        db: Session,
        user_id: UUID
    ) -> Optional[WhiteLabelSettings]:
        """Get white label settings for user."""
        return db.query(WhiteLabelSettings).filter(
            WhiteLabelSettings.user_id == user_id
        ).first()
    
    def update_white_label_settings(
        self,
        db: Session,
        user_id: UUID,
        data: Dict[str, Any]
    ) -> WhiteLabelSettings:
        """Update white label settings."""
        settings = self.get_white_label_settings(db, user_id)
        
        if not settings:
            settings = WhiteLabelSettings(user_id=user_id, **data)
            db.add(settings)
        else:
            for key, value in data.items():
                if hasattr(settings, key):
                    setattr(settings, key, value)
        
        db.commit()
        db.refresh(settings)
        return settings
    
    def verify_domain(
        self,
        db: Session,
        user_id: UUID,
        domain: str
    ) -> Dict[str, Any]:
        """Verify custom domain ownership."""
        # In production, this would verify DNS records
        settings = self.get_white_label_settings(db, user_id)
        
        if settings and settings.custom_domain == domain:
            # Simulate DNS verification
            settings.domain_verified = True
            db.commit()
            
            return {
                "verified": True,
                "dns_records": [
                    {"type": "CNAME", "name": domain, "value": "app.ghostworker.io"},
                    {"type": "TXT", "name": domain, "value": f"ghostworker-verify={user_id}"}
                ],
                "message": "Domain verified successfully"
            }
        
        return {
            "verified": False,
            "dns_records": [
                {"type": "CNAME", "name": domain, "value": "app.ghostworker.io"},
                {"type": "TXT", "name": domain, "value": f"ghostworker-verify={user_id}"}
            ],
            "message": "Please add the DNS records and try again"
        }
    
    # ==========================================
    # SENTIMENT DASHBOARD
    # ==========================================
    
    def get_sentiment_dashboard(
        self,
        db: Session,
        user_id: UUID,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get sentiment analysis dashboard data."""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get sentiment distribution
        sentiments = db.query(
            SentimentAnalysis.sentiment,
            func.count(SentimentAnalysis.id)
        ).filter(
            SentimentAnalysis.user_id == user_id,
            SentimentAnalysis.analyzed_at >= start_date
        ).group_by(SentimentAnalysis.sentiment).all()
        
        distribution = {s[0]: s[1] for s in sentiments}
        total = sum(distribution.values()) or 1
        
        # Calculate average score
        avg_score = db.query(func.avg(SentimentAnalysis.score)).filter(
            SentimentAnalysis.user_id == user_id,
            SentimentAnalysis.analyzed_at >= start_date
        ).scalar() or 0
        
        # Get trend (daily averages)
        from sqlalchemy import cast, Date
        trend = db.query(
            cast(SentimentAnalysis.analyzed_at, Date).label('date'),
            func.avg(SentimentAnalysis.score).label('avg_score')
        ).filter(
            SentimentAnalysis.user_id == user_id,
            SentimentAnalysis.analyzed_at >= start_date
        ).group_by(
            cast(SentimentAnalysis.analyzed_at, Date)
        ).order_by('date').all()
        
        # Determine overall sentiment
        if avg_score > 0.3:
            overall = "positive"
        elif avg_score < -0.3:
            overall = "negative"
        else:
            overall = "neutral"
        
        return {
            "overall_sentiment": overall,
            "average_score": float(avg_score),
            "sentiment_distribution": distribution,
            "sentiment_trend": [
                {"date": str(t.date), "score": float(t.avg_score)}
                for t in trend
            ],
            "top_emotions": {},  # Would aggregate from emotions column
            "top_keywords": [],  # Would aggregate from keywords column
            "top_topics": []     # Would aggregate from topics column
        }
    
    # ==========================================
    # PREDICTIVE ANALYTICS
    # ==========================================
    
    def get_predictions(
        self,
        db: Session,
        user_id: UUID,
        prediction_type: Optional[str] = None
    ) -> List[PredictiveAnalytics]:
        """Get predictions for user."""
        query = db.query(PredictiveAnalytics).filter(
            PredictiveAnalytics.user_id == user_id,
            PredictiveAnalytics.valid_until >= datetime.utcnow()
        )
        
        if prediction_type:
            query = query.filter(PredictiveAnalytics.prediction_type == prediction_type)
        
        return query.order_by(PredictiveAnalytics.prediction_date.desc()).all()
    
    def get_prediction_dashboard(
        self,
        db: Session,
        user_id: UUID
    ) -> Dict[str, Any]:
        """Get predictive analytics dashboard."""
        predictions = self.get_predictions(db, user_id)
        
        churn = [p for p in predictions if p.prediction_type == "churn"]
        conversion = [p for p in predictions if p.prediction_type == "conversion"]
        volume = [p for p in predictions if p.prediction_type == "volume"]
        sentiment = [p for p in predictions if p.prediction_type == "sentiment_trend"]
        
        insights = []
        
        # Generate insights based on predictions
        high_churn = [p for p in churn if p.prediction_value > 0.7]
        if high_churn:
            insights.append(f"{len(high_churn)} customers at high risk of churn")
        
        high_conversion = [p for p in conversion if p.prediction_value > 0.6]
        if high_conversion:
            insights.append(f"{len(high_conversion)} leads likely to convert")
        
        return {
            "churn_predictions": [
                {
                    "entity_id": str(p.entity_id),
                    "risk": float(p.prediction_value),
                    "confidence": float(p.confidence),
                    "factors": p.factors
                }
                for p in churn[:10]
            ],
            "conversion_predictions": [
                {
                    "entity_id": str(p.entity_id),
                    "likelihood": float(p.prediction_value),
                    "confidence": float(p.confidence)
                }
                for p in conversion[:10]
            ],
            "volume_forecast": [
                {
                    "date": str(p.prediction_date),
                    "predicted_volume": float(p.prediction_value)
                }
                for p in volume[:30]
            ],
            "sentiment_trend": [
                {
                    "date": str(p.prediction_date),
                    "predicted_sentiment": float(p.prediction_value)
                }
                for p in sentiment[:30]
            ],
            "key_insights": insights
        }


# Singleton instance
advanced_service = AdvancedFeaturesService()

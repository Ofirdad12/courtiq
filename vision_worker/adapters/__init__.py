"""Pluggable raw-video detector adapters for CourtIQ."""

from vision_worker.adapters.ultralytics_tracker import UltralyticsTrackingDetector

__all__ = ["UltralyticsTrackingDetector"]

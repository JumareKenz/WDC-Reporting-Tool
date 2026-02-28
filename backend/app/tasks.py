from datetime import datetime
from .config import OPENAI_API_KEY


def process_voice_note(voice_note_id, file_path, report_id, field_name):
    """Background task: transcribe audio via Whisper and fill the target report field directly."""
    from .database import SessionLocal
    from .models import VoiceNote, Report

    db = SessionLocal()
    try:
        voice_note = db.query(VoiceNote).filter(VoiceNote.id == voice_note_id).first()
        if not voice_note:
            return

        if not OPENAI_API_KEY:
            voice_note.transcription_status = "FAILED"
            db.commit()
            return

        voice_note.transcription_status = "PROCESSING"
        db.commit()

        import openai
        client = openai.OpenAI(api_key=OPENAI_API_KEY)

        with open(file_path, "rb") as audio_file:
            transcript_response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )
            transcript_text = transcript_response.text

        if not transcript_text or not transcript_text.strip():
            voice_note.transcription_status = "FAILED"
            db.commit()
            return

        voice_note.transcription_text = transcript_text
        voice_note.transcription_status = "DONE"
        voice_note.transcribed_at = datetime.utcnow()
        db.commit()

        # Fill the report field directly if it's still empty
        report = db.query(Report).filter(Report.id == report_id).first()
        if report and field_name and not getattr(report, field_name, None):
            setattr(report, field_name, transcript_text.strip())
            db.commit()

    except Exception:
        try:
            voice_note = db.query(VoiceNote).filter(VoiceNote.id == voice_note_id).first()
            if voice_note:
                voice_note.transcription_status = "FAILED"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()

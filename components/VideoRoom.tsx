'use client';

import { useRef, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from '@livekit/components-react';
import '@livekit/components-styles';

type Props = {
  name: string;
  room: string;
  onLeave: () => void;
};

type Feedback = {
  cleanedTranscript: string;
  strengths: string;
  corrections: Array<{
    original: string;
    better: string;
    reason: string;
  }>;
  targetExpressionUsed: boolean | null;
  retrySentence: string;
};

const TARGET_EXPRESSION = "I've been really into ~ lately.";

export default function VideoRoom({ name, room, onLeave }: Props) {
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [status, setStatus] = useState('카메라와 마이크를 연결할 준비가 됐어요.');
  const [loading, setLoading] = useState(false);
  const [errorDetail, setErrorDetail] = useState('');

  // POC: browser speech recognition. Raw text stays hidden during the session.
  const recognitionRef = useRef<any>(null);
  const sttShouldRunRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sttRunning, setSttRunning] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [sttError, setSttError] = useState('');
  const [sttStatus, setSttStatus] = useState('대기 중');

  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  async function joinLiveKitRoom() {
    try {
      setLoading(true);
      setErrorDetail('');
      setStatus('1/3 · LiveKit 토큰 요청 중...');

      const params = new URLSearchParams({ room, username: name });
      const response = await fetch(`/api/livekit-token?${params.toString()}`, {
        cache: 'no-store',
      });

      const raw = await response.text();
      let data: { token?: string; serverUrl?: string; error?: string } = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(`토큰 API 응답을 읽을 수 없어요. HTTP ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `LiveKit token error · HTTP ${response.status}`);
      }

      if (!data.token || !data.serverUrl) {
        throw new Error('토큰 또는 LiveKit 서버 주소가 비어 있어요.');
      }

      setStatus('2/3 · 토큰 발급 성공. LiveKit 서버 연결 시도 중...');
      setToken(data.token);
      setServerUrl(data.serverUrl);
    } catch (error) {
      console.error('Heart Talk token error:', error);
      const message = error instanceof Error ? error.message : '연결 준비에 실패했어요.';
      setStatus('연결 준비 실패');
      setErrorDetail(message);
    } finally {
      setLoading(false);
    }
  }

  function handleConnected() {
    setErrorDetail('');
    setStatus('3/3 · LiveKit 방 연결 완료 ✅');
  }

  function handleDisconnected(reason?: unknown) {
    console.error('Heart Talk disconnected:', reason);
    stopStt();
    setToken('');
    setServerUrl('');
    setStatus('LiveKit 연결이 끊겼어요.');
    setErrorDetail(reason ? `Disconnect reason: ${String(reason)}` : 'START VIDEO를 눌러 다시 연결해보세요.');
  }

  function handleError(error: Error) {
    console.error('Heart Talk LiveKit error:', error);
    setStatus('LiveKit 서버 연결 실패');
    setErrorDetail(`${error.name}: ${error.message}`);
  }

  function createRecognition() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setSttError('이 기기/브라우저에서는 무료 브라우저 음성 인식이 지원되지 않아요.');
      return null;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setSttRunning(true);
      setSttStatus('음성을 텍스트로 기록하고 있어요 🎙️');
      setSttError('');
    };

    recognition.onresult = (event: any) => {
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0]?.transcript || '';
        }
      }

      if (finalText.trim()) {
        setTranscript((prev) => `${prev}${prev ? ' ' : ''}${finalText.trim()}`);
        setSttStatus('음성을 텍스트로 기록하고 있어요 🎙️');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('STT error:', event);
      const error = event.error || 'unknown error';

      if (error === 'no-speech' || error === 'aborted') {
        setSttStatus('기록을 이어가는 중...');
        return;
      }

      setSttError(`STT error: ${error}`);
      setSttStatus('음성 기록 오류');
    };

    recognition.onend = () => {
      if (!sttShouldRunRef.current) {
        setSttRunning(false);
        setSttStatus('기록 중지됨');
        return;
      }

      setSttStatus('기록을 이어가는 중...');
      restartTimerRef.current = setTimeout(() => {
        if (!sttShouldRunRef.current) return;
        try {
          recognition.start();
        } catch (error) {
          console.error('STT restart error:', error);
          setSttError(error instanceof Error ? error.message : 'STT 자동 재연결 실패');
          setSttRunning(false);
        }
      }, 350);
    };

    return recognition;
  }

  function startStt() {
    setSttError('');
    setFeedback(null);
    setFeedbackError('');
    setTranscript('');
    sttShouldRunRef.current = true;

    try {
      const recognition = createRecognition();
      if (!recognition) {
        sttShouldRunRef.current = false;
        return;
      }

      recognitionRef.current = recognition;
      recognition.start();
      setSttStatus('음성 기록 시작 중...');
    } catch (error) {
      console.error('STT start error:', error);
      sttShouldRunRef.current = false;
      setSttError(error instanceof Error ? error.message : 'STT를 시작할 수 없어요.');
      setSttRunning(false);
      setSttStatus('시작 실패');
    }
  }

  function stopStt() {
    sttShouldRunRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // Ignore browser stop errors in this POC.
    }
    recognitionRef.current = null;
    setSttRunning(false);
    setSttStatus('기록 중지됨');
  }

  async function getAiFeedback() {
    stopStt();
    setFeedbackError('');
    setFeedback(null);
    setShowOriginal(false);

    const rawTranscript = transcript.trim();
    if (!rawTranscript) {
      setFeedbackError('아직 기록된 영어 문장이 없어요. 먼저 음성 기록을 시작하고 말해보세요.');
      return;
    }

    try {
      setFeedbackLoading(true);
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: rawTranscript,
          targetExpression: TARGET_EXPRESSION,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'AI 피드백을 만들 수 없어요.');
      }

      setFeedback(data.feedback as Feedback);
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : 'AI 피드백 생성 실패');
    } finally {
      setFeedbackLoading(false);
    }
  }

  return (
    <main className="roomShell">
      <section className="roomHeader">
        <div>
          <div className="eyebrow">HEART ENGLISH</div>
          <h1>Heart Talk Room</h1>
          <p>{room} · {name}</p>
        </div>
        <button className="secondaryButton" onClick={onLeave}>나가기</button>
      </section>

      <section className="guideBar">
        <div>
          <span className="guideLabel">TODAY&apos;S QUESTION</span>
          <strong>What have you been into lately?</strong>
        </div>
        <div>
          <span className="guideLabel">TARGET EXPRESSION</span>
          <strong>{TARGET_EXPRESSION}</strong>
        </div>
        <div className="timerBox">
          <strong>10:00</strong>
          <button className="extendButton" type="button">+5분 연장</button>
        </div>
      </section>

      <section className="videoCard">
        {!token ? (
          <div className="joinPanel">
            <h2>1:1 얼굴 + 음성 연결 테스트</h2>
            <p>노트북과 휴대폰이 같은 Heart Talk 테스트 방으로 들어갑니다.</p>
            <button className="primaryButton" onClick={joinLiveKitRoom} disabled={loading}>
              {loading ? 'CONNECTING...' : 'START VIDEO'}
            </button>
            <span className="roomStatus">{status}</span>
            {errorDetail && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.08)', wordBreak: 'break-word' }}>
                <strong style={{ display: 'block', marginBottom: 6 }}>ERROR DETAIL</strong>
                <span>{errorDetail}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="livekitContainer" data-lk-theme="default" style={{ overflow: 'auto' }}>
            <div style={{ padding: '8px 12px', fontSize: 14 }}>
              {status}
              {errorDetail && <div style={{ marginTop: 6, wordBreak: 'break-word' }}>ERROR: {errorDetail}</div>}
            </div>

            <div style={{ height: '60vh', minHeight: 360 }}>
              <LiveKitRoom
                token={token}
                serverUrl={serverUrl}
                video
                audio
                connect
                data-lk-theme="default"
                style={{ height: '100%' }}
                onConnected={handleConnected}
                onDisconnected={handleDisconnected}
                onError={handleError}
              >
                <VideoConference />
                <RoomAudioRenderer />
              </LiveKitRoom>
            </div>

            <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <strong>Speaking Record · POC</strong>
                {!sttRunning ? (
                  <button className="primaryButton" type="button" onClick={startStt}>START RECORD</button>
                ) : (
                  <button className="secondaryButton" type="button" onClick={stopStt}>STOP RECORD</button>
                )}
                <button className="primaryButton" type="button" onClick={getAiFeedback} disabled={feedbackLoading}>
                  {feedbackLoading ? 'AI 정리 중...' : '세션 종료 · 결과 보기'}
                </button>
              </div>

              <div style={{ marginTop: 10, padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.08)' }}>
                <strong>{sttStatus}</strong>
                <p style={{ margin: '6px 0 0', opacity: 0.72 }}>
                  대화 중에는 문장을 화면에 표시하지 않습니다. 음성 파일은 저장하지 않습니다.
                </p>
              </div>

              {sttError && (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.08)', wordBreak: 'break-word' }}>
                  <strong>STT ERROR</strong>
                  <div>{sttError}</div>
                </div>
              )}

              {feedbackError && (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.08)', wordBreak: 'break-word' }}>
                  <strong>FEEDBACK ERROR</strong>
                  <div>{feedbackError}</div>
                </div>
              )}

              {feedback && (
                <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                  <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.08)' }}>
                    <strong>What I Said · 정리본</strong>
                    <p style={{ marginBottom: 0, lineHeight: 1.6 }}>{feedback.cleanedTranscript}</p>
                    <button
                      className="secondaryButton"
                      type="button"
                      onClick={() => setShowOriginal((prev) => !prev)}
                      style={{ marginTop: 8 }}
                    >
                      {showOriginal ? '원문 숨기기' : 'STT 원문 보기'}
                    </button>
                    {showOriginal && (
                      <p style={{ marginTop: 10, opacity: 0.72, lineHeight: 1.6 }}>{transcript}</p>
                    )}
                  </div>

                  <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.08)' }}>
                    <strong>👍 잘한 점</strong>
                    <p style={{ marginBottom: 0 }}>{feedback.strengths}</p>
                  </div>

                  {feedback.corrections.map((item, index) => (
                    <div key={`${item.original}-${index}`} style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.08)' }}>
                      <strong>✏️ A Little Better {index + 1}</strong>
                      <p style={{ marginBottom: 4 }}><b>Original:</b> {item.original}</p>
                      <p style={{ marginBottom: 4 }}><b>Better:</b> {item.better}</p>
                      <p style={{ marginBottom: 0, opacity: 0.78 }}>{item.reason}</p>
                    </div>
                  ))}

                  <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.08)' }}>
                    <strong>❤️ Target Expression</strong>
                    <p style={{ marginBottom: 0 }}>
                      {feedback.targetExpressionUsed === null
                        ? '이번 세션에는 Target Expression이 없었어요.'
                        : feedback.targetExpressionUsed
                          ? '사용했어요 ✅'
                          : '이번에는 사용하지 않았어요. 다음 대화에서 한번 써보세요.'}
                    </p>
                  </div>

                  <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.08)' }}>
                    <strong>🎙️ Try Again</strong>
                    <p style={{ marginBottom: 0, fontSize: 18 }}>{feedback.retrySentence}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

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

export default function VideoRoom({ name, room, onLeave }: Props) {
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [status, setStatus] = useState('카메라와 마이크를 연결할 준비가 됐어요.');
  const [loading, setLoading] = useState(false);
  const [errorDetail, setErrorDetail] = useState('');

  // POC only: browser speech recognition. Production will move to server-side STT.
  const recognitionRef = useRef<any>(null);
  const sttShouldRunRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sttRunning, setSttRunning] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [sttError, setSttError] = useState('');
  const [sttStatus, setSttStatus] = useState('대기 중');

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
      setSttError('이 브라우저는 현재 STT 테스트를 지원하지 않아요. Chrome에서 다시 테스트해 주세요.');
      return null;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setSttRunning(true);
      setSttStatus('듣는 중 🎙️');
      setSttError('');
    };

    recognition.onspeechstart = () => {
      setSttStatus('말소리 감지됨 · 변환 중...');
    };

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }

      if (finalText.trim()) {
        setTranscript((prev) => `${prev}${prev ? ' ' : ''}${finalText.trim()}`);
        setSttStatus('텍스트 입력됨 ✅ · 계속 듣는 중');
      }
      setInterimTranscript(interimText.trim());
    };

    recognition.onerror = (event: any) => {
      console.error('STT error:', event);
      const error = event.error || 'unknown error';

      if (error === 'no-speech' || error === 'aborted') {
        setSttStatus('잠시 멈춤 · 자동 재연결 중...');
        return;
      }

      setSttError(`STT error: ${error}`);
      setSttStatus('STT 오류');
    };

    recognition.onend = () => {
      setInterimTranscript('');

      if (!sttShouldRunRef.current) {
        setSttRunning(false);
        setSttStatus('중지됨');
        return;
      }

      setSttStatus('STT가 잠시 끊겨 자동 재연결 중...');
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
    sttShouldRunRef.current = true;

    try {
      const recognition = createRecognition();
      if (!recognition) {
        sttShouldRunRef.current = false;
        return;
      }

      recognitionRef.current = recognition;
      recognition.start();
      setSttStatus('STT 시작 중...');
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
      // Ignore browser stop errors in this temporary POC.
    }
    recognitionRef.current = null;
    setSttRunning(false);
    setInterimTranscript('');
    setSttStatus('중지됨');
  }

  function clearTranscript() {
    setTranscript('');
    setInterimTranscript('');
    setSttError('');
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
          <strong>I&apos;ve been really into ~ lately.</strong>
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
                <strong>STT TEST · 내 목소리 → 텍스트</strong>
                {!sttRunning ? (
                  <button className="primaryButton" type="button" onClick={startStt}>START STT</button>
                ) : (
                  <button className="secondaryButton" type="button" onClick={stopStt}>STOP STT</button>
                )}
                <button className="secondaryButton" type="button" onClick={clearTranscript}>CLEAR</button>
              </div>

              <p style={{ marginTop: 8, opacity: 0.75 }}>
                상태: {sttStatus} · 테스트용 브라우저 STT입니다. 음성 파일은 저장하지 않습니다.
              </p>

              <div style={{ marginTop: 10, padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.08)', minHeight: 90, whiteSpace: 'pre-wrap' }}>
                {transcript || interimTranscript ? (
                  <>
                    <span>{transcript}</span>
                    {interimTranscript && <span style={{ opacity: 0.55 }}> {interimTranscript}</span>}
                  </>
                ) : (
                  <span style={{ opacity: 0.55 }}>START STT를 누르고 영어로 말해보세요.</span>
                )}
              </div>

              {sttError && (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.08)', wordBreak: 'break-word' }}>
                  <strong>STT ERROR</strong>
                  <div>{sttError}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

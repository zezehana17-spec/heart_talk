'use client';

import { useState } from 'react';
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
          <div className="livekitContainer" data-lk-theme="default">
            <div style={{ padding: '8px 12px', fontSize: 14 }}>
              {status}
              {errorDetail && <div style={{ marginTop: 6, wordBreak: 'break-word' }}>ERROR: {errorDetail}</div>}
            </div>
            <LiveKitRoom
              token={token}
              serverUrl={serverUrl}
              video
              audio
              connect
              data-lk-theme="default"
              style={{ height: 'calc(100% - 44px)' }}
              onConnected={handleConnected}
              onDisconnected={handleDisconnected}
              onError={handleError}
            >
              <VideoConference />
              <RoomAudioRenderer />
            </LiveKitRoom>
          </div>
        )}
      </section>
    </main>
  );
}

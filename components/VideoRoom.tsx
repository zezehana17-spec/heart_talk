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

  async function joinLiveKitRoom() {
    try {
      setLoading(true);
      setStatus('LiveKit 방에 연결 중...');

      const params = new URLSearchParams({ room, username: name });
      const response = await fetch(`/api/livekit-token?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'LiveKit token error');
      }

      setToken(data.token);
      setServerUrl(data.serverUrl);
      setStatus('연결됨');
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : '연결에 실패했어요.');
    } finally {
      setLoading(false);
    }
  }

  function handleDisconnected() {
    setToken('');
    setServerUrl('');
    setStatus('연결이 끊겼어요. START VIDEO를 눌러 다시 연결해보세요.');
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
          </div>
        ) : (
          <div className="livekitContainer" data-lk-theme="default">
            <LiveKitRoom
              token={token}
              serverUrl={serverUrl}
              video
              audio
              connect
              data-lk-theme="default"
              style={{ height: '100%' }}
              onDisconnected={handleDisconnected}
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

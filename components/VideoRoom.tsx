'use client';

import { useRef, useState } from 'react';

type Props = {
  name: string;
  room: string;
  onLeave: () => void;
};

export default function VideoRoom({ name, room, onLeave }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState('준비 중...');
  const [joined, setJoined] = useState(false);

  async function joinZoomRoom() {
    try {
      setStatus('Zoom 방에 연결 중...');

      const tokenResponse = await fetch('/api/zoom-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionName: room }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(tokenData.error || 'Token error');

      const { default: uitoolkit } = await import('@zoom/videosdk-ui-toolkit');

      if (!containerRef.current) throw new Error('Video container not ready');

      const config = {
        videoSDKJWT: tokenData.token,
        sessionName: room,
        userName: name,
        sessionPasscode: 'hearttalk',
        features: ['video', 'audio', 'users', 'settings'],
      } as any;

      await uitoolkit.joinSession(containerRef.current, config);
      setJoined(true);
      setStatus('연결됨');
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : '연결에 실패했어요.');
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

      <section className="videoCard">
        {!joined && (
          <div className="joinPanel">
            <h2>카메라와 마이크 연결 테스트</h2>
            <p>다른 기기에서도 같은 Room 이름으로 접속하면 서로 얼굴과 음성을 확인할 수 있어요.</p>
            <button className="primaryButton" onClick={joinZoomRoom}>START VIDEO</button>
            <span className="roomStatus">{status}</span>
          </div>
        )}
        <div ref={containerRef} className="zoomContainer" />
      </section>
    </main>
  );
}

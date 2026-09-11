'use client';

import { useState } from 'react';
import VideoRoom from '../components/VideoRoom';

export default function Home() {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('hearttalk-test');
  const [entered, setEntered] = useState(false);

  if (entered) {
    return <VideoRoom name={name || 'Guest'} room={room || 'hearttalk-test'} onLeave={() => setEntered(false)} />;
  }

  return (
    <main className="shell">
      <section className="card">
        <div className="eyebrow">HEART ENGLISH</div>
        <h1>Heart Talk</h1>
        <p className="subtitle">실시간 1:1 Speaking Room 기술 테스트</p>

        <div className="formGroup">
          <label htmlFor="name">이름</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: Hana"
          />
        </div>

        <div className="formGroup">
          <label htmlFor="room">Room</label>
          <input
            id="room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="hearttalk-test"
          />
        </div>

        <button className="primaryButton" onClick={() => setEntered(true)}>
          JOIN ROOM
        </button>

        <div className="statusBox">
          <strong>2차 확인 목표</strong>
          <span>두 기기에서 같은 Room으로 접속해 얼굴과 음성이 연결되는지 확인</span>
        </div>
      </section>
    </main>
  );
}

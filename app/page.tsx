'use client';

import { useState } from 'react';

export default function Home() {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('hearttalk-test');

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

        <button
          className="primaryButton"
          onClick={() => alert(`다음 단계에서 Zoom Video SDK로 ${name || 'Guest'}님을 ${room} 방에 연결할게요.`)}
        >
          JOIN ROOM
        </button>

        <div className="statusBox">
          <strong>1차 확인 목표</strong>
          <span>이 화면이 Vercel에서 정상 배포되는지 확인</span>
        </div>
      </section>
    </main>
  );
}

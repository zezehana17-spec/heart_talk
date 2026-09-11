'use client';

import { useState } from 'react';
import VideoRoom from '../components/VideoRoom';

function makeGuestName() {
  return `Guest-${Math.random().toString(36).slice(2, 7)}`;
}

export default function Home() {
  const [guestName, setGuestName] = useState('');
  const [entered, setEntered] = useState(false);

  function enterTestRoom() {
    setGuestName(makeGuestName());
    setEntered(true);
  }

  if (entered) {
    return (
      <VideoRoom
        name={guestName}
        room="hearttalk-test"
        onLeave={() => setEntered(false)}
      />
    );
  }

  return (
    <main className="shell">
      <section className="card">
        <div className="eyebrow">HEART ENGLISH</div>
        <h1>Heart Talk</h1>
        <p className="subtitle">실시간 1:1 Speaking Room 기술 테스트</p>

        <button className="primaryButton" onClick={enterTestRoom}>
          바로 테스트 입장
        </button>

        <div className="statusBox">
          <strong>로그인 없이 테스트</strong>
          <span>노트북과 휴대폰에서 이 버튼을 누르면 같은 테스트 Room으로 들어갑니다.</span>
        </div>
      </section>
    </main>
  );
}

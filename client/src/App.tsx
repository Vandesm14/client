import React from 'react';
import { createRoot } from 'react-dom/client';

import { init } from './audio';

function App() {
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const audio = React.useRef<HTMLAudioElement>(null);

  React.useEffect(() => {
    if (canvas.current && audio.current) {
      init(canvas.current, audio.current);
    }
  }, []);

  return (
    <>
      <canvas ref={canvas} />
      <audio ref={audio} controls />
      <p id="out"></p>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);

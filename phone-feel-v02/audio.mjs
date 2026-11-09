const SAMPLE_FILES = {
  tap: 'ui_click.ogg', back: 'ui_back.ogg', order: 'ui_confirm.ogg'
};

// Audio is presentational: blocked or muted audio must never block an action.
export function createAudio() {
  let context = null, master = null, enabled = true, volume = 0.35, loading = null;
  const samples = new Map();
  const active = new Set();
  function available() { return enabled && context?.state === 'running' && master; }
  function setVolume(value) {
    if (!Number.isFinite(value)) return;
    volume = Math.max(0, Math.min(1, value));
    if (master && context) master.gain.setTargetAtTime(enabled ? volume * 0.45 : 0, context.currentTime, 0.015);
  }
  function setEnabled(value) { enabled = Boolean(value); setVolume(volume); }
  async function unlock() {
    try {
      if (!context) {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio) return false;
        context = new Audio(); master = context.createGain();
        master.gain.value = enabled ? volume * 0.45 : 0; master.connect(context.destination);
      }
      if (context.state === 'suspended') await context.resume();
      if (!loading) loading = Promise.allSettled(Object.entries(SAMPLE_FILES).map(async ([key,file]) => {
        const response = await fetch(new URL(`./assets/audio/${file}`, import.meta.url));
        if (!response.ok) throw new Error(`Audio sample unavailable: ${file}`);
        const bytes = await response.arrayBuffer();
        if (context?.state === 'closed') return;
        samples.set(key, await context.decodeAudioData(bytes));
      }));
      return context.state === 'running';
    } catch (error) { console.warn('Audio activation unavailable.', error?.message); return false; }
  }
  function track(source) { active.add(source); source.onended=()=>{active.delete(source);source.disconnect();}; }
  function tone(frequency, duration, gain = 0.2, offset = 0, end = frequency, type = 'sine') {
    const start = context.currentTime + offset;
    const oscillator = context.createOscillator(), envelope=context.createGain();
    oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30,end),start+duration);
    envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(gain,start+0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001,start+duration);
    oscillator.connect(envelope);envelope.connect(master);track(oscillator);
    oscillator.start(start);oscillator.stop(start+duration+0.01);
    oscillator.addEventListener('ended',()=>envelope.disconnect(),{once:true});
  }
  function rustle(duration, cutoff, gain) {
    const length=Math.ceil(context.sampleRate*duration);
    const buffer=context.createBuffer(1,length,context.sampleRate), data=buffer.getChannelData(0);
    // Deterministic noise: it affects only this provisional cloth sound.
    let seed=76321;
    for(let i=0;i<length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296*2-1);}
    const source=context.createBufferSource(),filter=context.createBiquadFilter(), envelope=context.createGain();
    source.buffer=buffer;filter.type='lowpass';filter.frequency.value=cutoff;
    const now=context.currentTime;envelope.gain.setValueAtTime(0,now);envelope.gain.linearRampToValueAtTime(gain,now+0.025);envelope.gain.exponentialRampToValueAtTime(0.0001,now+duration);
    source.connect(filter);filter.connect(envelope);envelope.connect(master);track(source);source.start();
    source.addEventListener('ended',()=>{filter.disconnect();envelope.disconnect();},{once:true});
  }
  function sample(key, rate = 1) {
    const buffer=samples.get(key);if(!buffer)return false;
    const source=context.createBufferSource();source.buffer=buffer;source.playbackRate.value=rate;source.connect(master);track(source);source.start();return true;
  }
  function play(event) {
    if(!available())return false;
    if(event==='tap'){if(!sample('tap'))tone(950,0.035,0.12,0,700);}
    else if(event==='back'){if(!sample('back'))tone(630,0.075,0.14,0,430);}
    else if(event==='order'){if(!sample('order')){tone(620,0.14,0.2);tone(930,0.2,0.14,0.085);}}
    else if(event==='notify'){tone(784,0.12,0.18);tone(1047,0.22,0.15,0.105);}
    else if(event==='add'){tone(650,0.075,0.16,0,820);tone(980,0.1,0.1,0.055);}
    else if(event==='refuse'){tone(190,0.07,0.14);tone(160,0.08,0.09,0.075);}
    else if(event==='draw'){rustle(0.19,1300,0.36);tone(150,0.055,0.07,0.12,95);}
    else if(event==='stow'){rustle(0.16,850,0.32);}
    else if(event==='focus'){tone(460,0.055,0.07,0,650);}
    else return false;
    return true;
  }
  return { unlock, play, setVolume, setEnabled,
    dispose(){for(const source of active){try{source.stop();}catch{}}active.clear();master?.disconnect();context?.close().catch(()=>{});context=null;master=null;}
  };
}

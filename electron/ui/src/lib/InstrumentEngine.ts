import * as Tone from 'tone';

export type InstrumentType = 'synth' | 'piano' | 'drums' | 'bass' | 'pad';

export interface InstrumentSettings {
  type: InstrumentType;
  volume: number;
  pan: number;
  effects: {
    reverb?: number;
    delay?: number;
    distortion?: number;
  };
}

export class InstrumentEngine {
  private instruments: Map<string, Tone.PolySynth | Tone.Sampler> = new Map();
  private effects: Map<string, Tone.Effect[]> = new Map();
  private initialized: boolean = false;

  async initialize() {
    await Tone.start();
    this.initialized = true;
    
  }

  createInstrument(id: string, settings: InstrumentSettings): Tone.PolySynth | Tone.Sampler {
    let instrument: Tone.PolySynth | Tone.Sampler;

    switch (settings.type) {
      case 'synth':
        instrument = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 0.3,
            release: 1
          }
        });
        break;

      case 'piano':
        instrument = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: {
            attack: 0.002,
            decay: 0.2,
            sustain: 0.2,
            release: 1.5
          }
        });
        break;

      case 'bass':
        instrument = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: {
            attack: 0.01,
            decay: 0.1,
            sustain: 0.4,
            release: 0.8
          },
          filter: {
            type: 'lowpass',
            frequency: 800,
            rolloff: -24
          }
        });
        break;

      case 'pad':
        instrument = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'square' },
          envelope: {
            attack: 0.5,
            decay: 0.3,
            sustain: 0.7,
            release: 2
          }
        });
        break;

      case 'drums':
        // Simple drum sampler (you would load actual samples here)
        instrument = new Tone.PolySynth(Tone.MembraneSynth);
        break;

      default:
        instrument = new Tone.PolySynth(Tone.Synth);
    }

    // Setup effects chain
    const effectsChain: Tone.Effect[] = [];
    
    if (settings.effects.reverb !== undefined && settings.effects.reverb > 0) {
      const reverb = new Tone.Reverb(settings.effects.reverb);
      effectsChain.push(reverb);
    }

    if (settings.effects.delay !== undefined && settings.effects.delay > 0) {
      const delay = new Tone.FeedbackDelay(settings.effects.delay / 1000, 0.5);
      effectsChain.push(delay);
    }

    if (settings.effects.distortion !== undefined && settings.effects.distortion > 0) {
      const distortion = new Tone.Distortion(settings.effects.distortion);
      effectsChain.push(distortion);
    }

    // Connect effects chain
    const panner = new Tone.Panner(settings.pan);
    const volume = new Tone.Volume(Tone.gainToDb(settings.volume));

    if (effectsChain.length > 0) {
      instrument.chain(...effectsChain, panner, volume, Tone.Destination);
      this.effects.set(id, effectsChain);
    } else {
      instrument.chain(panner, volume, Tone.Destination);
    }

    this.instruments.set(id, instrument);
    return instrument;
  }

  playNote(instrumentId: string, note: number, velocity: number, duration: number = 0.5) {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument) {
      console.warn(`Instrument ${instrumentId} not found`);
      return;
    }

    const frequency = this.noteToFrequency(note);
    const normalizedVelocity = velocity / 127;
    
    instrument.triggerAttackRelease(frequency, duration, Tone.now(), normalizedVelocity);
  }

  startNote(instrumentId: string, note: number, velocity: number) {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument) return;

    const frequency = this.noteToFrequency(note);
    const normalizedVelocity = velocity / 127;
    
    instrument.triggerAttack(frequency, Tone.now(), normalizedVelocity);
  }

  stopNote(instrumentId: string, note: number) {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument) return;

    const frequency = this.noteToFrequency(note);
    instrument.triggerRelease(frequency, Tone.now());
  }

  updateInstrumentSettings(instrumentId: string, settings: Partial<InstrumentSettings>) {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument) return;

    // Update volume and pan would require recreating the effects chain
    // For now, just log the update
    
  }

  removeInstrument(instrumentId: string) {
    const instrument = this.instruments.get(instrumentId);
    if (instrument) {
      instrument.disconnect();
      instrument.dispose();
      this.instruments.delete(instrumentId);
    }

    const effects = this.effects.get(instrumentId);
    if (effects) {
      effects.forEach(effect => effect.dispose());
      this.effects.delete(instrumentId);
    }
  }

  dispose() {
    this.instruments.forEach(instrument => {
      instrument.disconnect();
      instrument.dispose();
    });
    this.effects.forEach(effects => {
      effects.forEach(effect => effect.dispose());
    });
    this.instruments.clear();
    this.effects.clear();
  }

  private noteToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }
}

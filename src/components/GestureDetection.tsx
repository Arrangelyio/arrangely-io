import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';


interface GestureDetectionProps {
  onGestureDetected: (gesture: string) => void;
  isEnabled: boolean;
}

const GestureDetection: React.FC<GestureDetectionProps> = ({ onGestureDetected, isEnabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const faceDetectorRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const handDetectorRef = useRef<handPoseDetection.HandDetector | null>(null);
  const animationFrameRef = useRef<number>();

  const leftEyeClosedRef = useRef(false);
  const rightEyeClosedRef = useRef(false);
  const lastGestureRef = useRef<string | null>(null);
  const lastGestureTimeRef = useRef<number>(0);
  const gestureCooldown = 1000; // 1 detik

  let lastGestureTime = 0;
  let neutralAngle: number | null = null;
  let tiltStableStart: number | null = null;
  let eyesClosedStart: number | null = null;
  let bothHandsGestureStart: number | null = null;

  useEffect(() => {
    if (!isEnabled) {
      stopDetection();
      return;
    }

    initializeDetection();

    return () => {
      stopDetection();
    };
  }, [isEnabled]);

  const initializeDetection = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      await tf.ready();
      

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve, reject) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve(true);
            videoRef.current.onerror = reject;
          }
        });
        await videoRef.current.play();
        
      }

      // Face Detector with MediaPipe runtime
      const faceModel = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      const faceDetector = await faceLandmarksDetection.createDetector(faceModel, {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
        refineLandmarks: true, // <--- WAJIB untuk deteksi detail wajah
      });
      faceDetectorRef.current = faceDetector;


      // Hand Detector with MediaPipe runtime
      const handModel = handPoseDetection.SupportedModels.MediaPipeHands;
      const handDetector = await handPoseDetection.createDetector(handModel, {
        runtime: 'mediapipe',
        solutionPath: '/mediapipe/hands',
        modelType: 'lite'
      });
      handDetectorRef.current = handDetector;

      setIsLoading(false);
      
      startDetection();

    } catch (err: any) {
      console.error('Error initializing gesture detection:', err);
      setError(err.message || 'Failed to initialize camera or models');
      setIsLoading(false);
    }
  };

  const startDetection = () => {
    if (!videoRef.current || !handDetectorRef.current) return;

    const detect = async () => {
      if (!videoRef.current || !isEnabled) return;

      try {
        const faces = await faceDetectorRef.current.estimateFaces(videoRef.current);
        if (faces.length > 0) detectEyeBlinkHold(faces);

        const hands = await handDetectorRef.current!.estimateHands(videoRef.current);
        if (hands.length > 0) detectHandGestures(hands);

        drawLandmarks(faces, hands);

      } catch (err) {
        console.error('Detection error:', err);
      }

      if (isEnabled) {
        animationFrameRef.current = requestAnimationFrame(detect);
      }
    };

    detect();
  };

  const calculateEAR = (eyePoints: any[]) => {
    const vertical1 = Math.abs(eyePoints[1].y - eyePoints[5].y);
    const vertical2 = Math.abs(eyePoints[2].y - eyePoints[4].y);
    const horizontal = Math.abs(eyePoints[0].x - eyePoints[3].x);
    return (vertical1 + vertical2) / (2.0 * horizontal);
  };

  const detectEyeBlinkHold = (faces: any[]) => {
    if (faces.length === 0) return;

    const keypoints = faces[0].keypoints;
    const leftEye = [keypoints[33], keypoints[160], keypoints[158], keypoints[133], keypoints[153], keypoints[144]];
    const rightEye = [keypoints[362], keypoints[385], keypoints[387], keypoints[263], keypoints[373], keypoints[380]];

    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    const EAR_THRESHOLD = 0.20; // adjust as needed

    const now = Date.now();
    const eyesClosed = leftEAR < EAR_THRESHOLD && rightEAR < EAR_THRESHOLD;

    if (eyesClosed) {
      if (!eyesClosedStart) {
        eyesClosedStart = now;
      } else if (now - eyesClosedStart >= 2000) { // 2 seconds hold
        if (now - lastGestureTimeRef.current > gestureCooldown) {
          triggerGesture('next-song'); // or previous-song if you want 2 different patterns
          lastGestureTimeRef.current = now;
        }
      }
    } else {
      eyesClosedStart = null; // reset if eyes open
    }
  };

  const detectFaceTilt = (faces: any[]) => {
    if (faces.length === 0) return;

    const keypoints = faces[0].keypoints;
    const leftEar = keypoints.find((p: any) => p.name === 'leftEar');
    const rightEar = keypoints.find((p: any) => p.name === 'rightEar');
    if (!leftEar || !rightEar) return;

    // Hitung sudut kemiringan kepala
    const tiltAngle = Math.atan2(leftEar.y - rightEar.y, leftEar.x - rightEar.x) * (180 / Math.PI);

    if (neutralAngle === null) {
      neutralAngle = tiltAngle; // Simpan posisi netral awal
      return;
    }

    const diffAngle = tiltAngle - neutralAngle;
    const threshold = 15; // derajat (bisa disesuaikan)

    let gesture: string | null = null;
    if (diffAngle > threshold) {
      gesture = 'next-song'; // miring ke kanan
    } else if (diffAngle < -threshold) {
      gesture = 'previous-song'; // miring ke kiri
    }

    const now = Date.now();

    if (gesture) {
      if (!tiltStableStart) {
        tiltStableStart = now; // mulai hitung durasi stabil
      } else if (now - tiltStableStart > 500) { // harus stabil 0.5 detik
        if (
          gesture !== lastGestureRef.current ||
          now - lastGestureTimeRef.current > gestureCooldown
        ) {
          lastGestureRef.current = gesture;
          lastGestureTimeRef.current = now;
          triggerGesture(gesture);
        }
        tiltStableStart = null; // reset setelah trigger
      }
    } else {
      tiltStableStart = null; // reset kalau kembali normal
    }
  };

  const detectEyeBlinks = (face: any) => {
    const keypoints = face.keypoints;
    const leftEye = [keypoints[33], keypoints[160], keypoints[158], keypoints[133], keypoints[153], keypoints[144]];
    const rightEye = [keypoints[362], keypoints[385], keypoints[387], keypoints[263], keypoints[373], keypoints[380]];

    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);

    // if (leftEAR < 0.20 && !leftEyeClosedRef.current) {
    //   triggerGesture('left-eye-blink'); // Previous
    // }
    // leftEyeClosedRef.current = leftEAR < 0.20;

    // if (rightEAR < 0.20 && !rightEyeClosedRef.current) {
    //   triggerGesture('right-eye-blink'); // Next
    // }
    rightEyeClosedRef.current = rightEAR < 0.20;
  };

const detectHandGestures = (hands: any[]) => {
  const now = Date.now();

  if (hands.length === 2) {
    const hand1 = hands[0];
    const hand2 = hands[1];
    const landmarks1 = hand1.keypoints;
    const landmarks2 = hand2.keypoints;

    const hand1Open = isAllFingersOpen(landmarks1);
    const hand2Open = isAllFingersOpen(landmarks2);

    const hand1Closed = isAllFingersClosed(landmarks1);
    const hand2Closed = isAllFingersClosed(landmarks2);
    
    let gesture: string | null = null;

    if (hand1Open && hand2Open) {
      gesture = "next-song";
    } else if (hand1Closed && hand2Closed) {
      gesture = "previous-song";
    }

    if (gesture) {
      if (!bothHandsGestureStart) {
        bothHandsGestureStart = now; // mulai hitung stabil
      } else if (now - bothHandsGestureStart > 1000) {
        // stabil selama 1 detik
        if (now - lastGestureTimeRef.current > 3000) {
          // cooldown 3 detik
          triggerGesture(gesture);
          lastGestureTimeRef.current = now;
        }
      }
    } else {
      bothHandsGestureStart = null; // reset kalau tidak konsisten
    }
  } else {
    bothHandsGestureStart = null; // reset kalau tidak 2 tangan
  }

  for (const hand of hands) {
    const landmarks = hand.keypoints;
    const handedness = hand.handedness; // 'Left' atau 'Right'

    // Cek 5 jari terbuka
    // if (isAllFingersOpen(landmarks)) {
    //   let gesture: string | null = null;
    //   if (handedness === 'Right') {
    //     gesture = 'next-song';
    //   } else if (handedness === 'Left') {
    //     gesture = 'previous-song';
    //   }

    //   if (
    //     gesture &&
    //     (gesture !== lastGestureRef.current || now - lastGestureTimeRef.current > gestureCooldown)
    //   ) {
    //     lastGestureRef.current = gesture;
    //     lastGestureTimeRef.current = now;
    //     triggerGesture(gesture);
    //     return;
    //   }
    // }

    const indexTip = landmarks[8];
    const wrist = landmarks[0];
    const videoWidth = videoRef.current?.videoWidth || 640;

    // Cek apakah ada pergerakan horizontal yang cukup signifikan
    if (Math.abs(indexTip.x - wrist.x) > videoWidth * 0.05) {
      let gesture: string | null = null;

      // Logika yang sudah diperbaiki
      if (indexTip.x > wrist.x) {
        // Tangan menunjuk ke KANAN fisik -> Next Section
        gesture = 'next-section'; 
      } else {
        // Tangan menunjuk ke KIRI fisik -> Previous Section
        gesture = 'previous-section';
      }

      if (
        gesture &&
        (gesture !== lastGestureRef.current || now - lastGestureTimeRef.current > gestureCooldown)
      ) {
        lastGestureRef.current = gesture;
        lastGestureTimeRef.current = now;
        // console.log sudah ada di sini, jadi yang di triggerGesture bisa dihapus
        triggerGesture(gesture);
      }
    }
  }
};

  const triggerGesture = (gesture: string) => {
    const now = Date.now();
    if (now - lastGestureTime > 700) {
      
      onGestureDetected(gesture);
      lastGestureTime = now;
    }
  };

  const isAllFingersOpen = (landmarks: any[]) => {
    return (
      isFingerOpen(4, 2, landmarks) &&
      isFingerOpen(8, 6, landmarks) &&
      isFingerOpen(12, 10, landmarks) &&
      isFingerOpen(16, 14, landmarks) &&
      isFingerOpen(20, 18, landmarks)
    );
  };

  const isAllFingersClosed = (landmarks: any[]) => {
    return (
      !isFingerOpen(4, 2, landmarks) &&
      !isFingerOpen(8, 6, landmarks) &&
      !isFingerOpen(12, 10, landmarks) &&
      !isFingerOpen(16, 14, landmarks) &&
      !isFingerOpen(20, 18, landmarks)
    );
  };

  const isFingerOpen = (tipIndex: number, baseIndex: number, landmarks: any[]) => {
    return landmarks[tipIndex].y < landmarks[baseIndex].y;
  };

  const drawLandmarks = (faces: any[], hands: any[]) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ctx.fillStyle = 'red';
    // faces.forEach(face => {
    //   face.keypoints.forEach((point: any) => {
    //     ctx.beginPath();
    //     ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
    //     ctx.fill();
    //   });
    // });

    ctx.fillStyle = 'blue';
    hands.forEach(hand => {
      hand.keypoints.forEach((point: any) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
  };

  const stopDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  if (!isEnabled) return null;

  return (
    <div className="gesture-detection">
      <div className="relative">
        <video
          ref={videoRef}
          className="w-64 h-48 bg-black rounded-lg border-2 border-border"
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-64 h-48 pointer-events-none"
        />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <div className="text-white text-sm">Loading models...</div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500 bg-opacity-90 rounded-lg p-4">
            <div className="text-white text-sm text-center mb-3">{error}</div>
            <button
              onClick={initializeDetection}
              className="px-3 py-1 bg-white text-red-600 rounded text-xs font-medium hover:bg-gray-100"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        <p>Gestures:</p>
        <p>• Point left → Previous section</p>
        <p>• Point right → Next section</p>
      </div>
    </div>
  );
};

export default GestureDetection;

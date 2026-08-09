import Ionicons from '@expo/vector-icons/Ionicons';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import BackButton from '../../src/components/BackButton';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

/* =========================================================
   SLIDES (Edit backgroundColor + audio per slide here)
========================================================= */

const SLIDES = [
  {
    name: 'Forest',
    gradient: ['#6ACBA5', '#B2EFBC', '#B1D8B7'] as const, 
    orbColor: '#7FBF9E',
    boxColor: 'rgba(255,255,255,0.9)',
    audio: require('@/assets/audio/forest.mp3'),
  },
  {
    name: 'Calm Sky',
    gradient: ['#6AABCB', '#B2EFEA', '#B1CFD8'] as const,
    orbColor: '#6FA8D8',
    boxColor: 'rgba(255,255,255,0.9)',
    // audio: require('@/assets/audio/rain.mp3'), // add once sourced
  },
  {
    name: 'Sunset',
    gradient: ['#FFBB6A', '#EFDEB2', '#D8B9B1'] as const,
    orbColor: '#F2A97E',
    boxColor: 'rgba(255,255,255,0.9)',
    // audio: require('@/assets/audio/ocean.mp3'), // add once sourced
  },
];

/* =========================================================
   BREATHING PHASES — fixed 4-4-4-4 box breathing
========================================================= */

const PHASES = [
  { label: 'Inhale', duration: 4000, scaleTo: 1.4, moves: true },
  { label: 'Hold', duration: 4000, scaleTo: 1.4, moves: false },
  { label: 'Exhale', duration: 4000, scaleTo: 1, moves: true },
  { label: 'Hold', duration: 4000, scaleTo: 1, moves: false },
];

/* =========================================================
   DIMENSIONS
========================================================= */

const BOX_SIZE = 300;
const ORB_SIZE = 60;
const ORB_RADIUS = ORB_SIZE / 2;

const CORNERS = [
  { x: -BOX_SIZE / 2 + ORB_RADIUS, y: -BOX_SIZE / 2 + ORB_RADIUS },
  { x: BOX_SIZE / 2 - ORB_RADIUS, y: -BOX_SIZE / 2 + ORB_RADIUS },
  { x: BOX_SIZE / 2 - ORB_RADIUS, y: BOX_SIZE / 2 - ORB_RADIUS },
  { x: -BOX_SIZE / 2 + ORB_RADIUS, y: BOX_SIZE / 2 - ORB_RADIUS },
];

/* =========================================================
   COMPONENT
========================================================= */

export default function GuidedBreathingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('Inhale');

  const phaseRef = useRef(0);
  const cornerRef = useRef(0); // tracks position separately from phase

  const orbX = useRef(new Animated.Value(CORNERS[0].x)).current;
  const orbY = useRef(new Animated.Value(CORNERS[0].y)).current;
  const scale = useRef(new Animated.Value(1)).current;

  /* =========================================================
     BREATHING LOOP — Hold phases pause position, only Inhale/Exhale move
  ========================================================= */

  useEffect(() => {
    let isMounted = true;
    let holdTimeout: ReturnType<typeof setTimeout>;

    const runBreathingCycle = () => {
      const currentPhase = PHASES[phaseRef.current];
      setPhaseLabel(currentPhase.label);

      const advance = () => {
        if (!isMounted) return;
        phaseRef.current = (phaseRef.current + 1) % PHASES.length;
        runBreathingCycle();
      };

      if (currentPhase.moves) {
        // Inhale/Exhale: animate position to next corner + scale
        const nextCorner = CORNERS[(cornerRef.current + 1) % CORNERS.length];

        Animated.parallel([
          Animated.timing(orbX, {
            toValue: nextCorner.x,
            duration: currentPhase.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(orbY, {
            toValue: nextCorner.y,
            duration: currentPhase.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: currentPhase.scaleTo,
            duration: currentPhase.duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(() => {
          cornerRef.current = (cornerRef.current + 1) % CORNERS.length;
          advance();
        });
      } else {
        // Hold: no position change — just wait out the duration
        holdTimeout = setTimeout(advance, currentPhase.duration);
      }
    };

    runBreathingCycle();

    return () => {
      isMounted = false;
      clearTimeout(holdTimeout);
    };
  }, [orbX, orbY, scale]);

  /* =========================================================
     AUDIO — offline, bundled per slide
  ========================================================= */

  useEffect(() => {
    let sound: Audio.Sound | null = null;
    let isMounted = true;

    const playSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: 1,
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1,
          playThroughEarpieceAndroid: false,
        });

        const slideAudio = SLIDES[currentSlide].audio;
        if (!slideAudio) return;

        const { sound: newSound } = await Audio.Sound.createAsync(slideAudio, {
          isLooping: true,
          volume: 1.0,
          shouldPlay: true,
        });

        if (!isMounted) return;
        sound = newSound;
      } catch (error) {
        console.log('Audio error:', error);
      }
    };

    playSound();

    return () => {
      isMounted = false;
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [currentSlide]);

  /* =========================================================
     SLIDE NAVIGATION
  ========================================================= */

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <LinearGradient
      colors={SLIDES[currentSlide].gradient}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.fullScreen}
>
      <BackButton />

      <Pressable style={styles.arrowLeft} onPress={prevSlide}>
        <Ionicons name="chevron-back-circle" size={50} color="white" />
      </Pressable>

      <Pressable style={styles.arrowRight} onPress={nextSlide}>
        <Ionicons name="chevron-forward-circle" size={50} color="white" />
      </Pressable>

      <View style={styles.centerContainer} pointerEvents="box-none">
        <View style={[styles.box, { backgroundColor: SLIDES[currentSlide].boxColor }]}>
          <Text style={styles.phaseText}>{phaseLabel}</Text>

          <Animated.View
            style={[
              styles.orb,
              {
                backgroundColor: SLIDES[currentSlide].orbColor,
                shadowColor: SLIDES[currentSlide].orbColor,
                transform: [{ translateX: orbX }, { translateY: orbY }, { scale: scale }],
              },
            ]}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, width, height },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseText: { fontSize: 30, fontWeight: '600', color: '#333' },
  orb: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_RADIUS,
    shadowOpacity: 0.9,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  arrowLeft: { position: 'absolute', left: 20, top: '50%' },
  arrowRight: { position: 'absolute', right: 20, top: '50%' },
});
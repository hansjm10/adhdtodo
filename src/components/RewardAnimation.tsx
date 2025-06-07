// ABOUTME: Celebration animation component for task completion rewards
// Provides confetti, emoji rain, and other visual feedback for ADHD dopamine rewards

import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, Text } from 'react-native';
import { animationHelpers, duration } from '../styles/animations';

interface RewardAnimationProps {
  visible: boolean;
  onComplete?: () => void;
  type?: 'confetti' | 'stars' | 'emoji';
  emoji?: string;
}

interface Particle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotation: Animated.Value;
  color?: string;
  emoji?: string;
  startX: number;
}

const CELEBRATION_EMOJIS = ['🎉', '✨', '🌟', '⭐', '🎊', '💫', '🏆', '🎯'];
const CONFETTI_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

export const RewardAnimation: React.FC<RewardAnimationProps> = ({
  visible,
  onComplete,
  type = 'confetti',
  emoji = '✨',
}) => {
  const particles = useRef<Particle[]>([]);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    if (visible) {
      startAnimation();
    }
  }, [visible]);

  const createParticle = (index: number): Particle => {
    const startX = Math.random() * screenWidth;
    const startY = screenHeight * 0.3 + Math.random() * 100;

    return {
      id: index,
      x: animationHelpers.createValue(startX),
      y: animationHelpers.createValue(startY),
      opacity: animationHelpers.createValue(1),
      scale: animationHelpers.createValue(0),
      rotation: animationHelpers.createValue(0),
      color:
        type === 'confetti'
          ? CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
          : undefined,
      emoji:
        type === 'emoji'
          ? CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)]
          : emoji,
      startX,
    };
  };

  const startAnimation = () => {
    // Create particles
    const particleCount = type === 'emoji' ? 8 : 20;
    particles.current = Array.from({ length: particleCount }, (_, i) => createParticle(i));

    // Animate each particle
    const animations = particles.current.map((particle) => {
      const xDrift = (Math.random() - 0.5) * 200;
      const yTarget = -screenHeight * 0.8 - Math.random() * 200;
      const rotationTarget = (Math.random() - 0.5) * 720;

      return Animated.parallel([
        // Scale in then out
        Animated.sequence([
          Animated.spring(particle.scale, {
            toValue: 1 + Math.random() * 0.5,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: 0,
            duration: duration.slow,
            delay: duration.normal,
            useNativeDriver: true,
          }),
        ]),
        // Move up with drift
        Animated.timing(particle.y, {
          toValue: yTarget,
          duration: duration.verySlow * 2,
          useNativeDriver: true,
        }),
        Animated.timing(particle.x, {
          toValue: particle.startX + xDrift,
          duration: duration.verySlow * 2,
          useNativeDriver: true,
        }),
        // Rotate
        Animated.timing(particle.rotation, {
          toValue: rotationTarget,
          duration: duration.verySlow * 2,
          useNativeDriver: true,
        }),
        // Fade out
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: duration.slow,
          delay: duration.verySlow,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start(() => {
      if (onComplete) {
        onComplete();
      }
    });
  };

  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50" pointerEvents="none">
      {particles.current.map((particle) => (
        <Animated.View
          key={particle.id}
          className="absolute"
          style={{
            transform: [
              { translateX: particle.x },
              { translateY: particle.y },
              { scale: particle.scale },
              {
                rotate: particle.rotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
            opacity: particle.opacity,
          }}
        >
          {type === 'confetti' ? (
            <View className="w-2.5 h-5 rounded-sm" style={{ backgroundColor: particle.color }} />
          ) : (
            <Text className="text-3xl">{particle.emoji}</Text>
          )}
        </Animated.View>
      ))}
    </View>
  );
};

export default RewardAnimation;

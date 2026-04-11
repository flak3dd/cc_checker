import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, StatusBar } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoSplashProps {
  onFinish: () => void;
}

const VIDEO_SOURCE = require('@/assets/images/grok-video-ae0e98fc-409e-4c34-b043-f95a012eb150-3.mp4');

export const VideoSplash: React.FC<VideoSplashProps> = ({ onFinish }) => {
  const videoRef = useRef<Video>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (videoRef.current && !finishedRef.current) {
      videoRef.current.playAsync().catch(() => {
        if (!finishedRef.current) {
          finishedRef.current = true;
          onFinish();
        }
      });
    }
    return () => { finishedRef.current = true; };
  }, [onFinish]);

  const handlePlaybackStatus = (status: AVPlaybackStatus) => {
    if (!finishedRef.current && status.isLoaded && status.didJustFinish) {
      finishedRef.current = true;
      onFinish();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Video
        ref={videoRef}
        source={VIDEO_SOURCE}
        style={styles.video}
        resizeMode={ResizeMode.COVER as any}
        shouldPlay={true}
        isLooping={false}
        isMuted={true}
        onPlaybackStatusUpdate={handlePlaybackStatus}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 9999,
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
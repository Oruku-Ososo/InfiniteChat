// Placeholder for Voice features

export const startListening = async (_onResult: (text: string) => void) => {
  console.log('Started listening for voice input...');
  // Whisper STT implementation will go here
};

export const stopListening = async () => {
  console.log('Stopped listening for voice input...');
};

export const speak = async (text: string) => {
  console.log(`Speaking: ${text}...`);
  // Local TTS implementation will go here
};

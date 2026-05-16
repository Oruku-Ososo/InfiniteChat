export const config = {
  databaseName: 'chat.db',
  databaseLocation: 'default',
  defaultModelUrl:
    'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
  defaultModelFilename: 'tinyllama.gguf',
  defaultSystemPrompt: 'You are a helpful AI assistant.',
  defaultTemperature: 0.7,
  maxContextSize: 2048,
};

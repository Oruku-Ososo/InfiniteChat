import {initLlama, LlamaContext} from 'llama.rn';
import RNFS from 'react-native-fs';
import {config} from '../config';
import {MessageRow} from './database';

let llamaContext: LlamaContext | null = null;

export const loadLlamaModel = async (modelPath: string): Promise<boolean> => {
  try {
    const exists = await RNFS.exists(modelPath);
    if (!exists) {
      console.error('Model file does not exist at path:', modelPath);
      return false;
    }

    if (llamaContext) {
      try {
        await llamaContext.release();
      } catch (e) {
        console.log("Could not release context or it was already released.", e);
      }
      llamaContext = null;
    }

    llamaContext = await initLlama({
      model: modelPath,
      use_mlock: true,
      n_ctx: config.maxContextSize,
      n_gpu_layers: 0,
    });

    return true;
  } catch (error) {
    console.error('Error loading model:', error);
    return false;
  }
};

export const generateCompletion = async (
  systemPrompt: string,
  history: MessageRow[],
  userPrompt: string,
  temperature: number,
  onToken: (token: string) => void,
): Promise<string> => {
  if (!llamaContext) {
    throw new Error('Model not loaded');
  }

  let fullResponseTokens: string[] = [];

  // Exclude ID to match expected schema by llama.rn if needed,
  // but llama.rn accepts objects with role and content.
  const formattedHistory = history.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  await llamaContext.completion(
    {
      messages: [
        {role: 'system', content: systemPrompt},
        ...formattedHistory,
        {role: 'user', content: userPrompt},
      ],
      n_predict: 400,
      stop: ['</s>', '<|end|>', '<|eot_id|>'],
      temperature: temperature,
    },
    (data: any) => {
      fullResponseTokens.push(data.token);
      onToken(fullResponseTokens.join(''));
    },
  );

  return fullResponseTokens.join('');
};

export const hasLlamaContext = () => llamaContext !== null;

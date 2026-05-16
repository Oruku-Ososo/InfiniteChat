import React, {useEffect, useState, useCallback} from 'react';
import {View, StyleSheet, Button} from 'react-native';
import {GiftedChat, IMessage} from 'react-native-gifted-chat';
import {useAppStore} from '../store';
import {
  initDB,
  loadHistory,
  saveMessage,
  clearHistory,
  MessageRow,
} from '../services/database';
import {generateCompletion, hasLlamaContext} from '../services/llama';
import {useFocusEffect} from '@react-navigation/native';
import {searchContext} from '../services/rag';
import {startListening, stopListening} from '../services/voice';
import DocumentPicker from 'react-native-document-picker';

export const ChatScreen = () => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const {systemPrompt, temperature, isModelLoaded} = useAppStore();
  const [dbHistory, setDbHistory] = useState<MessageRow[]>([]);

  useEffect(() => {
    initDB();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory(rows => {
        setDbHistory(rows);
        const giftedMessages: IMessage[] = rows
          .map((row, index) => ({
            _id: row.id || index,
            text: row.content,
            createdAt: new Date(), // DB doesn't store timestamps currently
            user: {
              _id: row.role === 'user' ? 1 : 2,
              name: row.role === 'user' ? 'You' : 'Assistant',
            },
          }))
          .reverse(); // GiftedChat expects latest messages first
        setMessages(giftedMessages);
      });
    }, []),
  );

  const onSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      if (!hasLlamaContext() || !isModelLoaded) {
        alert('Please load a model first in the Models tab.');
        return;
      }

      const contextAddition = await searchContext(newMessages[0].text);
      const enhancedPrompt = contextAddition
        ? `Context:\n${contextAddition}\n\n${systemPrompt}`
        : systemPrompt;

      const userMsg = newMessages[0];
      setMessages(previousMessages =>
        GiftedChat.append(previousMessages, newMessages),
      );
      saveMessage('user', userMsg.text);

      // Update local history for the LLM context
      setDbHistory(prev => [...prev, {role: 'user', content: userMsg.text}]);

      setIsGenerating(true);

      // Create a temporary message for the assistant's streaming response
      const assistantMsgId = Math.random().toString();
      setMessages(previousMessages =>
        GiftedChat.append(previousMessages, [
          {
            _id: assistantMsgId,
            text: '...',
            createdAt: new Date(),
            user: {_id: 2, name: 'Assistant'},
          },
        ]),
      );

      try {
        const fullResponse = await generateCompletion(
          enhancedPrompt,
          dbHistory,
          userMsg.text,
          temperature,
          tokenStream => {
            setMessages(previousMessages =>
              previousMessages.map(msg =>
                msg._id === assistantMsgId ? {...msg, text: tokenStream} : msg,
              ),
            );
          },
        );

        saveMessage('assistant', fullResponse);
        setDbHistory(prev => [
          ...prev,
          {role: 'assistant', content: fullResponse},
        ]);
      } catch (error) {
        console.error(error);
        setMessages(previousMessages =>
          previousMessages.map(msg =>
            msg._id === assistantMsgId
              ? {...msg, text: 'Error generating response.'}
              : msg,
          ),
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [dbHistory, systemPrompt, temperature, isModelLoaded],
  );

  const onClear = () => {
    clearHistory(() => {
      setMessages([]);
      setDbHistory([]);
    });
  };

  const handleVoiceInput = () => {
    startListening(text => {
      onSend([
        {
          _id: Math.random().toString(),
          text,
          createdAt: new Date(),
          user: {_id: 1, name: 'You'},
        },
      ]);
      stopListening();
    });
  };

  const pickDocumentForRAG = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.plainText],
      });
      if (res && res.length > 0) {
        alert(`Document ${res[0].name} selected for RAG. Processing...`);
        // loadDocument(res[0].uri);
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error(err);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerActions}>
        <Button title="Load Document (RAG)" onPress={pickDocumentForRAG} />
        <Button title="Voice Input" onPress={handleVoiceInput} />
      </View>
      {messages.length > 0 && (
        <View style={styles.header}>
          <Button title="Clear Chat" onPress={onClear} color="red" />
        </View>
      )}
      <GiftedChat
        messages={messages}
        onSend={msgs => onSend(msgs)}
        user={{_id: 1}}
        isTyping={isGenerating}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'flex-end',
    padding: 10,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
});

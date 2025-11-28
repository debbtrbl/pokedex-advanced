import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CacheData {
  data: any;
  timestamp: number;
  ttl: number;
}

export interface UseCacheReturn {
  salvarNoCache: (chave: string, dados: any, ttl?: number) => Promise<void>;
  buscarDoCache: (chave: string) => Promise<any | null>;
  usandoCache: boolean;
}

const useCache = (ttlPadrao: number = 1000 * 60 * 60 * 24): UseCacheReturn => {
  const [usandoCache, setUsandoCache] = useState(false);

  const cacheExpirado = useCallback((cacheData: CacheData): boolean => {
    return Date.now() - cacheData.timestamp > cacheData.ttl;
  }, []);

  const salvarNoCache = useCallback(async (chave: string, dados: any, ttl: number = ttlPadrao) => {
    const cacheData: CacheData = {
      data: dados,
      timestamp: Date.now(),
      ttl: ttl
    };

    try {
      await AsyncStorage.setItem(`cache_${chave}`, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Erro ao salvar no cache:', error);
    }
  }, [ttlPadrao]);

  const buscarDoCache = useCallback(async (chave: string): Promise<any | null> => {
    let cacheEncontrado = false;
    
    try {
      const cacheStorage = await AsyncStorage.getItem(`cache_${chave}`);
      if (cacheStorage) {
        const cacheData: CacheData = JSON.parse(cacheStorage);
        
        if (!cacheExpirado(cacheData)) {
          cacheEncontrado = true;
          setUsandoCache(true); 
          return cacheData.data;
        } else {
          // remove expirado
          await AsyncStorage.removeItem(`cache_${chave}`);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar do cache:', error);
    }

    // se não encontrou cache, marca como não usando cache
    if (!cacheEncontrado) {
      setUsandoCache(false);
    }
    
    return null;
  }, [cacheExpirado]);

  return {
    salvarNoCache,
    buscarDoCache,
    usandoCache
  };
};

export default useCache;
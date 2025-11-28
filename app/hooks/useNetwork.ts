import { useState, useEffect, useRef } from 'react';

export interface UseNetworkReturn {
  isOffline: boolean;
  isOnline: boolean;
}

const useNetwork = (): UseNetworkReturn => {
  const [isOffline, setIsOffline] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // tenta fazer uma requisição simples p verificar conexão
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        setIsOffline(!response.ok);
      } catch (error) {
        setIsOffline(true);
      }
    };

    // verifica conexão inicial
    checkConnection();

    // verifica a cada 15 segundos)
    timeoutRef.current = setInterval(checkConnection, 15000);

    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, []);

  return {
    isOffline,
    isOnline: !isOffline
  };
};

export default useNetwork;